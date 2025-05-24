// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2025 Alexander Thoukydides

/* eslint indent: ["warn", 4, { "CallExpression": {"arguments": 0} }] */

import { ApplianceGeneric } from './appliance-generic.js';
import { HasAlarmClock } from './has-alarmclock.js';
import { HasChildLock } from './has-childlock.js';
import { HasDoor, HasLockableDoor } from './has-door.js';
import { HasEvents } from './has-events.js';
import { HasModes } from './has-modes.js';
import { HasFan } from './has-fan.js';
import { HasHoodLight } from './has-light.js';
import { HasActive } from './has-active.js';
import { HasPrograms } from './has-programs.js';
import { HasRemainingTime } from './has-remainingtime.js';
import { HasRemoteControl } from './has-remotecontrol.js';
import { PowerState } from './api-value-types.js';

// A Homebridge accessory for a Home Connect coffee maker
export class ApplianceCoffeeMaker extends
    HasChildLock(
    HasPrograms(
    HasRemoteControl(
    HasRemainingTime(
    HasModes(
    HasEvents(
    HasDoor(
    HasActive(
    ApplianceGeneric)))))))) {

    constructor(...args: ConstructorParameters<typeof ApplianceGeneric>) {
        super(...args);

        // Add CoffeeMaker events
        this.hasEvent('ConsumerProducts.CoffeeMaker.Event.BeanContainerEmpty',              'Bean Container Empty');
        this.hasEvent('ConsumerProducts.CoffeeMaker.Event.WaterTankEmpty',                  'Water Tank Empty');
        this.hasEvent('ConsumerProducts.CoffeeMaker.Event.DripTrayFull',                    'Drip Tray Full');
        this.hasEvent('ConsumerProducts.CoffeeMaker.Event.DescalingIn20Cups',               'Descaling In 20 Cups');
        this.hasEvent('ConsumerProducts.CoffeeMaker.Event.DescalingIn15Cups',               'Descaling In 15 Cups');
        this.hasEvent('ConsumerProducts.CoffeeMaker.Event.DescalingIn10Cups',               'Descaling In 10 Cups');
        this.hasEvent('ConsumerProducts.CoffeeMaker.Event.DescalingIn5Cups',                'Descaling In 5 Cups');
        this.hasEvent('ConsumerProducts.CoffeeMaker.Event.DeviceShouldBeDescaled',          'Device Should Be Descaled');
        this.hasEvent('ConsumerProducts.CoffeeMaker.Event.DeviceDescalingOverdue',          'Device Descaling Overdue');
        this.hasEvent('ConsumerProducts.CoffeeMaker.Event.DeviceDescalingBlockage',         'Device Descaling Blockage');
        this.hasEvent('ConsumerProducts.CoffeeMaker.Event.DeviceShouldBeCleaned',           'Device Should Be Cleaned');
        this.hasEvent('ConsumerProducts.CoffeeMaker.Event.DeviceCleaningOverdue',           'Device Cleaning Overdue');
        this.hasEvent('ConsumerProducts.CoffeeMaker.Event.CalcNCleanIn20Cups',              "Calc'nClean In 20 Cups");
        this.hasEvent('ConsumerProducts.CoffeeMaker.Event.CalcNCleanIn15Cups',              "Calc'NClean In 15 Cups");
        this.hasEvent('ConsumerProducts.CoffeeMaker.Event.CalcNCleanIn10Cups',              "Calc'NClean In 10 Cups");
        this.hasEvent('ConsumerProducts.CoffeeMaker.Event.CalcNCleanIn5Cups',               "Calc'NClean In 5 Cups");
        this.hasEvent('ConsumerProducts.CoffeeMaker.Event.DeviceShouldBeCalcNCleaned',      "Device Should Be Calc'NCleaned");
        this.hasEvent('ConsumerProducts.CoffeeMaker.Event.DeviceCalcNCleanOverdue',         "Device Calc'NClean Overdue");
        this.hasEvent('ConsumerProducts.CoffeeMaker.Event.DeviceCalcNCleanBlockage',        "Device Calc'NClean Blockage");
        this.hasEvent('ConsumerProducts.CoffeeMaker.Event.KeepMilkTankCool',                'Keep Milk Tank Cool');

        // Add CoffeeMaker mode settings
        this.hasMode ('ConsumerProducts.CoffeeMaker.Setting.CupWarmer',                     'Cup Warmer');
    }
}

