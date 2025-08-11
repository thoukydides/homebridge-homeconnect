// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2025 Alexander Thoukydides

/* eslint indent: ["warn", 4, { "CallExpression": {"arguments": 0} }] */

import { ApplianceBase, ApplianceGeneric } from './appliance-generic.js';
import { HasChildLock } from './has-childlock.js';
import { HasDoor } from './has-door.js';
import { HasEvents } from './has-events.js';
import { HasModes } from './has-modes.js';
import { HasRefrigerationLight } from './has-light.js';
import { Constructor } from './utils.js';

// A Homebridge accessory for a Home Connect air conditioner
export class ApplianceAirConditioner extends ApplianceGeneric {}

// Add cooling appliance mode settings to an accessory
function HasCoolingModes<TBase extends Constructor<ApplianceBase>>(Base: TBase) {
    return class HasCoolingModes extends HasModes(Base, 'cooling') {

        // Mixin constructor
        constructor(...args: any[]) {
            super(...args as ConstructorParameters<TBase>);

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

// Add separate FridgeFreezer and Refrigerator doors to an accessory
function HasCoolingDoors<TBase extends Constructor<ApplianceBase>>(Base: TBase) {
    return class HasCoolingDoors extends HasDoor(Base) {

        // Mixin constructor
        constructor(...args: any[]) {
            super(...args as ConstructorParameters<TBase>);

            // Add doors for all types of FridgeFreezer/Refrigerator appliance

            // Freezer / FridgeFreezer
            this.hasDoor('Refrigeration.Common.Status.Door.Freezer',                    'Freezer Door');
            // FridgeFreezer
            this.hasDoor('Refrigeration.Common.Status.Door.FlexCompartment',            'Flex Compartment Door');
            // FridgeFreezer / Refrigerator
            this.hasDoor('Refrigeration.Common.Status.Door.BottleCooler',               'Bottle Cooler Door');
            this.hasDoor('Refrigeration.Common.Status.Door.ChillerCommon',              'Chiller Common Door');
            this.hasDoor('Refrigeration.Common.Status.Door.Chiller',                    'Chiller Door');
            this.hasDoor('Refrigeration.Common.Status.Door.ChillerLeft',                'Chiller Left Door');
            this.hasDoor('Refrigeration.Common.Status.Door.ChillerRight',               'Chiller Right Door');
            this.hasDoor('Refrigeration.Common.Status.Door.Refrigerator',               'Refrigerator Door');
            this.hasDoor('Refrigeration.Common.Status.Door.Refrigerator2',              'Refrigerator Door 2');
            this.hasDoor('Refrigeration.Common.Status.Door.Refrigerator3',              'Refrigerator Door 3');
        }
    };
}

// A Homebridge accessory for a Home Connect freezer
export class ApplianceFreezer extends
    HasChildLock(
    HasCoolingModes(
    HasRefrigerationLight(
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
    HasRefrigerationLight(
    HasEvents(
    HasCoolingDoors(
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
    HasRefrigerationLight(
    HasEvents(
    HasCoolingDoors(
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