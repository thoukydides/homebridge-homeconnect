// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2020 Alexander Thoukydides

'use strict';

const ApplianceGeneric = require('./appliance_generic.js');
const HasCooling = require('./has_cooling.js');
const HasDoor = require('./has_door.js');
const HasEvents = require('./has_events.js');

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
        this.mixin(HasCooling);
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
        this.mixin(HasCooling);
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
        this.mixin(HasCooling);
    }
}

// A Homebridge accessory for a Home Connect wine cooler
module.exports.WineCooler = class ApplianceWineCooler
                          extends ApplianceGeneric {
    constructor(...args) {
        super(...args);

        // Customise the appliance as a wine cooler
        this.mixin(HasDoor);
        this.mixin(HasCooling);
    }
}
