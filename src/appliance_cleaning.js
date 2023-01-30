// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2023 Alexander Thoukydides

import { ApplianceGeneric } from './appliance_generic';
import HasChildLock from './has_childlock';
import HasDoor from './has_door';
import HasEvents from './has_events';
import HasActive from './has_active';
import HasBattery from './has_battery';
import HasLight from './has_light';
import HasPrograms from './has_programs';
import HasRemainingTime from './has_remainingtime';
import HasRemoteControl from './has_remotecontrol';

// A Homebridge accessory for a Home Connect cleaning robot (Roxxter)
export class ApplianceCleaningRobot
    extends ApplianceGeneric {
    constructor(...args) {
        super(...args);

        // Customise the appliance as a cleaning robot
        this.mixin(HasActive);
        this.mixin(HasEvents, {
            'BSH.Common.Event.ProgramFinished':
                'Program Finished',
            'BSH.Common.Event.ProgramAborted':
                'Program Aborted',
            'ConsumerProducts.CleaningRobot.Event.EmptyDustBoxAndCleanFilter':
                'Dust Box Full',
            'ConsumerProducts.CleaningRobot.Event.RobotIsStuck':
                'Stuck',
            'ConsumerProducts.CleaningRobot.Event.DockingStationNotFound':
                'Lost'
        });
        this.mixin(HasPrograms);
        this.mixin(HasBattery);
    }
}

// A Homebridge accessory for a Home Connect dishwasher
export class ApplianceDishwasher
    extends ApplianceGeneric {
    constructor(...args) {
        super(...args);

        // Customise the appliance as a dishwasher
        this.mixin(HasActive);
        this.mixin(HasDoor);
        this.mixin(HasEvents, {
            'BSH.Common.Event.ProgramFinished':     'Program Finished',
            'BSH.Common.Event.ProgramAborted':      'Program Aborted'
        });
        this.mixin(HasLight);
        this.mixin(HasRemainingTime);
        this.mixin(HasRemoteControl);
        this.mixin(HasPrograms);
        this.mixin(HasChildLock);
    }
}

// A Homebridge accessory for a Home Connect washer and/or dryer
class ApplianceLaundry extends ApplianceGeneric {
    constructor(...args) {
        super(...args);

        // Customise the appliance as a dryer
        this.mixin(HasActive);
        this.mixin(HasDoor, true);
        this.mixin(HasRemainingTime);
        this.mixin(HasRemoteControl);
        this.mixin(HasPrograms);
        this.mixin(HasChildLock);
    }
}

// A Homebridge accessory for a Home Connect dryer
export class ApplianceDryer
    extends ApplianceLaundry {
    constructor(...args) {
        super(...args);

        // Customise the appliance as a dryer
        this.mixin(HasEvents, {
            'BSH.Common.Event.ProgramFinished':     'Program Finished',
            'BSH.Common.Event.ProgramAborted':      'Program Aborted'
        });
    }
}

// A Homebridge accessory for a Home Connect washer or washer/dryer
export class ApplianceWasherDryer extends ApplianceLaundry {
    constructor(...args) {
        super(...args);

        // Customise the appliance as a washer or washer/dryer
        this.mixin(HasEvents, {
            'BSH.Common.Event.ProgramFinished':             'Program Finished',
            'BSH.Common.Event.ProgramAborted':              'Program Aborted',
            'LaundryCare.Washer.Event.IDos1FillLevelPoor':  'i-Dos 1 Low',
            'LaundryCare.Washer.Event.IDos2FillLevelPoor':  'i-Dos 2 Low'
        });
    }
}

export const ApplianceWasher = ApplianceWasherDryer;
