// Homebridge plugin for Home Connect home appliances
// Copyright © 2019 Alexander Thoukydides

'use strict';

const ApplianceGeneric = require('./appliance_generic.js');
const HasDoor = require('./has_door.js');
const HasEvents = require('./has_events.js');
const HasFan = require('./has_fan.js');
const HasLight = require('./has_light.js');
const HasOperation = require('./has_operation.js');
const HasOperationError = require('./has_operationerror.js');
const HasPrograms = require('./has_programs.js');
const HasRemainingTime = require('./has_remainingtime.js');
const HasRemoteControl = require('./has_remotecontrol.js');

let Service, Characteristic;

// A Homebridge accessory for a Home Connect coffee maker
module.exports.CoffeeMaker = class ApplianceCoffeeMaker
                           extends ApplianceGeneric {
    constructor(...args) {
        super(...args);

        // Customise the appliance as a coffee maker
        this.addPowerOff('BSH.Common.EnumType.PowerState.Standby');
        this.mixin(HasDoor);
        this.mixin(HasEvents, {
            'ConsumerProducts.CoffeeMaker.Event.BeanContainerEmpty':
                'bean container empty',
            'ConsumerProducts.CoffeeMaker.Event.WaterTankEmpty':
                'water tank empty',
            'ConsumerProducts.CoffeeMaker.Event.DripTrayFull':
                'drip tray full'
        });
        this.mixin(HasRemainingTime);
        this.mixin(HasOperationError);
        this.mixin(HasRemoteControl);
        this.mixin(HasPrograms);
    }
}

// A Homebridge accessory for a Home Connect hob (cooktop)
module.exports.Hob = class ApplianceHob extends ApplianceGeneric {
    constructor(...args) {
        super(...args);

        // Customise the appliance as a hob (cooktop)
        // (Home Connect requires local power control of hobs)
        this.mixin(HasEvents, {
            'BSH.Common.Event.ProgramFinished':     'program finished',
            'BSH.Common.Event.AlarmClockElapsed':   'timer finished',
            'Cooking.Oven.Event.PreheatFinished':   'preheat finished'
        });
        this.mixin(HasOperationError);
        this.mixin(HasRemoteControl);
    }
}

// A Homebridge accessory for a Home Connect hood
module.exports.Hood = class ApplianceHood extends ApplianceGeneric {
    constructor(...args) {
        super(...args);

        // Shortcuts to useful HAP objects
        Service = this.homebridge.hap.Service;
        Characteristic = this.homebridge.hap.Characteristic;

        // Customise the appliance as a hood
        this.addPowerOff('BSH.Common.EnumType.PowerState.Off');
        this.mixin(HasEvents, {
            'BSH.Common.Event.ProgramFinished':     'program finished'
        });
        this.mixin(HasRemainingTime);
        this.mixin(HasFan);
        this.mixin(HasLight);
        this.mixin(HasOperation);
        this.mixin(HasRemoteControl);
    }
}

// A Homebridge accessory for a Home Connect oven
module.exports.Oven = class ApplianceOven extends ApplianceGeneric {
    constructor(...args) {
        super(...args);

        // Customise the appliance as an oven
        this.addPowerOff('BSH.Common.EnumType.PowerState.Standby');
        this.mixin(HasDoor);
        this.mixin(HasEvents, {
            'BSH.Common.Event.ProgramFinished':     'program finished',
            'BSH.Common.Event.ProgramAborted':      'program aborted',
            'BSH.Common.Event.AlarmClockElapsed':   'timer finished',
            'Cooking.Oven.Event.PreheatFinished':   'preheat finished'
        });
        this.mixin(HasRemainingTime);
        this.mixin(HasOperationError);
        this.mixin(HasRemoteControl);
        this.mixin(HasPrograms);
    }
}
