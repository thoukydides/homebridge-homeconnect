// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2021 Alexander Thoukydides

'use strict';

// Add remaining program time to an accessory
module.exports = {
    name: 'HasRemainingTime',

    // Initialise the mixin
    init() {
        // Shortcuts to useful HAP objects
        const Service = this.homebridge.hap.Service;
        const Characteristic = this.homebridge.hap.Characteristic;

        this.activeService =
            this.accessory.getService(Service.Valve)
            || this.accessory.addService(Service.Valve, 'Time Remaining');

        
        // Add a progress position
        this.activeService
            .addOptionalCharacteristic(Characteristic.RemainingDuration);
        this.activeService.getCharacteristic(Characteristic.RemainingDuration)
            .setProps({ maxValue: 2 * (24 * 60 - 1) * 60 });
        this.activeService.setCharacteristic(Characteristic.ValveType, Characteristic.ValveType.WATER_FAUCET);

        // Update the status
        let state, timeDelay = 0, timeRemaining = 0, scheduled;
        let update = () => {
            clearTimeout(scheduled);
            scheduled = setTimeout(() => {
                // Determine the remaining duration
                let remainingDuration = 0, description;
                if (state == 'delayed start') {
                    this.activeService.updateCharacteristic(Characteristic.InUse, 0);
                    this.activeService.updateCharacteristic(Characteristic.Active, 1);
                    remainingDuration = timeDelay + timeRemaining;
                    description = 'Program will start in '
                        + this.prettySeconds(timeDelay) + ' (total '
                        + this.prettySeconds(remainingDuration) + ' remaining)';
                } else if (state == 'active') {
                    this.activeService.updateCharacteristic(Characteristic.InUse, 1);
                    this.activeService.updateCharacteristic(Characteristic.Active, 1);
                    remainingDuration = timeRemaining;
                    description = 'Program has '
                        + this.prettySeconds(remainingDuration) + ' remaining';
                } else {
                    this.activeService.updateCharacteristic(Characteristic.InUse, 0);
                    this.activeService.updateCharacteristic(Characteristic.Active, 0);
                    description = 'No program running';
                }

                // If it has changed then update the characteristic
                let prevRemainingDuration = this.activeService
                    .getCharacteristic(Characteristic.RemainingDuration).value;
                if (remainingDuration != prevRemainingDuration) {
                    this.log(description);
                    this.activeService.updateCharacteristic(
                        Characteristic.RemainingDuration, remainingDuration);
                }
            });
        };
        this.device.on('BSH.Common.Option.StartInRelative', item => {
            timeDelay = item.value;
            update();
        });
        this.device.on('BSH.Common.Option.RemainingProgramTime', item => {
            timeRemaining = item.value;
            update();
        });
        this.device.on('BSH.Common.Event.ProgramFinished', item => {
            state = '';
            update();
        });
        this.device.on('BSH.Common.Event.ProgramAborted',  item => {
            state = '';
            update();
        });
        this.device.on('BSH.Common.Status.OperationState', item => {
            const inactiveStates = [
                'BSH.Common.EnumType.OperationState.Inactive',
                'BSH.Common.EnumType.OperationState.Ready',
                'BSH.Common.EnumType.OperationState.Finished'
            ];
            const delayStates = [
                'BSH.Common.EnumType.OperationState.DelayedStart'
            ];
            state = delayStates.includes(item.value) ? 'delayed start'
                    : (!inactiveStates.includes(item.value) ? 'active' : '');
            update();
        });
    }
}
