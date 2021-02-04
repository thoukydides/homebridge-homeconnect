// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2021 Alexander Thoukydides

'use strict';

let Service, Characteristic;

// Add a power switch to an accessory
module.exports = {
    name: 'HasPower',

    // Initialise the mixin
    async init() {
        // Shortcuts to useful HAP objects
        Service = this.homebridge.hap.Service;
        Characteristic = this.homebridge.hap.Characteristic;

        // Add a characteristic for the power state, initially read-only
        this.powerService.getCharacteristic(Characteristic.On)
            .setProps({perms: [Characteristic.Perms.READ,
                               Characteristic.Perms.NOTIFY]});

        // Mark this as the primary service (after linked to HAP Accessory)
        setTimeout(() => {
            this.accessory._associatedHAPAccessory
                .setPrimaryService(this.powerService);
        }, 0);

        // Update the state
        this.device.on('BSH.Common.Setting.PowerState', item => {
            let isOn = item.value == 'BSH.Common.EnumType.PowerState.On';
            this.log(isOn ? 'On' : 'Off');
            this.powerService.updateCharacteristic(Characteristic.On, isOn);
        });
        
        // When disconnected indicate the power as off
        this.device.on('connected', item => {
            if (!item.value) {
                this.powerService.updateCharacteristic(Characteristic.On,
                                                       false);
            }
        });

        // Check whether the appliance supports off or standby
        let setting = await this.getCached('power',
                 () => this.device.getSetting('BSH.Common.Setting.PowerState'));
        let values = setting.constraints.allowedvalues;

        // Add the ability to switch off or to standby if supported
        // (with workaround for Oven appliances reporting unsupported values)
        if (values.includes('BSH.Common.EnumType.PowerState.Off')
            && this.device.type != 'Oven') {
            this.log('Can be switched off');
            this.addPowerOff('BSH.Common.EnumType.PowerState.Off');
        } else if (values.includes('BSH.Common.EnumType.PowerState.Standby')) {
            this.log('Can be placed in standby');
            this.addPowerOff('BSH.Common.EnumType.PowerState.Standby');
        } else {
            this.log('Cannot be switched off');
        }
    },

    // Add the ability to switch the power off (or to standby)
    addPowerOff(offValue) {
        // Make the power state characteristic writable
        this.powerService.getCharacteristic(Characteristic.On)
            .setProps({perms: [Characteristic.Perms.READ,
                               Characteristic.Perms.WRITE,
                               Characteristic.Perms.NOTIFY]})
            .on('set', this.callbackify(async value => {
                let powerState = value ? 'BSH.Common.EnumType.PowerState.On'
                                       : offValue;
                this.log('SET ' + (value ? 'On' : 'Off'));
                await this.device.setSetting('BSH.Common.Setting.PowerState',
                                             powerState);
            }));
    }
}
