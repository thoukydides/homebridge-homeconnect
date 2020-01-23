// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2020 Alexander Thoukydides

'use strict';

// Add an appliance door to an accessory
module.exports = {
    name: 'HasDoor',

    // Initialise the mixin
    init(hasLock) {
        // Shortcuts to useful HAP objects
        const Characteristic = this.homebridge.hap.Characteristic;
        
        // Add the door state characteristic
        const { OPEN, CLOSED } = Characteristic.CurrentDoorState;
        this.powerService
            .addOptionalCharacteristic(Characteristic.CurrentDoorState);
        this.powerService.getCharacteristic(Characteristic.CurrentDoorState)
            .setProps({ validValues: [OPEN, CLOSED] });

        // Add the lock current state characteristic
        const { UNSECURED, SECURED } = Characteristic.LockCurrentState;
        if (hasLock) {
            this.powerService
                .addOptionalCharacteristic(Characteristic.LockCurrentState);
            this.powerService.getCharacteristic(Characteristic.LockCurrentState)
                .setProps({ validValues: [UNSECURED, SECURED] });
        }

        // Update the door status
        this.device.on('BSH.Common.Status.DoorState', item => {
            let isOpen = item.value == 'BSH.Common.EnumType.DoorState.Open';
            let isLocked = item.value == 'BSH.Common.EnumType.DoorState.Locked';
            this.log('Door ' + (isOpen ? 'open' : 'closed')
                     + (isLocked ? ' and locked' : ''));
            this.powerService.updateCharacteristic(
                Characteristic.CurrentDoorState, isOpen ? OPEN : CLOSED);
            if (hasLock) {
                this.powerService.updateCharacteristic(
                    Characteristic.LockCurrentState,
                    isLocked ? SECURED : UNSECURED);
            }
        });
    }
}