// A Homebridge accessory for a Home Connect cook processor
export class ApplianceCookProcessor extends
    HasRemainingTime(
    HasEvents(
    HasActive(
    ApplianceGeneric))) {

    constructor(...args: ConstructorParameters<typeof ApplianceGeneric>) {
        super(...args);

        // Add CookProcessor events
        this.hasEvent('BSH.Common.Event.ProgramFinished',                                   'Program Finished');
        this.hasEvent('BSH.Common.Event.ProgramAborted',                                    'Program Aborted');
    }
}

// A Homebridge accessory for a Home Connect hob (cooktop)
export class ApplianceHob extends
    HasChildLock(
    HasRemoteControl(
    HasAlarmClock(
    HasEvents(
    HasActive(
    ApplianceGeneric))))) {

    constructor(...args: ConstructorParameters<typeof ApplianceGeneric>) {
        super(...args);

        // Add Hob (cooktop) events
        this.hasEvent('BSH.Common.Event.ProgramFinished',                                   'Program Finished');
        this.hasEvent('BSH.Common.Event.AlarmClockElapsed',                                 'Alarm Clock Finished');
        this.hasEvent('Cooking.Oven.Event.PreheatFinished',                                 'Preheat Finished');
    }
}

// A Homebridge accessory for a Home Connect hood
export class ApplianceHood extends
    HasRemoteControl(
    HasRemainingTime(
    HasHoodLight(
    HasFan(
    HasEvents(
    ApplianceGeneric))))) {

    constructor(...args: ConstructorParameters<typeof ApplianceGeneric>) {
        super(...args);

        // Add Hood events
        this.hasEvent('BSH.Common.Event.ProgramFinished',                                   'Program Finished');
        this.hasEvent('Cooking.Common.Event.Hood.GreaseFilterMaxSaturationNearlyReached',   'Filter Nearly Saturated');
        this.hasEvent('Cooking.Common.Event.Hood.GreaseFilterMaxSaturationReached',         'Filter Saturated');
    }
}

// A Homebridge accessory for a Home Connect oven
export class ApplianceOven extends
    HasChildLock(
    HasPrograms(
    HasRemoteControl(
    HasAlarmClock(
    HasRemainingTime(
    HasModes(
    HasEvents(
    HasLockableDoor(
    HasActive(
    ApplianceGeneric))))))))) {

    constructor(...args: ConstructorParameters<typeof ApplianceGeneric>) {
        super(...args);

        // Add Oven events
        this.hasEvent('BSH.Common.Event.ProgramFinished',                                   'Program Finished');
        this.hasEvent('BSH.Common.Event.ProgramAborted',                                    'Program Aborted');
        this.hasEvent('BSH.Common.Event.AlarmClockElapsed',                                 'Alarm Clock Finished');
        this.hasEvent('Cooking.Oven.Event.PreheatFinished',                                 'Fast Preheat Finished');
        this.hasEvent('Cooking.Oven.Event.RegularPreheatFinished',                          'Regular Preheat Finished');

        // Add Oven mode settings
        this.hasMode ('Cooking.Oven.Setting.SabbathMode',                                   'Sabbath Mode');

        // Oven appliances incorrectly indicate support for PowerState.Off
        this.hasPowerOff(PowerState.Standby);
    }
}

// A Homebridge accessory for a Home Connect warming drawer
export class ApplianceWarmingDrawer
    extends HasChildLock(
    HasPrograms(
    HasRemoteControl(
    HasActive(
    ApplianceGeneric)))) {
}