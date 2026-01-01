// Homebridge plugin for Home Connect home appliances
// Copyright © 2026 Alexander Thoukydides

import { ProgramDefinitionKV, SettingKV, StatusKV } from '../api-value.js';
import { DoorState, OperationState, PowerState } from '../api-value-types.js';
import { MockAppliance } from './mock-appliance.js';

// A mock Dryer (based on a simulated appliance)
// https://developer.home-connect.com/simulator/dryer
export class MockDryer extends MockAppliance {

    // Mandatory appliance details
    readonly type       = 'Dryer';
    readonly enumber    = 'HCS04DYR1/03';
    readonly brand      = 'Bosch';

    // Appliance status
    readonly status: StatusKV[] = [{
        key: 'BSH.Common.Status.RemoteControlActive',
        value: true
    }, {
        key: 'BSH.Common.Status.RemoteControlStartAllowed',
        value: false
    }, {
        key: 'BSH.Common.Status.OperationState',
        value: OperationState.Ready
    }, {
        key: 'BSH.Common.Status.DoorState',
        value: DoorState.Closed
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
        key: 'LaundryCare.Dryer.Program.Cotton',
        options: [{
            key: 'LaundryCare.Dryer.Option.DryingTarget',
            type: 'LaundryCare.Dryer.EnumType.DryingTarget',
            unit: 'enum',
            constraints: {
                allowedvalues: [
                    'LaundryCare.Dryer.EnumType.DryingTarget.IronDry',
                    'LaundryCare.Dryer.EnumType.DryingTarget.CupboardDry',
                    'LaundryCare.Dryer.EnumType.DryingTarget.CupboardDryPlus'
                ]
            }
        }]
    }, {
        key: 'LaundryCare.Dryer.Program.Synthetic',
        options: [{
            key: 'LaundryCare.Dryer.Option.DryingTarget',
            type: 'LaundryCare.Dryer.EnumType.DryingTarget',
            unit: 'enum',
            constraints: {
                allowedvalues: [
                    'LaundryCare.Dryer.EnumType.DryingTarget.IronDry',
                    'LaundryCare.Dryer.EnumType.DryingTarget.CupboardDry',
                    'LaundryCare.Dryer.EnumType.DryingTarget.CupboardDryPlus'
                ]
            }
        }]
    }, {
        key: 'LaundryCare.Dryer.Program.Mix',
        options: [{
            key: 'LaundryCare.Dryer.Option.DryingTarget',
            type: 'LaundryCare.Dryer.EnumType.DryingTarget',
            unit: 'enum',
            constraints: {
                allowedvalues: [
                    'LaundryCare.Dryer.EnumType.DryingTarget.IronDry',
                    'LaundryCare.Dryer.EnumType.DryingTarget.CupboardDry'
                ]
            }
        }]
    }];
}