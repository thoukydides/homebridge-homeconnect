// Homebridge plugin for Home Connect home appliances
// Copyright © 2019 Alexander Thoukydides

'use strict';

const ApplianceGeneric = require('./appliance_generic.js');

let Service, Characteristic;

// A Homebridge accessory for a Home Connect oven
module.exports = class ApplianceDishwasher extends ApplianceGeneric {

    // Initialise an appliance
    constructor(...args) {
        super(...args);

        // Shortcuts to useful HAP objects
        Service = this.homebridge.hap.Service;
        Characteristic = this.homebridge.hap.Characteristic;

        // Customise the appliance as a dishwasher
        this.addPowerOff('BSH.Common.EnumType.PowerState.Off');
        this.addDoor();
        this.addEvents({
            'BSH.Common.Event.ProgramFinished':     'program finished',
            'BSH.Common.Event.ProgramAborted':      'program aborted'
        });
        this.addProgramRemainingTime();
        this.addOperationState();
    }
}
