// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2022 Alexander Thoukydides

'use strict';

const ApplianceGeneric = require('./appliance_generic.js');
const HasAlarmClock = require('./has_alarmclock.js');
const HasChildLock = require('./has_childlock.js');
const HasDoor = require('./has_door.js');
const HasEvents = require('./has_events.js');
const HasModes = require('./has_modes.js');
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
                'Bean Container Empty',
            'ConsumerProducts.CoffeeMaker.Event.WaterTankEmpty':
                'Water Tank Empty',
            'ConsumerProducts.CoffeeMaker.Event.DripTrayFull':
                'Drip Tray Full'
        });
        this.mixin(HasModes, {
            'ConsumerProducts.CoffeeMaker.Setting.CupWarmer': 'Cup Warmer'
        });
        this.mixin(HasRemainingTime);
        this.mixin(HasRemoteControl);
        this.mixin(HasPrograms);
        this.mixin(HasChildLock);
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
            'BSH.Common.Event.ProgramFinished':     'Program Finished',
            'BSH.Common.Event.ProgramAborted':      'Program Aborted'
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
            'BSH.Common.Event.ProgramFinished':     'Program Finished',
            'BSH.Common.Event.AlarmClockElapsed':   'Alarm Clock Finished',
            'Cooking.Oven.Event.PreheatFinished':   'Preheat Finished'
        });
        this.mixin(HasAlarmClock);
        this.mixin(HasRemoteControl);
        this.mixin(HasChildLock);
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
            'BSH.Common.Event.ProgramFinished':     'Program Finished',
            'Cooking.Common.Event.Hood.GreaseFilterMaxSaturationNearlyReached':
                                                    'Filter Nearly Saturated',
            'Cooking.Common.Event.Hood.GreaseFilterMaxSaturationReached':
                                                    'Filter Saturated'
        });
        this.mixin(HasFan);
        this.mixin(HasLight);
        this.mixin(HasRemainingTime);
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
        this.mixin(HasDoor, true);
        this.mixin(HasEvents, {
            'BSH.Common.Event.ProgramFinished':     'Program Finished',
            'BSH.Common.Event.ProgramAborted':      'Program Aborted',
            'BSH.Common.Event.AlarmClockElapsed':   'Alarm Clock Finished',
            'Cooking.Oven.Event.PreheatFinished':   'Fast Preheat Finished',
            'Cooking.Oven.Event.RegularPreheatFinished':
                                                    'Regular Preheat Finished'
        });
        this.mixin(HasModes, {
            'Cooking.Oven.Setting.SabbathMode':     'Sabbath Mode'
        });
        this.mixin(HasRemainingTime);
        this.mixin(HasAlarmClock);
        this.mixin(HasRemoteControl);
        this.mixin(HasPrograms);
        this.mixin(HasChildLock);
    }
}

// A Homebridge accessory for a Home Connect warming drawer
module.exports.WarmingDrawer = class ApplianceWarmingDrawer
                             extends ApplianceGeneric {
    constructor(...args) {
        super(...args);

        // Customise the appliance as a warming drawer
        this.mixin(HasActive);
        this.mixin(HasRemoteControl);
        this.mixin(HasPrograms);
        this.mixin(HasChildLock);
    }
}
