// Homebridge plugin for Home Connect home appliances
// Copyright © 2019 Alexander Thoukydides

'use strict';

const ApplianceGeneric = require('./appliance_generic.js');

// A Homebridge accessory for a Home Connect fridge and/or freezer
class ApplianceFridgeFreezer extends ApplianceGeneric {

    // Initialise an appliance
    constructor(...args) {
        super(...args);

        // Customise the appliance as a fridge and/or freezer
        this.addDoor();
    }
}

module.exports.Freezer       = ApplianceFridgeFreezer;
module.exports.FridgeFreezer = ApplianceFridgeFreezer;
module.exports.Refrigerator  = ApplianceFridgeFreezer;
