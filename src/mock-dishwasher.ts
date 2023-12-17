// Homebridge plugin for Home Connect home appliances
// Copyright © 2023 Alexander Thoukydides

import { CommandKV, ProgramDefinitionKV, SettingKV, StatusKV } from './api-value';
import { DoorState, OperationState, PowerState } from './api-value-types';
import { MockAppliance } from './mock-appliance';

// A mock Dishwasher (based on a physical Siemens iQ700 appliance)
// https://www.siemens-home.bsh-group.com/uk/productlist/SN678D06TG
export class MockDishwasher extends MockAppliance {

    // Mandatory appliance details
    readonly type       = 'Dishwasher';
    readonly enumber    = 'SN678D06TG/53';
    readonly brand      = 'Siemens';

    // Appliance status
    readonly status: StatusKV[] = [{
        key: 'BSH.Common.Status.DoorState',
        value: DoorState.Closed,
        name: 'Door'
    }, {
        key: 'BSH.Common.Status.LocalControlActive',
        value: false,
        name: 'Local operation active'
    }, {
        key: 'BSH.Common.Status.RemoteControlStartAllowed',
        value: true,
        name: 'Remote Start'
    }, {
        key: 'BSH.Common.Status.RemoteControlActive',
        value: true,
        name: 'Remote Control'
    }, {
        key: 'BSH.Common.Status.OperationState',
        value: OperationState.Ready,
        name: 'Operation state'
    }, {
        key: 'Cooking.Oven.Status.CurrentCavityTemperature',
        value: 59,
        unit: '°C'
    }];

    // Appliance settings
    readonly settings: SettingKV[] = [{
        key: 'BSH.Common.Setting.PowerState',
        type: 'BSH.Common.EnumType.PowerState',
        value: PowerState.On,
        name: 'Power status',
        constraints: {
            allowedvalues: [ PowerState.Off, PowerState.On ],
            displayvalues: [ 'Off', 'On' ],
            access: 'readWrite'
        }
    }];

    // Appliance commands
    readonly commands: CommandKV[] = [{
        key: 'BSH.Common.Command.AcknowledgeEvent',
        name: 'OK'
    }];

    // Appliance programs
    readonly programs: ProgramDefinitionKV[] = [{
        key: 'Dishcare.Dishwasher.Program.Intensiv70',
        name: 'Intensive 70°C',
        options: []
    }, {
        key: 'Dishcare.Dishwasher.Program.Auto2',
        name: 'Auto 45-65°C',
        options: []
    }, {
        key: 'Dishcare.Dishwasher.Program.Eco50',
        name: 'Eco 50°C',
        options: [{
            key: 'Dishcare.Dishwasher.Option.HygienePlus',
            type: 'Boolean',
            constraints: { default: false, liveupdate: true },
            name: 'Hygiene Plus'
        }, {
            key: 'Dishcare.Dishwasher.Option.IntensivZone',
            type: 'Boolean',
            constraints: { default: false, liveupdate: true },
            name: 'Intensive Zone'
        }, {
            key: 'Dishcare.Dishwasher.Option.VarioSpeedPlus',
            type: 'Boolean',
            constraints: { default: false, liveupdate: true },
            name: 'varioSpeed Plus'
        }, {
            key: 'Dishcare.Dishwasher.Option.BrillianceDry',
            type: 'Boolean',
            constraints: { default: false, liveupdate: true },
            name: 'Shine and Dry'
        }]
    }, {
        key: 'Dishcare.Dishwasher.Program.NightWash',
        name: 'Silence',
        options: [{
            key: 'Dishcare.Dishwasher.Option.HygienePlus',
            type: 'Boolean',
            constraints: { default: false, liveupdate: true },
            name: 'Hygiene Plus'
        }, {
            key: 'Dishcare.Dishwasher.Option.IntensivZone',
            type: 'Boolean',
            constraints: { default: false, liveupdate: true },
            name: 'Intensive Zone'
        }, {
            key: 'Dishcare.Dishwasher.Option.BrillianceDry',
            type: 'Boolean',
            constraints: { default: false, liveupdate: true },
            name: 'Shine and Dry'
        }]
    }, {
        key: 'Dishcare.Dishwasher.Program.Kurz60',
        name: 'Short 60°C',
        options: [{
            key: 'Dishcare.Dishwasher.Option.HygienePlus',
            type: 'Boolean',
            constraints: { default: false, liveupdate: true },
            name: 'Hygiene Plus'
        }, {
            key: 'Dishcare.Dishwasher.Option.IntensivZone',
            type: 'Boolean',
            constraints: { default: false, liveupdate: true },
            name: 'Intensive Zone'
        }, {
            key: 'Dishcare.Dishwasher.Option.VarioSpeedPlus',
            type: 'Boolean',
            constraints: { default: false, liveupdate: true },
            name: 'varioSpeed Plus'
        }, {
            key: 'Dishcare.Dishwasher.Option.BrillianceDry',
            type: 'Boolean',
            constraints: { default: false, liveupdate: true },
            name: 'Shine and Dry'
        }]
    }, {
        key: 'Dishcare.Dishwasher.Program.Glas40',
        name: 'Glass 40°C',
        options: [{
            key: 'Dishcare.Dishwasher.Option.IntensivZone',
            type: 'Boolean',
            constraints: { default: false, liveupdate: true },
            name: 'Intensive Zone'
        }, {
            key: 'Dishcare.Dishwasher.Option.VarioSpeedPlus',
            type: 'Boolean',
            constraints: { default: false, liveupdate: true },
            name: 'varioSpeed Plus'
        }, {
            key: 'Dishcare.Dishwasher.Option.BrillianceDry',
            type: 'Boolean',
            constraints: { default: false, liveupdate: true },
            name: 'Shine and Dry'
        }]
    }, {
        key: 'Dishcare.Dishwasher.Program.Quick45',
        name: 'Quick wash 45°C',
        options: [{
            key: 'Dishcare.Dishwasher.Option.BrillianceDry',
            type: 'Boolean',
            constraints: { default: false, liveupdate: true },
            name: 'Shine and Dry'
        }]
    }, {
        key: 'Dishcare.Dishwasher.Program.PreRinse',
        name: 'Pre-rinse',
        options: []
    }, {
        key: 'Dishcare.Dishwasher.Program.MachineCare',
        name: 'Machine Care',
        options: []
    }];
}