// Homebridge plugin for Home Connect home appliances
// Copyright © 2023 Alexander Thoukydides

import { ProgramDefinitionKV, SettingKV, StatusKV } from '../api-value';
import { DoorState, OperationState, PowerState } from '../api-value-types';
import { MockAppliance } from './mock-appliance';

// A mock CoffeeMaker (based on a simulated appliance)
// https://developer.home-connect.com/simulator/coffee-machine
export class MockCoffeeMaker extends MockAppliance {

    // Mandatory appliance details
    readonly type       = 'CoffeeMaker';
    readonly enumber    = 'HCS06COM1/03';
    readonly brand      = 'Bosch';

    // Appliance status
    readonly status: StatusKV[] = [{
        key: 'BSH.Common.Status.RemoteControlStartAllowed',
        value: true
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
            allowedvalues: [ PowerState.On, PowerState.Standby ]
        }
    }];

    // Appliance programs
    readonly programs: ProgramDefinitionKV[] = [{
        key: 'ConsumerProducts.CoffeeMaker.Program.Beverage.Espresso',
        options: [{
            key: 'ConsumerProducts.CoffeeMaker.Option.CoffeeTemperature',
            type: 'ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature',
            unit: 'enum',
            constraints: {
                allowedvalues: [
                    'ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.88C',
                    'ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.90C',
                    'ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.92C',
                    'ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.94C',
                    'ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.95C',
                    'ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.96C'
                ]
            }
        }, {
            key: 'ConsumerProducts.CoffeeMaker.Option.BeanAmount',
            type: 'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount',
            unit: 'enum',
            constraints: {
                allowedvalues: [
                    'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.VeryMild',
                    'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.Mild',
                    'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.Normal',
                    'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.Strong',
                    'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.VeryStrong',
                    'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.DoubleShot',
                    'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.DoubleShotPlus',
                    'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.DoubleShotPlusPlus'
                ]
            }
        }, {
            key: 'ConsumerProducts.CoffeeMaker.Option.FillQuantity',
            type: 'Int',
            unit: 'ml',
            constraints: {
                min: 35,
                max: 60,
                stepsize: 5
            }
        }]
    }, {
        key: 'ConsumerProducts.CoffeeMaker.Program.Beverage.EspressoMacchiato',
        options: [{
            key: 'ConsumerProducts.CoffeeMaker.Option.CoffeeTemperature',
            type: 'ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature',
            unit: 'enum',
            constraints: {
                allowedvalues: [
                    'ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.88C',
                    'ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.90C',
                    'ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.92C',
                    'ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.94C',
                    'ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.95C',
                    'ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.96C'
                ]
            }
        }, {
            key: 'ConsumerProducts.CoffeeMaker.Option.BeanAmount',
            type: 'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount',
            unit: 'enum',
            constraints: {
                allowedvalues: [
                    'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.VeryMild',
                    'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.Mild',
                    'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.Normal',
                    'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.Strong',
                    'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.VeryStrong',
                    'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.DoubleShot',
                    'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.DoubleShotPlus',
                    'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.DoubleShotPlusPlus'
                ]
            }
        }, {
            key: 'ConsumerProducts.CoffeeMaker.Option.FillQuantity',
            type: 'Int',
            unit: 'ml',
            constraints: {
                min: 40,
                max: 60,
                stepsize: 10
            }
        }]
    }, {
        key: 'ConsumerProducts.CoffeeMaker.Program.Beverage.Coffee',
        options: [{
            key: 'ConsumerProducts.CoffeeMaker.Option.CoffeeTemperature',
            type: 'ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature',
            unit: 'enum',
            constraints: {
                allowedvalues: [
                    'ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.88C',
                    'ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.90C',
                    'ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.92C',
                    'ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.94C',
                    'ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.95C',
                    'ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.96C'
                ]
            }
        }, {
            key: 'ConsumerProducts.CoffeeMaker.Option.BeanAmount',
            type: 'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount',
            unit: 'enum',
            constraints: {
                allowedvalues: [
                    'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.VeryMild',
                    'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.Mild',
                    'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.Normal',
                    'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.Strong',
                    'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.VeryStrong',
                    'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.DoubleShot',
                    'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.DoubleShotPlus',
                    'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.DoubleShotPlusPlus'
                ]
            }
        }, {
            key: 'ConsumerProducts.CoffeeMaker.Option.FillQuantity',
            type: 'Int',
            unit: 'ml',
            constraints: {
                min: 60,
                max: 250,
                stepsize: 10
            }
        }]
    }, {
        key: 'ConsumerProducts.CoffeeMaker.Program.Beverage.Cappuccino',
        options: [{
            key: 'ConsumerProducts.CoffeeMaker.Option.CoffeeTemperature',
            type: 'ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature',
            unit: 'enum',
            constraints: {
                allowedvalues: [
                    'ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.88C',
                    'ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.90C',
                    'ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.92C',
                    'ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.94C',
                    'ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.95C',
                    'ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.96C'
                ]
            }
        }, {
            key: 'ConsumerProducts.CoffeeMaker.Option.BeanAmount',
            type: 'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount',
            unit: 'enum',
            constraints: {
                allowedvalues: [
                    'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.VeryMild',
                    'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.Mild',
                    'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.Normal',
                    'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.Strong',
                    'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.VeryStrong',
                    'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.DoubleShot',
                    'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.DoubleShotPlus',
                    'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.DoubleShotPlusPlus'
                ]
            }
        }, {
            key: 'ConsumerProducts.CoffeeMaker.Option.FillQuantity',
            type: 'Int',
            unit: 'ml',
            constraints: {
                min: 100,
                max: 300,
                stepsize: 20
            }
        }]
    }, {
        key: 'ConsumerProducts.CoffeeMaker.Program.Beverage.LatteMacchiato',
        'options': [{
            'key': 'ConsumerProducts.CoffeeMaker.Option.CoffeeTemperature',
            'type': 'ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature',
            'unit': 'enum',
            'constraints': {
                'allowedvalues': [
                    'ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.88C',
                    'ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.90C',
                    'ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.92C',
                    'ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.94C',
                    'ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.95C',
                    'ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.96C'
                ]
            }
        }, {
            'key': 'ConsumerProducts.CoffeeMaker.Option.BeanAmount',
            'type': 'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount',
            'unit': 'enum',
            'constraints': {
                'allowedvalues': [
                    'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.VeryMild',
                    'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.Mild',
                    'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.Normal',
                    'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.Strong',
                    'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.VeryStrong',
                    'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.DoubleShot',
                    'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.DoubleShotPlus',
                    'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.DoubleShotPlusPlus'
                ]
            }
        }, {
            'key': 'ConsumerProducts.CoffeeMaker.Option.FillQuantity',
            'type': 'Int',
            'unit': 'ml',
            'constraints': {
                'min': 200,
                'max': 400,
                'stepsize': 20
            }
        }]
    }, {
        key: 'ConsumerProducts.CoffeeMaker.Program.Beverage.CaffeLatte',
        'options': [{
            'key': 'ConsumerProducts.CoffeeMaker.Option.CoffeeTemperature',
            'type': 'ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature',
            'unit': 'enum',
            'constraints': {
                'allowedvalues': [
                    'ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.88C',
                    'ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.90C',
                    'ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.92C',
                    'ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.94C',
                    'ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.95C',
                    'ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.96C'
                ]
            }
        }, {
            'key': 'ConsumerProducts.CoffeeMaker.Option.BeanAmount',
            'type': 'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount',
            'unit': 'enum',
            'constraints': {
                'allowedvalues': [
                    'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.VeryMild',
                    'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.Mild',
                    'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.Normal',
                    'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.Strong',
                    'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.VeryStrong',
                    'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.DoubleShot',
                    'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.DoubleShotPlus',
                    'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.DoubleShotPlusPlus'
                ]
            }
        }, {
            'key': 'ConsumerProducts.CoffeeMaker.Option.FillQuantity',
            'type': 'Int',
            'unit': 'ml',
            'constraints': {
                'min': 100,
                'max': 400,
                'stepsize': 20
            }
        }]
    }];
}