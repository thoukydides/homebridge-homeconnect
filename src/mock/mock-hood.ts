// Homebridge plugin for Home Connect home appliances
// Copyright © 2023-2026 Alexander Thoukydides

import { CommandKV, ProgramDefinitionKV, SettingKV, StatusKV } from '../api-value.js';
import { AmbientLightColor, OperationState, PowerState } from '../api-value-types.js';
import { MockAppliance } from './mock-appliance.js';

// A mock Hood (based on a Siemens LC98KLV60/03 and a Bosch DWF97RW65/01)
// https://github.com/thoukydides/homebridge-homeconnect/issues/84#issuecomment-1095300237
// https://github.com/thoukydides/homebridge-homeconnect/issues/24#issuecomment-627238432
export class MockHood extends MockAppliance {

    // Mandatory appliance details
    readonly type       = 'Hood';
    readonly enumber    = 'DWF97RW65/01';
    readonly brand      = 'Bosch';

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
        name: 'Remote Control'
    }, {
        key: 'BSH.Common.Status.RemoteControlStartAllowed',
        value: true,
        name: 'Remote Start'
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
    }, {
        key: 'Cooking.Common.Setting.Lighting',
        type: 'Boolean',
        value: true,
        name: 'Work light'
    }, {
        key: 'Cooking.Common.Setting.LightingBrightness',
        type: 'Double',
        value: 10,
        unit: '%',
        name: 'Brightness',
        constraints: { min: 10, max: 100, access: 'readWrite' }
    }, {
        key: 'BSH.Common.Setting.AmbientLightEnabled',
        type: 'Boolean',
        value: true
    }, {
        key: 'BSH.Common.Setting.AmbientLightColor',
        type: 'BSH.Common.EnumType.AmbientLightColor',
        value: AmbientLightColor.CustomColor,
        constraints: {
            allowedvalues: [AmbientLightColor.CustomColor, AmbientLightColor.Color1]
        }
    }, {
        key: 'BSH.Common.Setting.AmbientLightCustomColor',
        type: 'String',
        value: '#00d1ff'
    }, {
        key: 'BSH.Common.Setting.AmbientLightEnabled',
        type: 'Boolean',
        value: true
    }];

    // Appliance commands
    readonly commands: CommandKV[] = [{
        key: 'BSH.Common.Command.AcknowledgeEvent',
        name: 'OK'
    }];

    // Appliance programs
    readonly programs: ProgramDefinitionKV[] = [{
        key: 'Cooking.Common.Program.Hood.Automatic',
        name: 'Automatic mode',
        options: []
    }, {
        key: 'Cooking.Common.Program.Hood.Venting',
        name: 'Fan setting',
        options: [{
            key: 'Cooking.Common.Option.Hood.VentingLevel',
            type: 'Cooking.Hood.EnumType.Stage',
            constraints: {
                allowedvalues: [
                    'Cooking.Hood.EnumType.Stage.FanStage01',
                    'Cooking.Hood.EnumType.Stage.FanStage02',
                    'Cooking.Hood.EnumType.Stage.FanStage03'
                ],
                displayvalues: [
                    '1',
                    '2',
                    '3'
                ],
                default: 'Cooking.Hood.EnumType.Stage.FanStage02'
            },
            name: 'Fan setting'
        }, {
            key: 'Cooking.Common.Option.Hood.IntensiveLevel',
            type: 'Cooking.Hood.EnumType.IntensiveStage',
            constraints: {
                allowedvalues: [
                    'Cooking.Hood.EnumType.IntensiveStage.IntensiveStage1',
                    'Cooking.Hood.EnumType.IntensiveStage.IntensiveStage2'
                ],
                displayvalues: [
                    'Boost',
                    'PowerBoost'
                ]
            },
            name: 'Intensive settings'
        }]
    }, {
        key: 'Cooking.Common.Program.Hood.DelayedShutOff',
        name: 'Fan run-on',
        options: []
    }];
}