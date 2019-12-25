// Homebridge plugin for Home Connect home appliances
// Copyright © 2019 Alexander Thoukydides

'use strict';

const ApplianceGeneric = require('./appliance_generic.js');

// A Homebridge accessory for a Home Connect fridge freezer
module.exports.FridgeFreezer = class ApplianceFridgeFreezer
                             extends ApplianceGeneric {

    // Initialise an appliance
    constructor(...args) {
        super(...args);

        // Customise the appliance as a fridge freezer
        this.addDoor();
    }
}
