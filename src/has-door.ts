// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2023 Alexander Thoukydides

import { Perms, Service } from 'homebridge';

import { ApplianceBase } from './appliance-generic';
import { Constructor, assertIsNumber } from './utils';
import { DoorState } from './api-value-types';
import { CommandKey } from './api-value';

// Add an appliance door to an accessory
export function HasDoor<TBase extends Constructor<ApplianceBase>>(Base: TBase, hasLock: boolean = false) {
    return class HasDoor extends Base {

        // Accessory services
        readonly doorService!: Service;

        // Mixin constructor
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        constructor(...args: any[]) {
            super(...args);

            // Check whether the door should be suported
            if (!this.hasOptionalFeature('Door', 'Door')) return;

            // Create a Door service for the appliance door
            this.doorService = this.makeService(this.Service.Door, 'Door');

            // The door starts stationary
            const { STOPPED } = this.Characteristic.PositionState;
            this.doorService.setCharacteristic(this.Characteristic.PositionState, STOPPED);

            // Add the lock current state characteristic
            const { UNSECURED, SECURED } = this.Characteristic.LockCurrentState;
            if (hasLock) {
                this.doorService.addOptionalCharacteristic(this.Characteristic.LockCurrentState);
                this.doorService.getCharacteristic(this.Characteristic.LockCurrentState)
                    .setProps({ validValues: [UNSECURED, SECURED] });
            }

            // Update the door status
            this.device.on('BSH.Common.Status.DoorState', doorState => {
                const isOpen = doorState === DoorState.Open;
                const isLocked = doorState === DoorState.Locked;
                this.log.info(`Door ${isOpen ? 'open' : 'closed'}${isLocked ? ' and locked' : ''}`);
                const targetPosition = this.doorService.getCharacteristic(this.Characteristic.TargetPosition).value;
                assertIsNumber(targetPosition);
                if (isOpen && 0 < targetPosition) {
                    // Assume door has reached its target position
                    this.doorService
                        .updateCharacteristic(this.Characteristic.CurrentPosition, targetPosition);
                } else {
                    // Door has been closed, or opened manually
                    this.doorService
                        .updateCharacteristic(this.Characteristic.CurrentPosition, isOpen ? 100 : 0)
                        .updateCharacteristic(this.Characteristic.TargetPosition,  isOpen ? 100 : 0);
                }
                this.doorService.setCharacteristic(this.Characteristic.PositionState, STOPPED);

                // If the door can be locked then update its status
                if (hasLock) {
                    this.doorService.updateCharacteristic(this.Characteristic.LockCurrentState,
                                                          isLocked ? SECURED : UNSECURED);
                }
            });

            // Continue initialisation asynchronously
            if (this.device.hasScope('Control')) {
                this.asyncInitialise('Door', this.initHasDoor());
            }
        }

        // Asynchronous initialisation
        async initHasDoor(): Promise<void> {
            // Check whether the appliance supports door control commands
            const commands = await this.getCached('commands', () => this.device.getCommands());
            const supports = (key: CommandKey): boolean => commands.some(command => command.key === key);
            const supportsOpen   = supports('BSH.Common.Command.OpenDoor');
            const supportsPartly = supports('BSH.Common.Command.PartlyOpenDoor');
            if (supportsOpen || supportsPartly) {
                const positions = [];
                if (supportsOpen)   positions.push('fully');
                if (supportsPartly) positions.push('partly');
                this.log.info(`Can open door ${positions.join(' and ')}`);
            }

            // Add open and/or partly open door support as appropriate
            this.addDoorControl(supportsOpen, supportsPartly);
        }

        // Add the ability to open or partially open the door
        addDoorControl(supportsOpen: boolean, supportsPartly: boolean): void {
            // Set the door position step size appropriately
            const minStep = supportsPartly ? 50 : 100;
            this.doorService.getCharacteristic(this.Characteristic.CurrentPosition).setProps({ minStep: minStep });
            this.doorService.getCharacteristic(this.Characteristic.TargetPosition) .setProps({ minStep: minStep });

            // Allow the target position to be controlled, if supported
            if (supportsOpen || supportsPartly) {
                // Door can be opened and/or partly opened
                this.doorService.getCharacteristic(this.Characteristic.TargetPosition)
                    .setProps({ perms: [Perms.PAIRED_READ, Perms.PAIRED_WRITE, Perms.NOTIFY] })
                    .onSet(this.onSetNumber(async value => {
                        if (0 < value) {
                            const fullyOpen = !supportsPartly || 50 < value;
                            this.log.info(`${fullyOpen ? '' : 'PARTLY '}OPEN Door`);
                            this.doorService.setCharacteristic(this.Characteristic.PositionState,
                                                               this.Characteristic.PositionState.INCREASING);
                            await this.device.openDoor(fullyOpen);
                        }
                    }));
            } else {
                // Door cannot be opened remotely
                this.doorService.getCharacteristic(this.Characteristic.TargetPosition)
                    .setProps({ perms: [Perms.PAIRED_READ, Perms.NOTIFY] });
            }
        }
    };
}

// Add a lockable appliance door to an accessory
export const HasLockableDoor = <TBase extends Constructor<ApplianceBase>>(Base: TBase) => HasDoor(Base, true);