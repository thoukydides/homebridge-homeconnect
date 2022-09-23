// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2021 Alexander Thoukydides

'use strict';

let Service, Characteristic;

const CUSTOM_COLOR = 'BSH.Common.EnumType.AmbientLightColor.CustomColor';

// HomeKit colour temperature range
const MIREK_WARM = 400; //  2,500K ->   0% (incandescent lamp)
const MIREK_COLD =  50; // 20,000K -> 100% (clear blue sky)

// Add a light to an accessory
module.exports = {
    name: 'HasLight',

    // Initialise the mixin
    async init() {
        // Shortcuts to useful HAP objects
        Service = this.homebridge.hap.Service;
        Characteristic = this.homebridge.hap.Characteristic;

        // Add a functional light
        let functional = await this.addLightIfSupported('Functional Light', {
            on:         'Cooking.Common.Setting.Lighting',
            brightness: 'Cooking.Common.Setting.LightingBrightness',
            colourtemp: 'Cooking.Hood.Setting.ColorTemperaturePercent'
        });

        // Add an ambient light
        let ambient = await this.addLightIfSupported('Ambient Light', {
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
        // Check which settings are supported
        let allSettings = await this.getCached('settings',
                                               () => this.device.getSettings());

        // A light must at least support being switched on and off
        if (!allSettings.some(setting => setting.key == keys.on))
            return this.log('Does not support ' + type);

        // Retrieve any previously cached light details
        let settings = await this.cache.get(type) || {};

        // Attempt to update the details of this light
        await this.device.waitConnected(true);
        await this.refreshLight(type, keys, settings, !settings.on);

        // Add the light
        return this.addLight(type, settings);
    },

    // Refresh details of a light
    async refreshLight(type, keys, settings, active = false) {
        // Some settings may not be readable in certain states
        let initialSettings = [];
        try {
            // Switch the light on, if necessary, to read its supported settings
            settings.on = { key: keys.on };
            let on = this.device.getItem(keys.on);
            if (!on) {
                if (!active) return;
                this.warn('Temporarily switching ' + type
                          + ' on to read its settings');
                await this.device.setSetting(keys.on, true);
                initialSettings.unshift({ key: keys.on, value: on });
            }

            // Special handling for lights that support colour temperature
            if (keys.colourtemp) {
                settings.colourtemp = await this.getCached(type + ' colourtemp',
                                 () => this.device.getSetting(keys.colourtemp));
            }

            // Special handling for lights that support colour
            if (keys.colour) {
                settings.colour = await this.getCached(type + ' colour',
                                     () => this.device.getSetting(keys.colour));
            }
            if (settings.colour) {
                // Check whether the light supports custom colours
                let colour = settings.colour.value;
                let colours = settings.colour.constraints.allowedvalues;
                if (colours.includes(CUSTOM_COLOR))
                    settings.custom = { key: keys.custom };

                // Check whether the light supports non-custom colours
                let nonCustomColour = colours.find(c => c != CUSTOM_COLOR);
                if (nonCustomColour) {
                    // Select a non-custom colour, if necessary, to read range
                    if (colour == CUSTOM_COLOR) {
                        if (!active) return;
                        this.warn('Temporarily setting ' + type + ' to a'
                                  + ' non-custom colour to read its settings');
                        await this.device.setSetting(keys.colour,
                                                     nonCustomColour);
                        initialSettings.unshift({ key: keys.colour,
                                                  value: colour });
                    }
                }
            }

            // Read the supported brightness range
            settings.brightness = await this.getCached(type + ' brightness',
                                 () => this.device.getSetting(keys.brightness));

            // Update the cache
            await this.cache.set(type, settings);
        } finally {
            // Best-effort attempt to restore the original light settings
            for (let setting of initialSettings) {
                try {
                    await this.device.setSetting(setting.key, setting.value);
                } catch (err) {}
            }
        }
    },

    // Add a light
    addLight(type, settings) {
        // Add a Lightbulb service
        let service =
            this.accessory.getServiceByUUIDAndSubType(Service.Lightbulb, type)
            || this.accessory.addService(Service.Lightbulb, type, type);

        // Control the light
        let setLightProxy = async options => {
            if ('on' in options) {
                await this.setLightOn(type, settings, options.on);
                if (!options.on) return;
            }
            if ('mirek' in options) {
                await this.setLightColourTemp(type, settings, options.mirek);
            }
            const custom_color_selected =
                  settings.colour
                  && this.device.getItem(settings.colour.key) === CUSTOM_COLOR;
            if ('hue' in options || 'saturation' in options
                || ('brightness' in options && custom_color_selected)) {
                await this.setLightColour(type, settings, service,
                                          options.hue, options.saturation,
                                          options.brightness);
            }
            else if ('brightness' in options) {
                await this.setLightBrightness(type, settings,
                                              options.brightness);
            }
        };

        // Add the appropriate characteristics
        if (settings.on)
            this.addLightOn(type, settings, service, setLightProxy);
        if (settings.brightness || settings.colour)
            this.addLightBrightness(type, settings, service, setLightProxy);
        if (settings.colourtemp)
            this.addLightColourTemp(type, settings, service, setLightProxy);
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
                maxValue: 'max' in constraints ? constraints.max : 100 })
            .updateValue(Math.round(settings.brightness.value));

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

    // Add colour temperature control of a light
    addLightColourTemp(type, settings, service, setLightProxy) {
        // Convert from Home Connect's percentage to reciprocal megakelvin
        this.device.on(settings.colourtemp.key, item => {
            let percent = Math.round(item.value);
            let mirek = Math.round(MIREK_WARM + (percent / 100.0)
                                                * (MIREK_COLD - MIREK_WARM));
            this.log('Light ' + type + ' ' + mirek + 'MK^-1 ('
                     + percent + '% cold');
            service.updateCharacteristic(Characteristic.ColorTemperature,
                                         mirek);
        });

        // Convert from reciprocal megakelvin to Home Connect's percentage
        service.getCharacteristic(Characteristic.ColorTemperature)
            .on('set', this.callbackify(
                value => this.serialise(setLightProxy, { mirek: value })));
    },

    // Set the colour temperature of a light
    async setLightColourTemp(type, settings, mirek) {
        // Convert from reciprocal megakelvin to percent cold
        let percent = 100.0 * (mirek - MIREK_WARM) / (MIREK_COLD - MIREK_WARM)
        this.log('SET Light ' + type + ' ' + percent + '% cold ('
                 + mirek + 'MK^-1');
        await this.device.setSetting(settings.colourtemp.key, percent);
    },

    // Add colour control of a light
    addLightColour(type, settings, service, setLightProxy) {
        // Convert from Home Connect's RGB to HomeKit's hue and saturation
        // (ignore changes to 'BSH.Common.Setting.AmbientLightColor')
        this.device.on(settings.custom.key, item => {
            let { hue, saturation, value } = this.fromRGB(item.value);
            this.log('Light ' + type + ' ' + item.value
                     + ' (hue=' + hue + ', saturation=' + saturation
                     + '%, value=' + value + '%)');
            service.updateCharacteristic(Characteristic.Hue, hue);
            service.updateCharacteristic(Characteristic.Saturation, saturation);
            service.updateCharacteristic(Characteristic.Brightness, value);
        });

        // Convert from HomeKit's hue and saturation to Home Connect's RGB
        // (value is handled separately, as brightness)
        service.getCharacteristic(Characteristic.Hue)
            .on('set', this.callbackify(
                value => this.serialise(setLightProxy, { hue: value })));
        service.getCharacteristic(Characteristic.Saturation)
            .on('set', this.callbackify(
                value => this.serialise(setLightProxy, { saturation: value })));
    },

    // Set the colour of a light
    async setLightColour(type, settings, service, hue, saturation, value) {
        // Read any missing parameters from the characteristics
        if (hue === undefined)
            hue = service.getCharacteristic(Characteristic.Hue).value;
        if (saturation === undefined)
            saturation = service.getCharacteristic(Characteristic.Saturation).value;
        if (value === undefined)
            value = service.getCharacteristic(Characteristic.Brightness).value;

        // Set the colour
        let rgb = this.toRGB(hue, saturation, value);
        this.log('SET Light ' + type + ' ' + rgb + ' (hue=' + hue
                 + ', saturation=' + saturation + '%, value=' + value + '%)');
        await this.device.setSetting(settings.colour.key, CUSTOM_COLOR);
        await this.device.setSetting(settings.custom.key, rgb);
    },

    // Convert a colour from from hue/saturation to RGB
    toRGB(hue, saturation, value) {
        let maxRgb = value * 255 / 100;
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
            sector = 0; // (dummy value for white, i.e. R=G=B=V)
        } else if (maxRgb == rgb[0]) { // 0-60° or 300-360°
            sector = (rgb[1] - rgb[2]) / chroma;
            if (sector < 0) sector += 6;
        } else if (maxRgb == rgb[1]) { // 60-180°
            sector = (rgb[2] - rgb[0]) / chroma + 2;
        } else { // (maxRgb == rgb[2])    180-300°
            sector = (rgb[0] - rgb[1]) / chroma + 4;
        }

        // Scale and return the hue, saturation, and vaue
        return {
            hue:        Math.round(sector * 60),
            saturation: maxRgb ? Math.round((chroma / maxRgb) * 100) : 0,
            value:      Math.round(maxRgb * 100 / 255)
        };
    }
}
