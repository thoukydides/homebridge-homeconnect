// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2022 Alexander Thoukydides

'use strict';

let Service, Characteristic;

// Add an appliance door to an accessory
module.exports = {
    name: 'HasDoor',

    // Initialise the mixin
    async init(hasLock) {
        // Shortcuts to useful HAP objects
        Service = this.homebridge.hap.Service;
        Characteristic = this.homebridge.hap.Characteristic;

        // Create a Door service for the appliance door
        this.doorService = this.accessory.getService(Service.Door)
                        || this.accessory.addService(Service.Door, 'Door');
        this.doorService.setCharacteristic(Characteristic.Name, this.name);

        // The door starts stationary
        this.doorService.setCharacteristic(Characteristic.PositionState,
                                         Characteristic.PositionState.STOPPED);

        // Add the lock current state characteristic
        const { UNSECURED, SECURED } = Characteristic.LockCurrentState;
        if (hasLock) {
            this.doorService
                .addOptionalCharacteristic(Characteristic.LockCurrentState);
            this.doorService
                .getCharacteristic(Characteristic.LockCurrentState)
                .setProps({ validValues: [UNSECURED, SECURED] });
        }

        // Update the door status
        this.device.on('BSH.Common.Status.DoorState', item => {
            let isOpen = item.value == 'BSH.Common.EnumType.DoorState.Open';
            let isLocked = item.value == 'BSH.Common.EnumType.DoorState.Locked';
            this.log('Door ' + (isOpen ? 'open' : 'closed')
                     + (isLocked ? ' and locked' : ''));
            let targetPosition = this.doorService
                       .getCharacteristic(Characteristic.TargetPosition).value;
            if (isOpen && 0 < targetPosition) {
                // Assume door has reached its target position
                this.doorService
                    .updateCharacteristic(Characteristic.CurrentPosition,
                                          targetPosition);
            } else {
                // Door has been closed, or opened manually
                this.doorService
                    .updateCharacteristic(Characteristic.CurrentPosition,
                                          isOpen ? 100 : 0)
                    .updateCharacteristic(Characteristic.TargetPosition,
                                          isOpen ? 100 : 0);
            }
            this.doorService.setCharacteristic(Characteristic.PositionState,
                                         Characteristic.PositionState.STOPPED);

            // If the door can be locked then update its status
            if (hasLock) {
                this.doorService
                    .updateCharacteristic(Characteristic.LockCurrentState,
                                          isLocked ? SECURED : UNSECURED);
            }
        });

        // Add ability to open the door if supported by the appliance
        if (this.device.hasScope('Control')) {
            // Read the list of supported commands
            let commands = await this.getCached(
                'commands', () => this.device.getCommands());
            let supports = key => commands.some(command => command.key == key);
            let supportsOpen   = supports('BSH.Common.Command.OpenDoor');
            let supportsPartly = supports('BSH.Common.Command.PartlyOpenDoor');
            if (supportsOpen || supportsPartly) {
                let positions = [];
                if (supportsOpen) positions.push('fully');
                if (supportsPartly) positions.push('partly');
                this.log('Can open door ' + positions.join(' and '));
            }

            // Add open and partly open support as appropriate
            this.addDoorControl(supportsOpen, supportsPartly);
        }
    },

    // Add the ability to open or partially open the door
    addDoorControl(supportsOpen = false, supportsPartly = false) {
        // Set the door position step size appropriately
        let minStep = supportsPartly ? 50 : 100;
        this.doorService.getCharacteristic(Characteristic.CurrentPosition)
            .setProps({ minStep: minStep });
        this.doorService.getCharacteristic(Characteristic.TargetPosition)
            .setProps({ minStep: minStep });

        // Allow the target positon to be controlled, if supported
        if (supportsOpen || supportsPartly) {
            // Door can be opened and/or partly opened
            this.doorService.getCharacteristic(Characteristic.TargetPosition)
                .setProps({ perms: [Characteristic.Perms.READ,
                                    Characteristic.Perms.WRITE,
                                    Characteristic.Perms.NOTIFY] })
                .on('set', this.callbackify(async value => {
                    if (0 < value) {
                        let fullyOpen = !supportsPartly || 50 < value;
                        this.log((fullyOpen ? '' : 'PARTLY ') + 'OPEN Door');
                        this.doorService
                            .setCharacteristic(Characteristic.PositionState,
                                       Characteristic.PositionState.INCREASING);
                        await this.device.openDoor(fullyOpen);
                    }
                }));
        } else {
            // Door cannot be opened remotely
            this.doorService.getCharacteristic(Characteristic.TargetPosition)
                .setProps({ perms: [Characteristic.Perms.READ,
                                    Characteristic.Perms.NOTIFY] });
        }
    }
}
