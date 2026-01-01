// Homebridge plugin for Home Connect home appliances
// Copyright © 2026 Alexander Thoukydides

import { ProgramDefinitionKV, SettingKV, StatusKV } from '../api-value.js';
import { DoorState, OperationState, PowerState } from '../api-value-types.js';
import { MockAppliance } from './mock-appliance.js';

// A mock Washer (based on a simulated appliance)
// https://developer.home-connect.com/simulator/washer
export class MockWasher extends MockAppliance {

    // Mandatory appliance details
    readonly type       = 'Washer';
    readonly enumber    = 'HCS03WCH1/03';
    readonly brand      = 'Siemens';

    // Appliance status
    readonly status: StatusKV[] = [{
        'key': 'BSH.Common.Status.RemoteControlActive',
        'value': true
    }, {
        'key': 'BSH.Common.Status.RemoteControlStartAllowed',
        'value': true
    }, {
        'key': 'BSH.Common.Status.OperationState',
        'value': OperationState.Ready
    }, {
        'key': 'BSH.Common.Status.DoorState',
        'value': DoorState.Closed
    }];

    // Appliance settings
    readonly settings: SettingKV[] = [{
        key: 'BSH.Common.Setting.PowerState',
        type: 'BSH.Common.EnumType.PowerState',
        value: PowerState.On,
        constraints: {
            allowedvalues: [ PowerState.On ]
        }
    }];

