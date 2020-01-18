// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2020 Alexander Thoukydides

'use strict';

let Service, Characteristic;

// Setpoint temperature settings supported by different appliance types
const COOLING_TEMPERATURES = {
    // FridgeFreezer / Refrigerator
    'Refrigeration.FridgeFreezer.Setting.SetpointTemperatureRefrigerator':
        'Fridge',
    'Refrigeration.Common.Setting.BottleCooler.SetpointTemperature':
        'Bottle Cooler',
    'Refrigeration.Common.Setting.ChillerCommon.SetpointTemperature':
        'Chiller',
    'Refrigeration.Common.Setting.ChillerLeft.SetpointTemperature':
        'Chiller Left',
    'Refrigeration.Common.Setting.ChillerRight.SetpointTemperature':
        'Chiller Right',
    // Freezer / FridgeFreezer
    'Refrigeration.FridgeFreezer.Setting.SetpointTemperatureFreezer':
        'Freezer',
    // WineCooler (top/middle/bottom)
    'Refrigeration.Common.Setting.WineCompartment.SetpointTemperature':
        'Compartment 1',
    'Refrigeration.Common.Setting.WineCompartment2.SetpointTemperature':
        'Compartment 2',
    'Refrigeration.Common.Setting.WineCompartment3.SetpointTemperature':
        'Compartment 3'
};

// Modes supported by cooling appliances
const COOLING_MODES = {
    // Freezer / FridgeFreezer
    'Refrigeration.FridgeFreezer.Setting.SuperModeFreezer':
        'Freezer Super',
    // FridgeFreezer / Refrigerator
    'Refrigeration.FridgeFreezer.Setting.SuperModeRefrigerator':
        'Refrigerator Super',
    'Refrigeration.Common.Setting.VacationMode':
        'Vacation',
    'Refrigeration.Common.Setting.FreshMode':
        'Fresh',
    // Freezer / FridgeFreezer / Refrigerator
    'Refrigeration.Common.Setting.EcoMode':
        'Eco',
    // Freezer / FridgeFreezer / Refrigerator / WineCooler
    'Refrigeration.Common.Setting.SabbathMode':
        'Sabbath'
};

// Add a power switch to an accessory
module.exports = {
    name: 'HasCooling',

    // Initialise the mixin
    async init(applianceTypes) {
        // Shortcuts to useful HAP objects
        Service = this.homebridge.hap.Service;
        Characteristic = this.homebridge.hap.Characteristic;

        // Check which settings are supported to add appropriate services
        let allSettings = await this.getCached('settings',
                                               () => this.device.getSettings());

        // Add services for each cooling setting
        for (let key of allSettings.map(s => s.key)) {
            // Check whether this is a temperature setting
            let temperatureName = COOLING_TEMPERATURES[key];
            if (temperatureName) {
                // Read the allowed range and units for the temperature setting
                let setting = await this.getCached('setting ' + temperatureName,
                                             () => this.device.getSetting(key));
                if (!/^°[CF]$/.test(setting.unit))
                    this.error('Unsupported temperature unit: ' + setting.unit);
                let isF = setting.unit == '°F';
                let {min, max} = setting.constraints;

                // Just log the details for now
                this.log('Supports ' + temperatureName + ' temperature ['
                         + min + ' .. ' + max + (isF ? '°F' : '°C') + ']');
            }

            // Check whether this is a cooling mode
            let modeName = COOLING_MODES[key];
            if (modeName) {
                // Add a switch service for this mode
                this.log('Supports ' + modeName + ' mode');
                this.addCoolingModeSwitch(modeName + ' Mode', key);
            }
        }
    },

    // Add a switch for a mode setting
    addCoolingModeSwitch(name, key) {
        // Add a switch service for this mode setting
        let subtype = 'cooling ' + name;
        let service =
            this.accessory.getServiceByUUIDAndSubType(Service.Switch, subtype)
            || this.accessory.addService(Service.Switch, name, subtype);

        // Change the setting
        service.getCharacteristic(Characteristic.On)
            .on('set', this.callbackify(async value => {
                this.log('SET Cooling ' + name + ' ' + (value ? 'on' : 'off'));
                await this.device.setSetting(key, value);
            }));

        // Update the status
        this.device.on(key, item => {
            this.log('Cooling ' + name + ' ' + (item.value ? 'on' : 'off'));
            service.updateCharacteristic(Characteristic.On, item.value);
        });
    },

    // HomeKit only uses Celsius, but Home Connect can use Celsius or Fahrenheit
    toFahrenheit(c)   { return c * 9 / 5 + 32; },
    fromFahrenheit(f) { return (f - 32) * 5 / 9; }
}
