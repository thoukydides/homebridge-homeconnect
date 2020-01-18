// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2020 Alexander Thoukydides

'use strict';

// Add an appliance door to an accessory
module.exports = {
    name: 'HasDoor',

    // Initialise the mixin
    init() {
        // Shortcuts to useful HAP objects
        const Characteristic = this.homebridge.hap.Characteristic;
        const { OPEN, CLOSED } = Characteristic.CurrentDoorState;
        
        // Add the door state characteristic
        this.powerService
            .addOptionalCharacteristic(Characteristic.CurrentDoorState);
        this.powerService.getCharacteristic(Characteristic.CurrentDoorState)
            .setProps({ validValues: [OPEN, CLOSED] });

        // Update the door status
        this.device.on('BSH.Common.Status.DoorState', item => {
            let isClosed = item.value == 'BSH.Common.EnumType.DoorState.Closed';
            this.log('Door ' + (isClosed ? 'closed' : 'open'));
            this.powerService.updateCharacteristic(
                Characteristic.CurrentDoorState, isClosed ? CLOSED : OPEN);
        });
    }
}
