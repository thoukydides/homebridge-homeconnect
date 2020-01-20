// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2020 Alexander Thoukydides

'use strict';

// Add remaining program time to an accessory
module.exports = {
    name: 'HasRemainingTime',

    // Initialise the mixin
    init() {
        // Shortcuts to useful HAP objects
        const Characteristic = this.homebridge.hap.Characteristic;
        
        // Add a progress position
        this.activeService
            .addOptionalCharacteristic(Characteristic.RemainingDuration);
        this.activeService.getCharacteristic(Characteristic.RemainingDuration)
            .setProps({ maxValue: (24 * 60 - 1) * 60 });
        
        // Update the status
        let active, scheduled;
        let update = remaining => {
            clearTimeout(scheduled);
            scheduled = setTimeout(() => {
                let remainingDuration = active && remaining ? remaining : 0;
                this.log(remainingDuration
                         ? 'Program ' + remainingDuration + ' seconds remaining'
                         : 'Program not running');
                this.activeService.updateCharacteristic(
                    Characteristic.RemainingDuration, remainingDuration);
            });
        };
        this.device.on('BSH.Common.Option.RemainingProgramTime',
                       item => update(item.value));
        this.device.on('BSH.Common.Event.ProgramFinished', item => update(0));
        this.device.on('BSH.Common.Event.ProgramAborted',  item => update(0));
        this.device.on('BSH.Common.Status.OperationState', item => {
            const inactiveStates = [
                'BSH.Common.EnumType.OperationState.Inactive',
                'BSH.Common.EnumType.OperationState.Ready',
                'BSH.Common.EnumType.OperationState.Finished'
            ];
            active = !inactiveStates.includes(item.value);
            if (!active) update(0);
        });
    }
}
