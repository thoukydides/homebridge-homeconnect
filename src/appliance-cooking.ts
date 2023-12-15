// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2023 Alexander Thoukydides

/* eslint indent: ["warn", 4, { "CallExpression": {"arguments": 0} }] */

import { ApplianceGeneric } from './appliance-generic';
import { HasAlarmClock } from './has-alarmclock';
import { HasChildLock } from './has-childlock';
import { HasDoor, HasLockableDoor } from './has-door';
import { HasEvents } from './has-events';
import { HasModes } from './has-modes';
import { HasFan } from './has-fan';
import { HasLight } from './has-light';
import { HasActive } from './has-active';
import { HasPrograms } from './has-programs';
import { HasRemainingTime } from './has-remainingtime';
import { HasRemoteControl } from './has-remotecontrol';
import { PowerState } from './api-value-types';

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
    HasLight(
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