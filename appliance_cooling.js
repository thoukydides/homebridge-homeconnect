// Homebridge plugin for Home Connect home appliances
// Copyright © 2019 Alexander Thoukydides

'use strict';

const ApplianceGeneric = require('./appliance_generic.js');

let Service, Characteristic;

// A Homebridge accessory for a Home Connect fridge freezer
module.exports.FridgeFreezer = class ApplianceFridgeFreezer
                             extends ApplianceGeneric {

    // Initialise an appliance
    constructor(...args) {
        super(...args);

        // Shortcuts to useful HAP objects
        Service = this.homebridge.hap.Service;
        Characteristic = this.homebridge.hap.Characteristic;

        // HERE - Customise the appliance as a fridge freezer
    }
}
