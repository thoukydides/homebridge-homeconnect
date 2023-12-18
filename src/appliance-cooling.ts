// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2023 Alexander Thoukydides

/* eslint indent: ["warn", 4, { "CallExpression": {"arguments": 0} }] */

import { ApplianceBase, ApplianceGeneric } from './appliance-generic';
import { HasChildLock } from './has-childlock';
import { HasDoor } from './has-door';
import { HasEvents } from './has-events';
import { HasModes } from './has-modes';
import { HasLight } from './has-light';
import { Constructor } from './utils';

// Add cooling appliance mode settings to an accessory
function HasCoolingModes<TBase extends Constructor<ApplianceBase>>(Base: TBase) {
    return class HasCoolingModes extends HasModes(Base, 'cooling') {

        // Mixin constructor
        constructor(...args: any[]) {
            super(...args);

            // Add events for all types of cooling appliance

            // Freezer / FridgeFreezer
            this.hasMode('Refrigeration.FridgeFreezer.Setting.SuperModeFreezer',        'Freezer Super Mode');
            this.hasMode('Refrigeration.Common.Setting.Dispenser.Enabled',              'Ice Dispenser');
            // FridgeFreezer / Refrigerator
            this.hasMode('Refrigeration.FridgeFreezer.Setting.SuperModeRefrigerator',   'Refrigerator Super Mode');
            this.hasMode('Refrigeration.Common.Setting.VacationMode',                   'Vacation Mode');
            this.hasMode('Refrigeration.Common.Setting.FreshMode',                      'Fresh Mode');
            // Freezer / FridgeFreezer / Refrigerator
            this.hasMode('Refrigeration.Common.Setting.EcoMode',                        'Eco Mode');
            // Freezer / FridgeFreezer / Refrigerator / WineCooler
            this.hasMode('Refrigeration.Common.Setting.SabbathMode',                    'Sabbath Mode');
        }
    };
}

// A Homebridge accessory for a Home Connect freezer
export class ApplianceFreezer extends
    HasChildLock(
    HasCoolingModes(
    HasLight(
    HasEvents(
    HasDoor(
    ApplianceGeneric))))) {

    constructor(...args: ConstructorParameters<typeof ApplianceGeneric>) {
        super(...args);

        // Add Freezer events
        this.hasEvent('Refrigeration.FridgeFreezer.Event.DoorAlarmFreezer',             'Freezer Door Alarm');
        this.hasEvent('Refrigeration.FridgeFreezer.Event.TemperatureAlarmFreezer',      'Freezer Temperature Alarm');
    }
}

// A Homebridge accessory for a Home Connect fridge freezer
export class ApplianceFridgeFreezer extends
    HasChildLock(
    HasCoolingModes(
    HasLight(
    HasEvents(
    HasDoor(
    ApplianceGeneric))))) {

    constructor(...args: ConstructorParameters<typeof ApplianceGeneric>) {
        super(...args);

        // Add FridgeFreezer events
        this.hasEvent('Refrigeration.FridgeFreezer.Event.DoorAlarmFreezer',             'Freezer Door Alarm');
        this.hasEvent('Refrigeration.FridgeFreezer.Event.DoorAlarmRefrigerator',        'Refrigerator Door Alarm');
        this.hasEvent('Refrigeration.FridgeFreezer.Event.TemperatureAlarmFreezer',      'Freezer Temperature Alarm');
    }
}

// A Homebridge accessory for a Home Connect refrigerator
export class ApplianceRefrigerator extends
    HasChildLock(
    HasCoolingModes(
    HasLight(
    HasEvents(
    HasDoor(
    ApplianceGeneric))))) {

    constructor(...args: ConstructorParameters<typeof ApplianceGeneric>) {
        super(...args);

        // Add Fridge events
        this.hasEvent('Refrigeration.FridgeFreezer.Event.DoorAlarmRefrigerator',        'Refrigerator Door Alarm');
    }
}

// A Homebridge accessory for a Home Connect wine cooler
export class ApplianceWineCooler extends
    HasChildLock(
    HasCoolingModes(
    HasDoor(
    ApplianceGeneric))) {
}