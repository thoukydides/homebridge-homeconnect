// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2023 Alexander Thoukydides

'use strict';

const ApplianceGeneric = require('./appliance_generic.js');
const HasChildLock = require('./has_childlock.js');
const HasDoor = require('./has_door.js');
const HasEvents = require('./has_events.js');
const HasModes = require('./has_modes.js');

// Modes supported by some or all cooling appliances
const COOLING_MODES = {
    // Freezer / FridgeFreezer
    'Refrigeration.FridgeFreezer.Setting.SuperModeFreezer':
        'Freezer Super Mode',
    // FridgeFreezer / Refrigerator
    'Refrigeration.FridgeFreezer.Setting.SuperModeRefrigerator':
        'Refrigerator Super Mode',
    'Refrigeration.Common.Setting.VacationMode':
        'Vacation Mode',
    'Refrigeration.Common.Setting.FreshMode':
        'Fresh Mode',
    // Freezer / FridgeFreezer / Refrigerator
    'Refrigeration.Common.Setting.EcoMode':
        'Eco Mode',
    // Freezer / FridgeFreezer / Refrigerator / WineCooler
    'Refrigeration.Common.Setting.SabbathMode':
        'Sabbath Mode'
};

// A Homebridge accessory for a Home Connect freezer
module.exports.Freezer = class ApplianceFreezer
                       extends ApplianceGeneric {
    constructor(...args) {
        super(...args);

        // Customise the appliance as a freezer
        this.mixin(HasDoor);
        this.mixin(HasEvents, {
            'Refrigeration.FridgeFreezer.Event.DoorAlarmFreezer':
                'Freezer Door Alarm',
            'Refrigeration.FridgeFreezer.Event.TemperatureAlarmFreezer':
                'Freezer Temperature Alarm'
        });
        this.mixin(HasModes, COOLING_MODES, 'cooling');
        this.mixin(HasChildLock);
    }
}

// A Homebridge accessory for a Home Connect fridge freezer
module.exports.FridgeFreezer = class ApplianceFridgeFreezer
                             extends ApplianceGeneric {
    constructor(...args) {
        super(...args);

        // Customise the appliance as a fridge freezer
        this.mixin(HasDoor);
        this.mixin(HasEvents, {
            'Refrigeration.FridgeFreezer.Event.DoorAlarmFreezer':
                'Freezer Door Alarm',
            'Refrigeration.FridgeFreezer.Event.DoorAlarmRefrigerator':
                'Refrigerator Door Alarm',
            'Refrigeration.FridgeFreezer.Event.TemperatureAlarmFreezer':
                'Freezer Temperature Alarm'
        });
        this.mixin(HasModes, COOLING_MODES, 'cooling');
        this.mixin(HasChildLock);
    }
}

// A Homebridge accessory for a Home Connect refrigerator
module.exports.Refrigerator = class ApplianceRefrigerator
                            extends ApplianceGeneric {
    constructor(...args) {
        super(...args);

        // Customise the appliance as a fridge
        this.mixin(HasDoor);
        this.mixin(HasEvents, {
            'Refrigeration.FridgeFreezer.Event.DoorAlarmRefrigerator':
                'Refrigerator Door Alarm'
        });
        this.mixin(HasModes, COOLING_MODES, 'cooling');
        this.mixin(HasChildLock);
    }
}

// A Homebridge accessory for a Home Connect wine cooler
module.exports.WineCooler = class ApplianceWineCooler
                          extends ApplianceGeneric {
    constructor(...args) {
        super(...args);

        // Customise the appliance as a wine cooler
        this.mixin(HasDoor);
        this.mixin(HasModes, COOLING_MODES, 'cooling');
        this.mixin(HasChildLock);
    }
}
