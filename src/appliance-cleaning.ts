// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2023 Alexander Thoukydides

/* eslint indent: ["warn", 4, { "CallExpression": {"arguments": 0} }] */

import { ApplianceGeneric } from './appliance-generic';
import { HasChildLock } from './has-childlock';
import { HasDoor, HasLockableDoor } from './has-door';
import { HasEvents } from './has-events';
import { HasActive } from './has-active';
import { HasBattery } from './has-battery';
import { HasCleaningLight } from './has-light';
import { HasPrograms } from './has-programs';
import { HasRemainingTime } from './has-remainingtime';
import { HasRemoteControl } from './has-remotecontrol';

// A Homebridge accessory for a Home Connect cleaning robot (Roxxter)
export class ApplianceCleaningRobot extends
    HasBattery(
    HasPrograms(
    HasEvents(
    HasActive(
    ApplianceGeneric)))) {

    constructor(...args: ConstructorParameters<typeof ApplianceGeneric>) {
        super(...args);

        // Add CleaningRobot events
        this.hasEvent('BSH.Common.Event.ProgramFinished',                                   'Program Finished');
        this.hasEvent('BSH.Common.Event.ProgramAborted',                                    'Program Aborted');
        this.hasEvent('ConsumerProducts.CleaningRobot.Event.EmptyDustBoxAndCleanFilter',    'Dust Box Full');
        this.hasEvent('ConsumerProducts.CleaningRobot.Event.RobotIsStuck',                  'Stuck');
        this.hasEvent('ConsumerProducts.CleaningRobot.Event.DockingStationNotFound',        'Lost');
    }
}

// A Homebridge accessory for a Home Connect dishwasher
export class ApplianceDishwasher extends
    HasChildLock(
    HasPrograms(
    HasRemoteControl(
    HasRemainingTime(
    HasCleaningLight(
    HasEvents(
    HasDoor(
    HasActive(
    ApplianceGeneric)))))))) {

    constructor(...args: ConstructorParameters<typeof ApplianceGeneric>) {
        super(...args);

        // Add Dishwasher events
        this.hasEvent('BSH.Common.Event.ProgramFinished',                                   'Program Finished');
        this.hasEvent('BSH.Common.Event.ProgramAborted',                                    'Program Aborted');
        this.hasEvent('Dishcare.Dishwasher.Event.SaltNearlyEmpty',                          'Salt Low');
        this.hasEvent('Dishcare.Dishwasher.Event.RinseAidNearlyEmpty',                      'Rinse Aid Low');
    }
}

// A Homebridge accessory for a Home Connect washer and/or dryer
class ApplianceLaundry extends
    HasChildLock(
    HasPrograms(
    HasRemoteControl(
    HasRemainingTime(
    HasEvents(
    HasLockableDoor(
    HasActive(
    ApplianceGeneric))))))) {
}

// A Homebridge accessory for a Home Connect dryer
export class ApplianceDryer extends ApplianceLaundry {

    constructor(...args: ConstructorParameters<typeof ApplianceGeneric>) {
        super(...args);

        // Add Dryer events
        this.hasEvent('BSH.Common.Event.ProgramFinished',                                   'Program Finished');
        this.hasEvent('BSH.Common.Event.ProgramAborted',                                    'Program Aborted');
    }
}

// A Homebridge accessory for a Home Connect washer or washer/dryer
export class ApplianceWasherDryer extends ApplianceLaundry {

    constructor(...args: ConstructorParameters<typeof ApplianceGeneric>) {
        super(...args);

        // Add Washer/WasherDryer events
        this.hasEvent('BSH.Common.Event.ProgramFinished',                                   'Program Finished');
        this.hasEvent('BSH.Common.Event.ProgramAborted',                                    'Program Aborted');
        this.hasEvent('LaundryCare.Washer.Event.IDos1FillLevelPoor',                        'i-Dos 1 Low');
        this.hasEvent('LaundryCare.Washer.Event.IDos2FillLevelPoor',                        'i-Dos 2 Low');
    }
}
export class ApplianceWasher extends ApplianceWasherDryer {}