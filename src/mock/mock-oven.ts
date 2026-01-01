// Homebridge plugin for Home Connect home appliances
// Copyright © 2026 Alexander Thoukydides

import { CommandKV, ProgramDefinitionKV, SettingKV, StatusKV } from '../api-value.js';
import { OperationState, PowerState } from '../api-value-types.js';
import { MockAppliance } from './mock-appliance.js';

// A mock Oven (based on a physical Siemens iQ700 appliance)
// https://www.siemens-home.bsh-group.com/uk/productlist/HB678GBS6B
export class MockOven extends MockAppliance {

    // Mandatory appliance details
    readonly type       = 'Oven';
    readonly enumber    = 'HB678GBS6B/50';
    readonly brand      = 'Siemens';

    // Appliance status
    readonly status: StatusKV[] = [{
        key: 'BSH.Common.Status.LocalControlActive',
        value: false,
        name: 'Local operation active'
    }, {
        key: 'BSH.Common.Status.OperationState',
        value: OperationState.Ready,
        name: 'Operation state'
    }, {
        key: 'BSH.Common.Status.RemoteControlActive',
        value: true,
        name: 'Settings via app'
    }];

    // Appliance settings
    readonly settings: SettingKV[] = [{
        key: 'BSH.Common.Setting.ChildLock',
        type: 'Boolean',
        value: false,
        name: 'Childproof lock'
    }, {
        key: 'BSH.Common.Setting.PowerState',
        type: 'BSH.Common.EnumType.PowerState',
        value: PowerState.On,
        name: 'Power status',
        constraints: {
            allowedvalues: [ PowerState.MainsOff, PowerState.Off, PowerState.On, PowerState.Standby ],
            displayvalues: [ 'Off', 'Off', 'On', 'Standby' ],
            default: PowerState.On,
            access: 'readWrite'
        }
    }, {
        key: 'BSH.Common.Setting.AlarmClock',
        type: 'Int',
        value: 0,
        unit: 'seconds',
        name: 'Alarm',
        constraints: {
            access: 'readWrite'
        }
    }, {
        key: 'Cooking.Oven.Setting.SabbathMode',
        type: 'Boolean',
        value: false,
        name: 'Sabbath mode'
    }];

    // Appliance commands
    readonly commands: CommandKV[] = [{
        key: 'BSH.Common.Command.AcknowledgeEvent',
        name: 'OK'
    }];

