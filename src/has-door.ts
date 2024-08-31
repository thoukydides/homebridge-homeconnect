// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2023 Alexander Thoukydides

import { Perms, Service } from 'homebridge';

import { ApplianceBase } from './appliance-generic';
import { Constructor, assertIsNumber } from './utils';
import { DoorState, DoorStateRefrigeration } from './api-value-types';
import { CommandKey, StatusKey, StatusValue } from './api-value';

// Status keys used for doors
export type DoorStatusKey<Key extends StatusKey = StatusKey> =
    Key extends Key ? (StatusValue<Key> extends (DoorState | DoorStateRefrigeration) ? Key : never) : never;

// Add an appliance door to an accessory
export function HasDoor<TBase extends Constructor<ApplianceBase>>(Base: TBase, hasLock = false) {
    return class HasDoor extends Base {

        // Accessory services
        readonly doorService: Partial<Record<DoorStatusKey, Service>> = {};

        // Door settings that may be supported by the appliance
        readonly doors: Partial<Record<DoorStatusKey, string>> = {};

        // Mixin constructor
        constructor(...args: any[]) {
            super(...args);

            // Continue initialisation asynchronously
            this.asyncInitialise('Door', this.initHasDoor());
        }

        // Asynchronous initialisation
        async initHasDoor(): Promise<void> {
            // Check whether a single appliance door should be supported
            if (this.hasOptionalFeature('Door', 'Door', 'Doors')) {
                // Add the door
                const service = this.addDoor('BSH.Common.Status.DoorState', 'Door');
                this.doorService['BSH.Common.Status.DoorState'] = service;

                // Check whether the appliance supports door control commands
                if (this.device.hasScope('Control')) {
                    const commands = await this.getCached('commands', () => this.device.getCommands());
                    const supports = (key: CommandKey) => commands.some(command => command.key === key);
                    const supportsOpen   = supports('BSH.Common.Command.OpenDoor');
                    const supportsPartly = supports('BSH.Common.Command.PartlyOpenDoor');
                    if (supportsOpen || supportsPartly) {
                        const positions = [];
                        if (supportsOpen)   positions.push('fully');
                        if (supportsPartly) positions.push('partly');
                        this.log.info(`Can open door ${positions.join(' and ')}`);
                    }

                    // Add open and/or partly open door support as appropriate
                    this.addDoorControl(service, supportsOpen, supportsPartly);
                }
            }

            // Add services for additional doors that are supported and enabled
            await this.device.waitConnected(true);
            for (const [key, name] of Object.entries(this.doors) as [DoorStatusKey, string][]) {
                if (this.device.getItem(key) !== undefined
                    && this.hasOptionalFeature('Door', name, 'Doors', false)) {
                    this.doorService[key] = this.addDoor(key, name, `door ${name}`);
                }
            }
        }

        // Define an additional door that may be supported by the appliance
        hasDoor(statusKey: DoorStatusKey, name: string): void {
            this.doors[statusKey] = name;
        }

        // Add a door
        addDoor(key: DoorStatusKey, name: string, subtype?: string): Service {
            // Create a Door service for this door
            const service = this.makeService(this.Service.Door, name, subtype);

            // The door starts stationary
            const { STOPPED } = this.Characteristic.PositionState;
            service.setCharacteristic(this.Characteristic.PositionState, STOPPED);

            // Add the lock current state characteristic
            const { UNSECURED, SECURED } = this.Characteristic.LockCurrentState;
            if (hasLock) {
                service.addOptionalCharacteristic(this.Characteristic.LockCurrentState);
                service.getCharacteristic(this.Characteristic.LockCurrentState)
                    .setProps({ validValues: [UNSECURED, SECURED] });
            }

            // Update the door status
            this.device.on(key, doorState => {
                const isOpen = doorState === DoorState.Open || doorState === DoorStateRefrigeration.Open;
                const isLocked = doorState === DoorState.Locked;
                this.log.info(`${name} ${isOpen ? 'open' : 'closed'}${isLocked ? ' and locked' : ''}`);
                const targetPosition = service.getCharacteristic(this.Characteristic.TargetPosition).value;
                assertIsNumber(targetPosition);
                if (isOpen && 0 < targetPosition) {
                    // Assume door has reached its target position
                    service.updateCharacteristic(this.Characteristic.CurrentPosition, targetPosition);
                } else {
                    // Door has been closed, or opened manually
                    service.updateCharacteristic(this.Characteristic.CurrentPosition, isOpen ? 100 : 0);
                    service.updateCharacteristic(this.Characteristic.TargetPosition,  isOpen ? 100 : 0);
                }
                service.setCharacteristic(this.Characteristic.PositionState, STOPPED);

                // If the door can be locked then update its status
                if (hasLock) {
                    service.updateCharacteristic(this.Characteristic.LockCurrentState,
                                                 isLocked ? SECURED : UNSECURED);
                }
            });
            return service;
        }

        // Add the ability to open or partially open the door
        addDoorControl(service: Service, supportsOpen: boolean, supportsPartly: boolean): void {
            // Set the door position step size appropriately
            const minStep = supportsPartly ? 50 : 100;
            service.getCharacteristic(this.Characteristic.CurrentPosition).setProps({ minStep: minStep });
            service.getCharacteristic(this.Characteristic.TargetPosition) .setProps({ minStep: minStep });

            // Allow the target position to be controlled, if supported
            if (supportsOpen || supportsPartly) {
                // Door can be opened and/or partly opened
                service.getCharacteristic(this.Characteristic.TargetPosition)
                    .setProps({ perms: [Perms.PAIRED_READ, Perms.PAIRED_WRITE, Perms.NOTIFY] })
                    .onSet(this.onSetNumber(async value => {
                        if (0 < value) {
                            const fullyOpen = !supportsPartly || 50 < value;
                            this.log.info(`${fullyOpen ? '' : 'PARTLY '}OPEN Door`);
                            service.setCharacteristic(this.Characteristic.PositionState,
                                                      this.Characteristic.PositionState.INCREASING);
                            await this.device.openDoor(fullyOpen);
                        }
                    }));
            } else {
                // Door cannot be opened remotely
                service.getCharacteristic(this.Characteristic.TargetPosition)
                    .setProps({ perms: [Perms.PAIRED_READ, Perms.NOTIFY] });
            }
        }
    };
}

// Add a lockable appliance door to an accessory
export const HasLockableDoor = <TBase extends Constructor<ApplianceBase>>(Base: TBase) => HasDoor(Base, true);