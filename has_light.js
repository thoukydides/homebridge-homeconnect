// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2020 Alexander Thoukydides

'use strict';

let Service, Characteristic;

// Add a light to an accessory
module.exports = {
    init() {
        // Shortcuts to useful HAP objects
        Service = this.homebridge.hap.Service;
        Characteristic = this.homebridge.hap.Characteristic;

        // Add any lights that the appliance supports
        this.addSupportedLights();
    },

    // Add functional and/or ambient lights
    async addSupportedLights() {
        // Add a functional light
        let functional = await this.addLightIfSupported('functional light', {
            on:         'Cooking.Common.Setting.Lighting',
            brightness: 'Cooking.Common.Setting.LightingBrightness'
        });

        // Add an ambient light
        let ambient = await this.addLightIfSupported('ambient light', {
            on:         'BSH.Common.Setting.AmbientLightEnabled',
            brightness: 'BSH.Common.Setting.AmbientLightBrightness',
            colour:     'BSH.Common.Setting.AmbientLightColor',
            custom:     'BSH.Common.Setting.AmbientLightCustomColor'
        });

        // If both lights are supported then link their services
        if (functional && ambient) functional.addLinkedService(ambient);
    },

    // Check whether the appliance supports a light and then add it
    async addLightIfSupported(type, keys) {
        // Try to read each of the settings
        let settings = {};
        for (let key of Object.keys(keys)) {
            settings[key] = await this.getCached(type + ' ' + key,
                                  () => this.device.getSetting(keys[key]));

            // A light must at least support being switched on and off
            if (key == 'on' && !settings[key])
                return this.log('Does not support ' + type);
        }

        // Add the light
        return this.addLight(type, settings);
    },

    // Add a light
    addLight(type, settings) {
        // Add a Lightbulb service
        let service =
            this.accessory.getServiceByUUIDAndSubType(Service.Lightbulb, type)
            || this.accessory.addService(Service.Lightbulb,
                                         this.name + ' ' + type, type);

        // Control the light
        let setLightProxy = async options => {
            if ('on' in options) {
                await this.setLightOn(type, settings, options.on);
                if (!options.on) return;
            }
            if ('brightness' in options) {
                await this.setLightBrightness(type, settings,
                                              options.brightness);
            }
            if ('hue' in options || 'saturation' in options) {
                await this.setLightColour(type, settings, service,
                                          options.hue, options.saturation);
            }
        };

        // Add the appropriate characteristics
        this.addLightOn(type, settings, service, setLightProxy);
        if (settings.brightness)
            this.addLightBrightness(type, settings, service, setLightProxy);
        if (settings.colour)
            this.addLightColour(type, settings, service, setLightProxy);

        // Return the service
        return service;
    },

    // Add on/off control of a light
    addLightOn(type, settings, service, setLightProxy) {

        // Update whether the light is on or off
        this.device.on(settings.on.key, item => {
            this.log('Light ' + type + ' ' + (item.value ? 'on' : 'off'));
            service.updateCharacteristic(Characteristic.On, item.value);
        });
        service.getCharacteristic(Characteristic.On)
            .on('set', this.callbackify(
                value => this.serialise(setLightProxy, { on: value })));

        // Return the service
        return service;
    },

    // Set whether a light is on
    async setLightOn(type, settings, on) {
        this.log('SET Light ' + type + ' ' + (on ? 'on' : 'off'));
        await this.device.setSetting(settings.on.key, on);
    },

    // Add brightness control of a light
    addLightBrightness(type, settings, service, setLightProxy) {
        // Set the supported brightness range
        let constraints = settings.brightness.constraints || {};
        service.getCharacteristic(Characteristic.Brightness)
            .setProps({
                minValue: 'min' in constraints ? constraints.min : 10,
                maxValue: 'max' in constraints ? constraints.max : 100 });

        // Update the brightness
        this.device.on(settings.brightness.key, item => {
            let percent = Math.round(item.value);
            this.log('Light ' + type + ' ' + percent + '% brightness');
            service.updateCharacteristic(Characteristic.Brightness, percent);
        });
        service.getCharacteristic(Characteristic.Brightness)
            .on('set', this.callbackify(
                value => this.serialise(setLightProxy, { brightness: value })));
    },

    // Set the brightness of a light
    async setLightBrightness(type, settings, brightness) {
        this.log('SET Light ' + type + ' ' + brightness + '% brightness');
        await this.device.setSetting(settings.brightness.key, brightness);
    },

    // Add colour control of a light
    addLightColour(type, settings, service, setLightProxy) {
        // Convert fromHome Connect's RGB to HomeKit's hue and saturation
        // (ignore changes to 'BSH.Common.Setting.AmbientLightColor')
        this.device.on(settings.custom.key, item => {
            let { hue, saturation } = this.fromRGB(item.value);
            this.log('Light ' + type + ' ' + rgb
                     + ' (hue=' + hue + ', saturation=' + saturation + '%)');
            service.updateCharacteristic(Characteristic.Hue, hue);
            service.updateCharacteristic(Characteristic.Saturation, saturation);
        });

        // Convert from HomeKit's hue and saturation to Home Connect's RGB
        let applyColour = async (hue, saturation) => {
            this.setLightColour(type, settings, hue, saturation);
        }
        service.getCharacteristic(Characteristic.Hue)
            .on('set', this.callbackify(
                value => this.serialise(setLightProxy, { hue: value })));
        service.getCharacteristic(Characteristic.Saturation)
            .on('set', this.callbackify(
                value => this.serialise(setLightProxy, { saturation: value })));
    },

    // Set the colour of a light
    async setLightColour(type, settings, service, hue, saturation) {
        // Read any missing parameters from the characteristics
        if (hue === undefined)
            hue = service.getCharacteristic(Characteristic.Hue).value;
        if (saturation === undefined)
            saturation = service.getCharacteristic(Characteristic.Saturation).value;

        // Set the colour
        let rgb = this.toRGB(hue, saturation);
        this.log('SET Light ' + type + ' ' + rgb
                 + ' (hue=' + hue + ', saturation=' + saturation + '%)');
        const custom = 'BSH.Common.EnumType.AmbientLightColor.CustomColor';
        await this.device.setSetting(settings.colour.key, custom);
        await this.device.setSetting(settings.custom.key, rgb);
    },

    // Convert a colour from from hue/saturation to RGB
    toRGB(hue, saturation) {
        let maxRgb = 255;
        let chroma = maxRgb * saturation / 100;
        let minRgb = maxRgb - chroma;
        let deltaRgb = chroma * ((hue / 60) % 1);
        let rgb;
        if (hue < 60) {
            rgb = [maxRgb, minRgb + deltaRgb, minRgb];
        } else if (hue < 120) {
            rgb = [maxRgb - deltaRgb, maxRgb, minRgb];
        } else if (hue < 180) {
            rgb = [minRgb, maxRgb, minRgb + deltaRgb];
        } else if (hue < 240) {
            rgb = [minRgb, maxRgb - deltaRgb, maxRgb];
        } else if (hue < 300) {
            rgb = [minRgb + deltaRgb, minRgb, maxRgb];
        } else { // (h < 360)
            rgb = [maxRgb, minRgb, maxRgb - deltaRgb];
        }

        // Convert the RGB value to hex
        let [r, g, b] = rgb.map(v => Math.round(v));
        let numeric = 0x1000000 + r * 0x10000 + g * 0x100 + b;
        return '#' + Number(numeric).toString(16).substring(1);
    },

    // Convert a colour from RGB to hue/saturation
    fromRGB(rgbHex) {
        // Convert from hex to individual RGB components
        let rgb = [
            parseInt(rgbHex.substring(1, 3), 16),
            parseInt(rgbHex.substring(3, 5), 16),
            parseInt(rgbHex.substring(5, 7), 16),
        ];

        // Perform the conversion
        let minRgb = Math.min(...rgb);
        let maxRgb = Math.max(...rgb);
        let chroma = maxRgb - minRgb;
        let sector;
        if (chroma == 0) {
            sector = 0; // (dummy value for white, i.e. R=G=B=255)
        } else if (maxRgb == rgb[0]) { // 0-60° or 300-360°
            sector = (rgb[1] - rgb[2]) / chroma;
            if (sector < 0) sector += 6;
        } else if (maxRgb == rgb[1]) { // 60-180°
            sector = (rgb[2] - rgb[0]) / chroma + 2;
        } else { // (maxRgb == rgb[2])    180-300°
            sector = (rgb[0] - rgb[1]) / chroma + 4;
        }

        // Scale and return the hue/saturation
        return {
            hue:        Math.round(sector * 60),
            saturation: Math.round((chroma / maxRgb) * 100)
        };
    }
}
