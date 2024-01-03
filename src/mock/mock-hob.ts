// Homebridge plugin for Home Connect home appliances
// Copyright © 2023 Alexander Thoukydides

import { CommandKV, SettingKV, StatusKV } from '../api-value';
import { DoorState, OperationState, PowerState, TemperatureUnit } from '../api-value-types';
import { MockAppliance } from './mock-appliance';

// A mock Hob (based on a physical Siemens iQ700 appliance)
// https://www.siemens-home.bsh-group.com/uk/productlist/EX677LYV1E
export class MockHob extends MockAppliance {

    // Mandatory appliance details
    readonly type       = 'Hob';
    readonly enumber    = 'EX677LYV1E/06';
    readonly brand      = 'Siemens';

    // Appliance status
    readonly status: StatusKV[] = [{
        key: 'BSH.Common.Status.DoorState',
        value: DoorState.Closed,
        name: 'Door'
    }, {
        key: 'BSH.Common.Status.OperationState',
        value: OperationState.Inactive,
        name: 'Operation state'
    }, {
        key: 'BSH.Common.Status.RemoteControlActive',
        value: true,
        name: 'Remote Control'
    }, {
        key: 'BSH.Common.Status.RemoteControlStartAllowed',
        value: false,
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
        key: 'BSH.Common.Setting.AlarmClock',
        type: 'Int',
        value: 0,
        unit: 'seconds',
        name: 'Alarm',
        constraints: { min: 0, max: 5940, access: 'readWrite' }
    }, {
        key: 'BSH.Common.Setting.ChildLock',
        type: 'Boolean',
        value: false,
        name: 'Childproof lock'
    }, {
        key: 'BSH.Common.Setting.TemperatureUnit',
        type: 'BSH.Common.EnumType.TemperatureUnit',
        value: TemperatureUnit.Celsius,
        name: '°F or °C'
    }];

    // Appliance commands
    readonly commands: CommandKV[] = [{
        key: 'BSH.Common.Command.AcknowledgeEvent',
        name: 'OK'
    }];
}