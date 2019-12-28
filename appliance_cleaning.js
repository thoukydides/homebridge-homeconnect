// Homebridge plugin for Home Connect home appliances
// Copyright © 2019 Alexander Thoukydides

'use strict';

const ApplianceGeneric = require('./appliance_generic.js');
const HasDoor = require('./has_door.js');
const HasEvents = require('./has_events.js');
const HasOperation = require('./has_operation.js');
const HasOperationError = require('./has_operationerror.js');
const HasRemainingTime = require('./has_remainingtime.js');

// A Homebridge accessory for a Home Connect dishwasher
module.exports.Dishwasher = class ApplianceDishwasher extends ApplianceGeneric {
    constructor(...args) {
        super(...args);

        // Customise the appliance as a dishwasher
        this.addPowerOff('BSH.Common.EnumType.PowerState.Off');
        this.mixin(HasDoor);
        this.mixin(HasEvents, {
            'BSH.Common.Event.ProgramFinished':     'program finished',
            'BSH.Common.Event.ProgramAborted':      'program aborted'
        });
        this.mixin(HasRemainingTime);
        this.mixin(HasOperation);
    }
}

// A Homebridge accessory for a Home Connect washer and/or dryer
class ApplianceWasherDryer extends ApplianceGeneric {
    constructor(...args) {
        super(...args);

        // Customise the appliance as a washer and/or dryer
        this.mixin(HasDoor);
        this.mixin(HasEvents, {
            'BSH.Common.Event.ProgramFinished':     'program finished',
            'BSH.Common.Event.ProgramAborted':      'program aborted'
        });
        this.mixin(HasRemainingTime);
        this.mixin(HasOperationError);
    }
}

module.exports.WasherDryer = ApplianceWasherDryer;
module.exports.Dryer       = ApplianceWasherDryer;
module.exports.Washer      = ApplianceWasherDryer;
