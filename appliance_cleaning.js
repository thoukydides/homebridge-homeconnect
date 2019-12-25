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

// A Homebridge accessory for a Home Connect washer and/or dryer
class ApplianceWasherDryer extends ApplianceGeneric {

    // Initialise an appliance
    constructor(...args) {
        super(...args);

        // Customise the appliance as a washer and/or dryer
        this.addDoor();
        this.addEvents({
            'BSH.Common.Event.ProgramFinished':     'program finished',
            'BSH.Common.Event.ProgramAborted':      'program aborted'
        });
        this.addProgramRemainingTime();
        this.addOperationState({ hasError: true });
    }
}

module.exports.WasherDryer = ApplianceWasherDryer;
module.exports.Dryer       = ApplianceWasherDryer;
module.exports.Washer      = ApplianceWasherDryer;
