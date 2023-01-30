// Homebridge plugin for Home Connect home appliances
// Copyright © 2021-2023 Alexander Thoukydides

let Service, Characteristic;

// Add mode switches to an accessory
module.exports = {
    name: 'HasModes',

    // Initialise the mixin
    async init(modes, prefix = 'mode') {
        // Shortcuts to useful HAP objects
        Service = this.homebridge.hap.Service;
        Characteristic = this.homebridge.hap.Characteristic;

        // Check which settings are supported to add appropriate services
        let allSettings = await this.getCached('settings',
                                               () => this.device.getSettings());

        // Add services for each mode setting
        for (let key of allSettings.map(s => s.key)) {
            let modeName = modes[key];
            if (modeName) {
                // Add a switch service for this mode
                this.log('Supports ' + modeName);
                this.addModeSwitch(modeName, key, prefix);
            }
        }
    },

    // Add a switch for a mode setting
    addModeSwitch(name, key, prefix) {
        // Add a switch service for this mode setting
        let subtype = prefix + ' ' + name;
        let service =
            this.accessory.getServiceByUUIDAndSubType(Service.Switch, subtype)
            || this.accessory.addService(Service.Switch, name, subtype);
        service.addOptionalCharacteristic(Characteristic.ConfiguredName);
        service.setCharacteristic(Characteristic.ConfiguredName, name);

        // Change the setting
        service.getCharacteristic(Characteristic.On)
            .on('set', this.callbackify(async value => {
                this.log('SET ' + name + ' ' + (value ? 'on' : 'off'));
                await this.device.setSetting(key, value);
            }));

        // Update the status
        this.device.on(key, item => {
            this.log(name + ' ' + (item.value ? 'on' : 'off'));
            service.updateCharacteristic(Characteristic.On, item.value);
        });
    }
};
