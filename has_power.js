// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2020 Alexander Thoukydides

'use strict';

let Service, Characteristic;

// Add a power switch to an accessory
module.exports = {
    init() {
        // Shortcuts to useful HAP objects
        Service = this.homebridge.hap.Service;
        Characteristic = this.homebridge.hap.Characteristic;
        
        // The original implementation only had a single Switch without subtype
        let switchService = this.accessory.getService(Service.Switch);
        if (switchService && !switchService.subtype) {
            this.accessory.removeService(switchService);
        }

        // Add a characteristic for the power state, initially read-only
        let subtype = 'power';
        this.powerService =
            this.accessory.getServiceByUUIDAndSubType(Service.Switch, subtype)
            || this.accessory.addService(Service.Switch, this.name + ' power',
                                         subtype);
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
            this.powerService.updateCharacteristic(Characteristic.On, false);
        });
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
