// Homebridge plugin for Home Connect home appliances
// Copyright © 2021 Alexander Thoukydides

'use strict';

// Add an appliance door to an accessory
module.exports = {
    name: 'HasChildLock',

    // Initialise the mixin
    init(hasLock) {
        // Shortcuts to useful HAP objects
        const Characteristic = this.homebridge.hap.Characteristic;
        
        // Add the lock physical controls characteristic
        const { CONTROL_LOCK_DISABLED, CONTROL_LOCK_ENABLED } = Characteristic.LockPhysicalControls;
        this.powerService
            .addOptionalCharacteristic(Characteristic.LockPhysicalControls);
        
        // Change the child lock status
        this.powerService.getCharacteristic(Characteristic.LockPhysicalControls)
            .on('set', this.callbackify(async value => {
                let isEnabled = value == CONTROL_LOCK_ENABLED;
                this.log('SET Child lock ' + (isEnabled ? 'enabled' : 'disabled'));
                await this.device.setSetting('BSH.Common.Setting.ChildLock',
                                             isEnabled);
            }));

        // Update the child lock status
        this.device.on('BSH.Common.Setting.ChildLock', item => {
            this.log('Child lock ' + (item.value ? 'enabled' : 'disabled'));
            this.powerService.updateCharacteristic(
                Characteristic.LockPhysicalControls, 
                item.value ? CONTROL_LOCK_ENABLED : CONTROL_LOCK_DISABLED);
        });
    }
}
