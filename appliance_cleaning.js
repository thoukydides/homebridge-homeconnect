// Homebridge plugin for Home Connect home appliances
// Copyright © 2019 Alexander Thoukydides

'use strict';

const ApplianceGeneric = require('./appliance_generic.js');

// A Homebridge accessory for a Home Connect dishwasher
module.exports.Dishwasher = class ApplianceDishwasher
                          extends ApplianceGeneric {

    // Initialise an appliance
    constructor(...args) {
        super(...args);

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

// A Homebridge accessory for a Home Connect clothes dryer
module.exports.Dryer = class ApplianceDryer
                     extends ApplianceGeneric {

    // Initialise an appliance
    constructor(...args) {
        super(...args);

        // Customise the appliance as a clothes dryer
        this.addDoor();
        this.addEvents({
            'BSH.Common.Event.ProgramFinished':     'program finished',
            'BSH.Common.Event.ProgramAborted':      'program aborted'
        });
        this.addProgramRemainingTime();
        this.addOperationState({ hasError: true });
    }
}

// A Homebridge accessory for a Home Connect washing machine
module.exports.Washer = class ApplianceWasher
                      extends ApplianceGeneric {

    // Initialise an appliance
    constructor(...args) {
        super(...args);

        // Customise the appliance as a washing machine
        this.addDoor();
        this.addEvents({
            'BSH.Common.Event.ProgramFinished':     'program finished',
            'BSH.Common.Event.ProgramAborted':      'program aborted'
        });
        this.addProgramRemainingTime();
        this.addOperationState({ hasError: true });
    }
}