    // Appliance programs
    readonly programs: ProgramDefinitionKV[] = [{
        'key': 'LaundryCare.Washer.Program.Cotton',
        options: [{
            key: 'LaundryCare.Washer.Option.Temperature',
            type: 'LaundryCare.Washer.EnumType.Temperature',
            unit: 'enum',
            constraints: {
                allowedvalues: [
                    'LaundryCare.Washer.EnumType.Temperature.Cold',
                    'LaundryCare.Washer.EnumType.Temperature.GC20',
                    'LaundryCare.Washer.EnumType.Temperature.GC30',
                    'LaundryCare.Washer.EnumType.Temperature.GC40',
                    'LaundryCare.Washer.EnumType.Temperature.GC50',
                    'LaundryCare.Washer.EnumType.Temperature.GC60',
                    'LaundryCare.Washer.EnumType.Temperature.GC70',
                    'LaundryCare.Washer.EnumType.Temperature.GC80',
                    'LaundryCare.Washer.EnumType.Temperature.GC90'
                ]
            }
        }, {
            key: 'LaundryCare.Washer.Option.SpinSpeed',
            type: 'LaundryCare.Washer.EnumType.SpinSpeed',
            unit: 'enum',
            constraints: {
                allowedvalues: [
                    'LaundryCare.Washer.EnumType.SpinSpeed.Off',
                    'LaundryCare.Washer.EnumType.SpinSpeed.RPM400',
                    'LaundryCare.Washer.EnumType.SpinSpeed.RPM600',
                    'LaundryCare.Washer.EnumType.SpinSpeed.RPM800',
                    'LaundryCare.Washer.EnumType.SpinSpeed.RPM1000',
                    'LaundryCare.Washer.EnumType.SpinSpeed.RPM1200',
                    'LaundryCare.Washer.EnumType.SpinSpeed.RPM1400',
                    'LaundryCare.Washer.EnumType.SpinSpeed.RPM1600'
                ]
            }
        }]
    }, {
        'key': 'LaundryCare.Washer.Program.EasyCare',
        options: [{
            key: 'LaundryCare.Washer.Option.Temperature',
            type: 'LaundryCare.Washer.EnumType.Temperature',
            unit: 'enum',
            constraints: {
                allowedvalues: [
                    'LaundryCare.Washer.EnumType.Temperature.Cold',
                    'LaundryCare.Washer.EnumType.Temperature.GC20',
                    'LaundryCare.Washer.EnumType.Temperature.GC30',
                    'LaundryCare.Washer.EnumType.Temperature.GC40',
                    'LaundryCare.Washer.EnumType.Temperature.GC50',
                    'LaundryCare.Washer.EnumType.Temperature.GC60'
                ]
            }
        }, {
            key: 'LaundryCare.Washer.Option.SpinSpeed',
            type: 'LaundryCare.Washer.EnumType.SpinSpeed',
            unit: 'enum',
            constraints: {
                allowedvalues: [
                    'LaundryCare.Washer.EnumType.SpinSpeed.Off',
                    'LaundryCare.Washer.EnumType.SpinSpeed.RPM400',
                    'LaundryCare.Washer.EnumType.SpinSpeed.RPM600',
                    'LaundryCare.Washer.EnumType.SpinSpeed.RPM800',
                    'LaundryCare.Washer.EnumType.SpinSpeed.RPM1000',
                    'LaundryCare.Washer.EnumType.SpinSpeed.RPM1200'
                ]
            }
        }]
    }, {
        'key': 'LaundryCare.Washer.Program.Mix',
        options: [{
            key: 'LaundryCare.Washer.Option.Temperature',
            type: 'LaundryCare.Washer.EnumType.Temperature',
            unit: 'enum',
            constraints: {
                allowedvalues: [
                    'LaundryCare.Washer.EnumType.Temperature.Cold',
                    'LaundryCare.Washer.EnumType.Temperature.GC20',
                    'LaundryCare.Washer.EnumType.Temperature.GC30',
                    'LaundryCare.Washer.EnumType.Temperature.GC40'
                ]
            }
        }, {
            key: 'LaundryCare.Washer.Option.SpinSpeed',
            type: 'LaundryCare.Washer.EnumType.SpinSpeed',
            unit: 'enum',
            constraints: {
                allowedvalues: [
                    'LaundryCare.Washer.EnumType.SpinSpeed.Off',
                    'LaundryCare.Washer.EnumType.SpinSpeed.RPM400',
                    'LaundryCare.Washer.EnumType.SpinSpeed.RPM600',
                    'LaundryCare.Washer.EnumType.SpinSpeed.RPM800',
                    'LaundryCare.Washer.EnumType.SpinSpeed.RPM1000',
                    'LaundryCare.Washer.EnumType.SpinSpeed.RPM1200',
                    'LaundryCare.Washer.EnumType.SpinSpeed.RPM1400',
                    'LaundryCare.Washer.EnumType.SpinSpeed.RPM1600'
                ]
            }
        }]
    }, {
        'key': 'LaundryCare.Washer.Program.DelicatesSilk',
        options: [{
            key: 'LaundryCare.Washer.Option.Temperature',
            type: 'LaundryCare.Washer.EnumType.Temperature',
            unit: 'enum',
            constraints: {
                allowedvalues: [
                    'LaundryCare.Washer.EnumType.Temperature.Cold',
                    'LaundryCare.Washer.EnumType.Temperature.GC20',
                    'LaundryCare.Washer.EnumType.Temperature.GC30',
                    'LaundryCare.Washer.EnumType.Temperature.GC40'
                ]
            }
        }, {
            key: 'LaundryCare.Washer.Option.SpinSpeed',
            type: 'LaundryCare.Washer.EnumType.SpinSpeed',
            unit: 'enum',
            constraints: {
                allowedvalues: [
                    'LaundryCare.Washer.EnumType.SpinSpeed.Off',
                    'LaundryCare.Washer.EnumType.SpinSpeed.RPM400',
                    'LaundryCare.Washer.EnumType.SpinSpeed.RPM600',
                    'LaundryCare.Washer.EnumType.SpinSpeed.RPM800'
                ]
            }
        }]
    }, {
        'key': 'LaundryCare.Washer.Program.Wool',
        options: [{
            key: 'LaundryCare.Washer.Option.Temperature',
            type: 'LaundryCare.Washer.EnumType.Temperature',
            unit: 'enum',
            constraints: {
                allowedvalues: [
                    'LaundryCare.Washer.EnumType.Temperature.Cold',
                    'LaundryCare.Washer.EnumType.Temperature.GC20',
                    'LaundryCare.Washer.EnumType.Temperature.GC30',
                    'LaundryCare.Washer.EnumType.Temperature.GC40'
                ]
            }
        }, {
            key: 'LaundryCare.Washer.Option.SpinSpeed',
            type: 'LaundryCare.Washer.EnumType.SpinSpeed',
            unit: 'enum',
            constraints: {
                allowedvalues: [
                    'LaundryCare.Washer.EnumType.SpinSpeed.Off',
                    'LaundryCare.Washer.EnumType.SpinSpeed.RPM400',
                    'LaundryCare.Washer.EnumType.SpinSpeed.RPM600',
                    'LaundryCare.Washer.EnumType.SpinSpeed.RPM800'
                ]
            }
        }]
    }];
}
