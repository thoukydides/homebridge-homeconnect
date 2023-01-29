// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2023 Alexander Thoukydides

'use strict';

// Add local and remote control state to an accessory
module.exports = {
    name: 'HasRemoteControl',

    // Initialise the mixin
    init() {
        // Shortcuts to useful HAP objects
        const Characteristic = this.homebridge.hap.Characteristic;

        // Use ProgramMode characteristic to indicate local and remote control
        const { NO_PROGRAM_SCHEDULED, PROGRAM_SCHEDULED, PROGRAM_SCHEDULED_MANUAL_MODE_ } = Characteristic.ProgramMode;
        this.powerService
            .addOptionalCharacteristic(Characteristic.ProgramMode);
        this.powerService.getCharacteristic(Characteristic.ProgramMode);

        // Update the status
        const stateMapping = {
            remoteControl: {
                key:    'BSH.Common.Status.RemoteControlActive',
                prefix: 'remote control',
                values: { true: 'activated', false: 'not activated' }
            },
            remoteStart: {
                key:    'BSH.Common.Status.RemoteControlStartAllowed',
                prefix: 'remote start',
                values: { true: 'allowed', false: 'disallowed' }
            },
            localControl: {
                key:    'BSH.Common.Status.LocalControlActive',
                values: { true: 'being operated locally' }
            }
        };
        let updateDeferred = () => {
            // Read the most recent state and generate a description
            let state = {};
            let detailBits = [];
            for (let key of Object.keys(stateMapping)) {
                let mapping = stateMapping[key];
                state[key] = this.device.getItem(mapping.key);
                let detail = mapping.values[state[key]];
                if (detail) {
                    if (mapping.prefix) detail = mapping.prefix + ' ' + detail
                    detailBits.push(detail);
                }
            }
            let detail = ' (' + detailBits.join(', ') + ')';

            // Map the state to the most appropriate Program Mode characteristic
            let programMode;
            if (state.localControl) {
                // Local control takes priority (reverts after a few seconds)
                this.log('Manual mode' + detail);
                programMode = PROGRAM_SCHEDULED_MANUAL_MODE_;
            } else if (state.remoteControl === false
                       || state.remoteStart === false) {
                this.log('Remote operation NOT enabled' + detail);
                programMode = NO_PROGRAM_SCHEDULED;
            } else {
                this.log('Remote operation enabled' + detail);
                programMode = PROGRAM_SCHEDULED;
            }
            this.powerService.updateCharacteristic(Characteristic.ProgramMode,
                                                   programMode);
        }
        let scheduled;
        for (let mapping of Object.values(stateMapping)) {
            this.device.on(mapping.key, item => {
                // Update once after all changes have been applied
                clearTimeout(scheduled);
                scheduled = setTimeout(updateDeferred);
            });
        }
    }
}
