// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2020 Alexander Thoukydides

'use strict';

const ApplianceGeneric = require('./appliance_generic.js');
const HasDoor = require('./has_door.js');
const HasEvents = require('./has_events.js');
const HasFan = require('./has_fan.js');
const HasLight = require('./has_light.js');
const HasActive = require('./has_active.js');
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
        this.mixin(HasActive);
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
        this.mixin(HasRemoteControl);
        this.mixin(HasPrograms);
    }
}

// A Homebridge accessory for a Home Connect cook processor
module.exports.CookProcessor = class ApplianceCookProcessor
                             extends ApplianceGeneric {
    constructor(...args) {
        super(...args);

        // Customise the appliance as a cook processor
        this.mixin(HasActive);
        this.mixin(HasEvents, {
            'BSH.Common.Event.ProgramFinished':     'program finished',
            'BSH.Common.Event.ProgramAborted':      'program aborted'
        });
        this.mixin(HasRemainingTime);
    }
}

// A Homebridge accessory for a Home Connect hob (cooktop)
module.exports.Hob = class ApplianceHob
                   extends ApplianceGeneric {
    constructor(...args) {
        super(...args);

        // Customise the appliance as a hob (cooktop)
        // (Home Connect requires local power control of hobs)
        this.mixin(HasActive);
        this.mixin(HasEvents, {
            'BSH.Common.Event.ProgramFinished':     'program finished',
            'BSH.Common.Event.AlarmClockElapsed':   'timer finished',
            'Cooking.Oven.Event.PreheatFinished':   'preheat finished'
        });
        this.mixin(HasRemoteControl);
    }
}

// A Homebridge accessory for a Home Connect hood
module.exports.Hood = class ApplianceHood
                    extends ApplianceGeneric {
    constructor(...args) {
        super(...args);

        // Shortcuts to useful HAP objects
        Service = this.homebridge.hap.Service;
        Characteristic = this.homebridge.hap.Characteristic;

        // Customise the appliance as a hood
        this.mixin(HasEvents, {
            'BSH.Common.Event.ProgramFinished':     'program finished'
        });
        this.mixin(HasRemainingTime);
        this.mixin(HasFan);
        this.mixin(HasLight);
        this.mixin(HasRemoteControl);
    }
}

// A Homebridge accessory for a Home Connect oven
module.exports.Oven = class ApplianceOven
                    extends ApplianceGeneric {
    constructor(...args) {
        super(...args);

        // Customise the appliance as an oven
        this.mixin(HasActive);
        this.mixin(HasDoor);
        this.mixin(HasEvents, {
            'BSH.Common.Event.ProgramFinished':     'program finished',
            'BSH.Common.Event.ProgramAborted':      'program aborted',
            'BSH.Common.Event.AlarmClockElapsed':   'timer finished',
            'Cooking.Oven.Event.PreheatFinished':   'preheat finished'
        });
        this.mixin(HasRemainingTime);
        this.mixin(HasRemoteControl);
        this.mixin(HasPrograms);
    }
}
