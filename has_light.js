// Homebridge plugin for Home Connect home appliances
// Copyright © 2019 Alexander Thoukydides

'use strict';

let Service, Characteristic;

// Add a light to an accessory
module.exports = {
    init() {
        // Shortcuts to useful HAP objects
        Service = this.homebridge.hap.Service;
        Characteristic = this.homebridge.hap.Characteristic;
        
        // Add a functional light
        this.addLight('functional light', {
            on:         'Cooking.Common.Setting.Lighting',
            brightness: 'Cooking.Common.Setting.LightingBrightness'
        });

        // Add an ambient light
        this.addLight('ambient light', {
            on:         'Cooking.Common.Setting.AmbientLightEnabled',
            brightness: 'Cooking.Common.Setting.AmbientLightBrightness'
        });
    },

    // Add a light
    addLight(type, settings) {
        // Add a Lightbulb service
        let service =
            this.accessory.getServiceByUUIDAndSubType(Service.Lightbulb, type)
            || this.accessory.addService(Service.Lightbulb,
                                         this.name + ' ' + type, type);

        // Update whether the light is on or off
        this.device.on(settings.on, item => {
            this.log('Light ' + type + ' ' + (item.value ? 'on' : 'off'));
            service.updateCharacteristic(Characteristic.On, item.value);
        });
        service.getCharacteristic(Characteristic.On)
            .on('set', this.callbackify(async value => {
                this.log('SET Light ' + type + ' ' + (value ? 'on' : 'off'));
                await this.device.setSetting(settings.on, value);
            }));

        // Update the brightness
        // HERE - Should check that brightness is supported and its range
        this.device.on(settings.brightness, item => {
            let percent = Math.round(item.value);
            this.log('Light ' + type + ' ' + percent + '% brightness');
            service.updateCharacteristic(Characteristic.Brightness,
                                                   percent);
        });
        service.getCharacteristic(Characteristic.Brightness)
            .setProps({ minValue: 10, maxValue: 100 })
            .on('set', this.callbackify(async value => {
                this.log('SET Light ' + type + ' ' + value + '% brightness');
                await this.device.setSetting(settings.brightness, value);
            }));
    }
}
