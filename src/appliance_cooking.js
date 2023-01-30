// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2023 Alexander Thoukydides

import ApplianceGeneric from './appliance_generic.js';
import HasAlarmClock from './has_alarmclock.js';
import HasChildLock from './has_childlock.js';
import HasDoor from './has_door.js';
import HasEvents from './has_events.js';
import HasModes from './has_modes.js';
import HasFan from './has_fan.js';
import HasLight from './has_light.js';
import HasActive from './has_active.js';
import HasPrograms from './has_programs.js';
import HasRemainingTime from './has_remainingtime.js';
import HasRemoteControl from './has_remotecontrol.js';

// A Homebridge accessory for a Home Connect coffee maker
export class ApplianceCoffeeMaker
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
export class ApplianceCookProcessor
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
export class ApplianceHob
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
export class ApplianceHood
    extends ApplianceGeneric {
    constructor(...args) {
        super(...args);

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
export class ApplianceOven
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
export class ApplianceWarmingDrawer
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
