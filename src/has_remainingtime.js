// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2023 Alexander Thoukydides

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
            .setProps({ maxValue: 2 * (24 * 60 - 1) * 60 });

        // Update the status
        let state, timeDelay = 0, timeRemaining = 0, scheduled;
        let update = () => {
            clearTimeout(scheduled);
            scheduled = setTimeout(() => {
                // Determine the remaining duration
                let remainingDuration = 0, description;
                if (state === 'delayed start') {
                    remainingDuration = timeDelay + timeRemaining;
                    description = 'Program will start in '
                        + this.prettySeconds(timeDelay) + ' (total '
                        + this.prettySeconds(remainingDuration) + ' remaining)';
                } else if (state === 'active') {
                    remainingDuration = timeRemaining;
                    description = 'Program has '
                        + this.prettySeconds(remainingDuration) + ' remaining';
                } else {
                    description = 'No program running';
                }

                // If it has changed then update the characteristic
                let prevRemainingDuration = this.activeService
                    .getCharacteristic(Characteristic.RemainingDuration).value;
                if (remainingDuration !== prevRemainingDuration) {
                    this.log(description);
                    this.activeService.updateCharacteristic(
                        Characteristic.RemainingDuration, remainingDuration);
                }
            });
        };
        this.device.on('BSH.Common.Option.StartInRelative', seconds => {
            timeDelay = seconds;
            update();
        });
        this.device.on('BSH.Common.Option.RemainingProgramTime', seconds => {
            timeRemaining = seconds;
            update();
        });
        this.device.on('BSH.Common.Event.ProgramFinished', () => {
            state = '';
            update();
        });
        this.device.on('BSH.Common.Event.ProgramAborted', () => {
            state = '';
            update();
        });
        this.device.on('BSH.Common.Status.OperationState', () => {
            state = this.device.isOperationState('DelayedStart') ? 'delayed start'
                    : (!this.device.isOperationState('Inactive', 'Ready', 'Finished')
                       ? 'active' : '');
            update();
        });
    }
};
