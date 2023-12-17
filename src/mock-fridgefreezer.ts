// Homebridge plugin for Home Connect home appliances
// Copyright © 2023 Alexander Thoukydides

import { SettingKV, StatusKV } from './api-value';
import { DoorState, PowerState } from './api-value-types';
import { MockAppliance } from './mock-appliance';

// A mock FridgeFreezer (based on a simulated appliance)
// https://developer.home-connect.com/simulator/fridge-freezer
export class MockFridgeFreezer extends MockAppliance {

    // Mandatory appliance details
    readonly type       = 'FridgeFreezer';
    readonly enumber    = 'HCS05FRF1/03';
    readonly brand      = 'Siemens';

    // Appliance status
    readonly status: StatusKV[] = [{
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
    }, {
        key: 'Refrigeration.FridgeFreezer.Setting.SetpointTemperatureFreezer',
        type: 'Double',
        value: -22,
        constraints: { min: -24, max: -16, access: 'readWrite' }
    }, {
        key: 'Refrigeration.FridgeFreezer.Setting.SetpointTemperatureRefrigerator',
        type: 'Double',
        value: 3,
        constraints: { min: 2, max: 8, access: 'readWrite' }
    }, {
        key: 'Refrigeration.FridgeFreezer.Setting.SuperModeFreezer',
        type: 'Boolean',
        value: false
    }, {
        key: 'Refrigeration.FridgeFreezer.Setting.SuperModeRefrigerator',
        type: 'Boolean',
        value: false
    }];
}