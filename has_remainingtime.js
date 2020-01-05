// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2020 Alexander Thoukydides

'use strict';

// Add remaining program time to an accessory
module.exports = {
    init() {
        // Shortcuts to useful HAP objects
        const Characteristic = this.homebridge.hap.Characteristic;
        
        // Add a progress position
        this.haService.getCharacteristic(Characteristic.RemainingDuration)
            .setProps({ maxValue: (24 * 60 - 1) * 60 });
        
        // Update the status
        this.device.on('BSH.Common.Option.RemainingProgramTime', item => {
            this.log('Program ' + item.value + ' seconds remaining');
            this.haService.updateCharacteristic(
                Characteristic.RemainingDuration, item.value);
        });
        this.device.on('BSH.Common.Event.ProgramFinished', item => {
            this.log('Program finished; 0 seconds remaining');
            this.haService.updateCharacteristic(
                Characteristic.RemainingDuration, 0);
        });
        this.device.on('BSH.Common.Status.OperationState', item => {
            const inactiveStates = [
                'BSH.Common.EnumType.OperationState.Inactive',
                'BSH.Common.EnumType.OperationState.Ready',
                'BSH.Common.EnumType.OperationState.Finished'
            ];
            if (inactiveStates.includes(item.value)) {
                this.log('Program inactive; 0 seconds remaining');
                this.haService.updateCharacteristic(
                    Characteristic.RemainingDuration, 0);
            }
        });
    }
}