    // Appliance programs
    readonly programs: ProgramDefinitionKV[] = [{
        key: 'Cooking.Oven.Program.HeatingMode.HotAir',
        name: 'Hot air',
        options: [{
            name: 'Cavity temperature',
            key: 'Cooking.Oven.Option.SetpointTemperature',
            constraints: { min: 30, max: 275, default: 160 },
            unit: '°C',
            type: 'Double'
        }, {
            name: 'Adjust the duration',
            key: 'BSH.Common.Option.Duration',
            constraints: { min: 1, max: 86340, default: 60 },
            unit: 'seconds',
            type: 'Int'
        }, {
            key: 'Cooking.Oven.Option.FastPreHeat',
            type: 'Boolean',
            constraints: { default: false },
            name: 'Rapid heating'
        }, {
            name: 'Start time',
            key: 'BSH.Common.Option.StartInRelative',
            constraints: { min: 0, max: 86340, default: 0 },
            unit: 'seconds',
            type: 'Int'
        }]
    }, {
        key: 'Cooking.Oven.Program.HeatingMode.TopBottomHeating',
        name: 'Top and bottom heat',
        options: [{
            name: 'Cavity temperature',
            key: 'Cooking.Oven.Option.SetpointTemperature',
            constraints: { min: 30, max: 300, default: 170 },
            unit: '°C',
            type: 'Double'
        }, {
            name: 'Adjust the duration',
            key: 'BSH.Common.Option.Duration',
            constraints: { min: 1, max: 86340, default: 60 },
            unit: 'seconds',
            type: 'Int'
        }, {
            key: 'Cooking.Oven.Option.FastPreHeat',
            type: 'Boolean',
            constraints: { default: false },
            name: 'Rapid heating'
        }, {
            name: 'Start time',
            key: 'BSH.Common.Option.StartInRelative',
            constraints: { min: 0, max: 86340, default: 0 },
            unit: 'seconds',
            type: 'Int'
        }]
    }, {
        key: 'Cooking.Oven.Program.HeatingMode.HotAirEco',
        name: 'Hot air eco',
        options: [{
            name: 'Cavity temperature',
            key: 'Cooking.Oven.Option.SetpointTemperature',
            constraints: { min: 30, max: 275, default: 160 },
            unit: '°C',
            type: 'Double'
        }, {
            name: 'Adjust the duration',
            key: 'BSH.Common.Option.Duration',
            constraints: { min: 1, max: 86340, default: 60 },
            unit: 'seconds',
            type: 'Int'
        }, {
            name: 'Start time',
            key: 'BSH.Common.Option.StartInRelative',
            constraints: { min: 0, max: 86340, default: 0 },
            unit: 'seconds',
            type: 'Int'
        }]
    }, {
        key: 'Cooking.Oven.Program.HeatingMode.TopBottomHeatingEco',
        name: 'Top and bottom heat gentle',
        options: [{
            name: 'Cavity temperature',
            key: 'Cooking.Oven.Option.SetpointTemperature',
            constraints: { min: 30, max: 300, default: 170 },
            unit: '°C',
            type: 'Double'
        }, {
            name: 'Adjust the duration',
            key: 'BSH.Common.Option.Duration',
            constraints: { min: 1, max: 86340, default: 60 },
            unit: 'seconds',
            type: 'Int'
        }, {
            name: 'Start time',
            key: 'BSH.Common.Option.StartInRelative',
            constraints: { min: 0, max: 86340, default: 0 },
            unit: 'seconds',
            type: 'Int'
        }]

    }, {
        key: 'Cooking.Oven.Program.HeatingMode.HotAirGrilling',
        name: 'Hot air grilling',
        options: [{
            name: 'Cavity temperature',
            key: 'Cooking.Oven.Option.SetpointTemperature',
            constraints: { min: 30, max: 300, default: 180 },
            unit: '°C',
            type: 'Double'
        }, {
            name: 'Adjust the duration',
            key: 'BSH.Common.Option.Duration',
            constraints: { min: 1, max: 86340, default: 60 },
            unit: 'seconds',
            type: 'Int'
        }, {
            name: 'Start time',
            key: 'BSH.Common.Option.StartInRelative',
            constraints: { min: 0, max: 86340, default: 0 },
            unit: 'seconds',
            type: 'Int'
        }]
    }, {
        key: 'Cooking.Oven.Program.HeatingMode.PizzaSetting',
        name: 'Pizza setting',
        options: [{
            name: 'Cavity temperature',
            key: 'Cooking.Oven.Option.SetpointTemperature',
            constraints: { min: 30, max: 275, default: 200 },
            unit: '°C',
            type: 'Double'
        }, {
            name: 'Adjust the duration',
            key: 'BSH.Common.Option.Duration',
            constraints: { min: 1, max: 86340, default: 60 },
            unit: 'seconds',
            type: 'Int'
        }, {
            name: 'Start time',
            key: 'BSH.Common.Option.StartInRelative',
            constraints: { min: 0, max: 86340, default: 0 },
            unit: 'seconds',
            type: 'Int'
        }]
    }, {
        key: 'Cooking.Oven.Program.HeatingMode.IntensiveHeat',
        name: 'Intensive heat',
        options: [{
            name: 'Cavity temperature',
            key: 'Cooking.Oven.Option.SetpointTemperature',
            constraints: { min: 30, max: 300, default: 190 },
            unit: '°C',
            type: 'Double'
        }, {
            name: 'Adjust the duration',
            key: 'BSH.Common.Option.Duration',
            constraints: { min: 1, max: 86340, default: 60 },
            unit: 'seconds',
            type: 'Int'
        }, {
            key: 'Cooking.Oven.Option.FastPreHeat',
            type: 'Boolean',
            constraints: { default: false },
            name: 'Rapid heating'
        }, {
            name: 'Start time',
            key: 'BSH.Common.Option.StartInRelative',
            constraints: { min: 0, max: 86340, default: 0 },
            unit: 'seconds',
            type: 'Int'
        }]
    }, {
        key: 'Cooking.Oven.Program.HeatingMode.SlowCook',
        name: 'Slow cook',
        options: [{
            name: 'Cavity temperature',
            key: 'Cooking.Oven.Option.SetpointTemperature',
            constraints: { min: 70, max: 120, default: 80 },
            unit: '°C',
            type: 'Double'
        }, {
            name: 'Adjust the duration',
            key: 'BSH.Common.Option.Duration',
            constraints: { min: 1, max: 86340, default: 60 },
            unit: 'seconds',
            type: 'Int'
        }, {
            name: 'Start time',
            key: 'BSH.Common.Option.StartInRelative',
            constraints: { min: 0, max: 86340, default: 0 },
            unit: 'seconds',
            type: 'Int'
        }]
    }, {
        key: 'Cooking.Oven.Program.HeatingMode.BottomHeating',
        name: 'Bottom heating',
        options: [{
            name: 'Cavity temperature',
            key: 'Cooking.Oven.Option.SetpointTemperature',
            constraints: { min: 30, max: 250, default: 150 },
            unit: '°C',
            type: 'Double'
        }, {
            name: 'Adjust the duration',
            key: 'BSH.Common.Option.Duration',
            constraints: { min: 1, max: 86340, default: 60 },
            unit: 'seconds',
            type: 'Int'
        }, {
            name: 'Start time',
            key: 'BSH.Common.Option.StartInRelative',
            constraints: { min: 0, max: 86340, default: 0 },
            unit: 'seconds',
            type: 'Int'
        }]
    }, {
        key: 'Cooking.Oven.Program.HeatingMode.Desiccation',
        name: 'Dry food',
        options: [{
            name: 'Cavity temperature',
            key: 'Cooking.Oven.Option.SetpointTemperature',
            constraints: { min: 30, max: 150, default: 80 },
            unit: '°C',
            type: 'Double'
        }, {
            name: 'Adjust the duration',
            key: 'BSH.Common.Option.Duration',
            constraints: { min: 1, max: 86340, default: 60 },
            unit: 'seconds',
            type: 'Int'
        }]
    }, {
        key: 'Cooking.Oven.Program.HeatingMode.KeepWarm',
        name: 'Keep warm',
        options: [{
            name: 'Cavity temperature',
            key: 'Cooking.Oven.Option.SetpointTemperature',
            constraints: { min: 60, max: 100, default: 60 },
            unit: '°C',
            type: 'Double'
        }, {
            name: 'Adjust the duration',
            key: 'BSH.Common.Option.Duration',
            constraints: { min: 1, max: 86340, default: 60 },
            unit: 'seconds',
            type: 'Int'
        }, {
            name: 'Start time',
            key: 'BSH.Common.Option.StartInRelative',
            constraints: { min: 0, max: 86340, default: 0 },
            unit: 'seconds',
            type: 'Int'
        }]
    }, {
        key: 'Cooking.Oven.Program.HeatingMode.PreheatOvenware',
        name: 'Preheat ovenware',
        options: [{
            name: 'Cavity temperature',
            key: 'Cooking.Oven.Option.SetpointTemperature',
            constraints: { min: 30, max: 70, default: 50 },
            unit: '°C',
            type: 'Double'
        }, {
            name: 'Adjust the duration',
            key: 'BSH.Common.Option.Duration',
            constraints: { min: 1, max: 86340, default: 60 },
            unit: 'seconds',
            type: 'Int'
        }, {
            name: 'Start time',
            key: 'BSH.Common.Option.StartInRelative',
            constraints: { min: 0, max: 86340, default: 0 },
            unit: 'seconds',
            type: 'Int'
        }]
    }, {
        key: 'Cooking.Oven.Program.HeatingMode.FrozenHeatupSpecial',
        name: 'CoolStart function',
        options: [{
            name: 'Cavity temperature',
            key: 'Cooking.Oven.Option.SetpointTemperature',
            constraints: { min: 30, max: 275, default: 200 },
            unit: '°C',
            type: 'Double'
        }, {
            name: 'Adjust the duration',
            key: 'BSH.Common.Option.Duration',
            constraints: { min: 1, max: 86340, default: 60 },
            unit: 'seconds',
            type: 'Int'
        }
        ]
    }];
}