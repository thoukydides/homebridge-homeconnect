// Homebridge plugin for Home Connect home appliances
// Copyright © 2019 Alexander Thoukydides

'use strict';

const ApplianceGeneric = require('./appliance_generic.js');

let Service, Characteristic;

// A Homebridge accessory for a Home Connect hob (cooktop)
module.exports = class ApplianceHob extends ApplianceGeneric {

    // Initialise an appliance
    constructor(...args) {
        super(...args);

        // Shortcuts to useful HAP objects
        Service = this.homebridge.hap.Service;
        Characteristic = this.homebridge.hap.Characteristic;

        // Customise the appliance as a hob (cooktop)
        // (Home Connect requires local power control of hobs)
        this.addEvents({
            'BSH.Common.Event.ProgramFinished':     'program finished',
            'BSH.Common.Event.AlarmClockElapsed':   'timer finished',
            'Cooking.Oven.Event.PreheatFinished':   'preheat finished'
        });
        this.addOperationState({ hasError: true });
    }
}
