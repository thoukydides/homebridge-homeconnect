// Homebridge plugin for Home Connect home appliances
// Copyright © 2019 Alexander Thoukydides

'use strict';

// Add local and remote control state to an accessory
module.exports = {
    init(removeStatusActive = true) {
        // Shortcuts to useful HAP objects
        const Characteristic = this.homebridge.hap.Characteristic;

        // Use ProgramMode characteristic to indicate local and remote control
        const { NO_PROGRAM_SCHEDULED, PROGRAM_SCHEDULED, PROGRAM_SCHEDULED_MANUAL_MODE_ } = Characteristic.ProgramMode;
        this.haService.getCharacteristic(Characteristic.ProgramMode);

        // Update the status
        let state = {};
        let update = item => {
            state[item.key] = item.value;
            let programMode;
            if (state['BSH.Common.Status.LocalControlActive']) {
                // Local control takes priority (reverts after a few seconds)
                this.log('Being controlled locally');
                programMode = PROGRAM_SCHEDULED_MANUAL_MODE_;
            } else if (state['BSH.Common.Status.RemoteControlStartAllowed']
                       === false
                       || state['BSH.Common.Status.RemoteControlActive']
                       === false) {
                this.log('Remote control/start not allowed');
                programMode = NO_PROGRAM_SCHEDULED;
            } else {
                this.log('Remote control/start allowed');
                programMode = PROGRAM_SCHEDULED;
            }
            this.haService.updateCharacteristic(Characteristic.ProgramMode,
                                                programMode);
        };
        this.device.on('BSH.Common.Status.RemoteControlActive',       update);
        this.device.on('BSH.Common.Status.RemoteControlStartAllowed', update);
        this.device.on('BSH.Common.Status.LocalControlActive',        update);
    }
}
