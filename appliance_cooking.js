// Homebridge plugin for Home Connect home appliances
// Copyright © 2019 Alexander Thoukydides

'use strict';

const ApplianceGeneric = require('./appliance_generic.js');

let Service, Characteristic;

// A Homebridge accessory for a Home Connect coffee maker
module.exports.CoffeeMaker = class ApplianceCoffeeMaker
                           extends ApplianceGeneric {

    // Initialise an appliance
    constructor(...args) {
        super(...args);

        // Customise the appliance as a coffee maker
        this.addPowerOff('BSH.Common.EnumType.PowerState.Standby');
        this.addDoor();
        this.addProgramRemainingTime();
        this.addOperationState({ hasError: true });
    }
}

// A Homebridge accessory for a Home Connect hob (cooktop)
module.exports.Hob = class ApplianceHob
                   extends ApplianceGeneric {

    // Initialise an appliance
    constructor(...args) {
        super(...args);

        // Customise the appliance as a hob (cooktop)
        // (Home Connect requires local power control of hobs)
        this.addEvents({
            'BSH.Common.Event.ProgramFinished':     'program finished',
            'BSH.Common.Event.AlarmClockElapsed':   'timer finished',
            'Cooking.Oven.Event.PreheatFinished':   'preheat finished'
        });
        this.addOperationState({ hasError: true });
    }
}

// A Homebridge accessory for a Home Connect hood
module.exports.Hood = class ApplianceHood
                    extends ApplianceGeneric {

    // Initialise an appliance
    constructor(...args) {
        super(...args);

        // Shortcuts to useful HAP objects
        Service = this.homebridge.hap.Service;
        Characteristic = this.homebridge.hap.Characteristic;

        // Customise the appliance as a hood
        this.addPowerOff('BSH.Common.EnumType.PowerState.Off');
        this.addEvents({
            'BSH.Common.Event.ProgramFinished':     'program finished'
        });
        this.addProgramRemainingTime();
        this.addOperationState();
        this.addFan();

        // Add a functional light
        // (Home Connect hoods also have an ambient light)
        this.addLight('functional light', {
            on:         'Cooking.Common.Setting.Lighting',
            brightness: 'Cooking.Common.Setting.LightingBrightness'
        });
    }

    // Add an extractor fan
    addFan() {
        this.fanService =
            this.accessory.getService(Service.Fanv2)
            || this.accessory.addService(Service.Fanv2, this.name);
        const OFF      = Characteristic.Active.INACTIVE;
        const ACTIVE   = Characteristic.Active.ACTIVE;
        let auto, speed;
        this.fanService.getCharacteristic(Characteristic.Active)
            .on('set', this.callbackify(async value => {
                if (value == ACTIVE) {
                    // Turn the fan on
                    let program = auto
                                  ? 'Cooking.Common.Program.Hood.Automatic'
                                  : 'Cooking.Common.Program.Hood.Venting';
                    this.log('SET Fan ' + (auto ? 'automatic' : 'manual'));
                    await this.device.startProgram(program, {
                        'Cooking.Common.Option.Hood.IntensiveLevel': speed
                    });
                } else {
                    // Turn the fan off
                    this.log('SET fan off');
                    await this.device.stopProgram();
                }
            }));

        // Add a current fan state characteristic
        const INACTIVE    = Characteristic.CurrentFanState.INACTIVE;
        const IDLE        = Characteristic.CurrentFanState.IDLE;
        const BLOWING_AIR = Characteristic.CurrentFanState.BLOWING_AIR;
        this.fanService.getCharacteristic(Characteristic.CurrentFanState);

        // Add a target fan state characteristic
        const MANUAL = Characteristic.TargetFanState.MANUAL;
        const AUTO   = Characteristic.TargetFanState.AUTO;
        this.fanService.getCharacteristic(Characteristic.TargetFanState)
            .on('set', this.callbackify(value => {
                auto = value == AUTO;
            }));

        // Add a rotation speed characteristic
        // HERE - Should read the supported program options
        const speeds = [
            'Cooking.Hood.EnumType.Stage.FanOff',
            'Cooking.Hood.EnumType.Stage.FanStage01',
            'Cooking.Hood.EnumType.Stage.FanStage02',
            'Cooking.Hood.EnumType.Stage.FanStage03',
            'Cooking.Hood.EnumType.Stage.FanStage04',
            'Cooking.Hood.EnumType.Stage.FanStage05'
        ];
        let step = 100 / (speeds.length - 1);
        this.fanService.getCharacteristic(Characteristic.RotationSpeed)
            .setProps({ minValue: 0, maxValue: 100, minStep: step })
            .on('set', this.callbackify(async value => {
                let index = Math.round(value * (speeds.length - 1) / 100);
                speed = speeds[index];
                let percent = index * 100 / (speeds.length - 1);
                this.log('SET fan ' + Math.round(percent) + '%');
                await this.device.setActiveProgramOption(
                    'Cooking.Common.Option.Hood.VentingLevel', speed);
            }));

        // Update the status
        this.device.on('Cooking.Common.Option.Hood.VentingLevel', item => {
            // Map to a percentage rotation speed
            speed = item.value;
            let index = speeds.findIndex(speed);
            if (index == -1)
                return this.error('Unsupported VentingLevel: ' + speed);
            let percent = index * 100 / (speeds.length - 1);
            this.log('Fan ' + Math.round(percent) + '%');
            this.fanService.updateCharacteristic(Characteristic.RotationSpeed,
                                                 percent);
        });
        this.device.on('BSH.Common.Root.ActiveProgram', item => {
            switch (item.value) {
            case 'Cooking.Common.Program.Hood.Automatic':
            case 'Cooking.Common.Program.Hood.DelayedShutOff':
                this.log('Fan automatic or run-on');
                auto = true;
                break;
            case 'Cooking.Common.Program.Hood.Venting':
            default:
                this.log('Fan manual control');
                auto = false;
            }
            this.fanService.updateCharacteristic(Characteristic.TargetFanState,
                                                 auto ? AUTO : MANUAL);
        });
        this.device.on('BSH.Common.Status.OperationState', item => {
            let run;
            switch (item.value) {
            case 'BSH.Common.EnumType.OperationState.Run':
                this.log('Fan running');
                run = true;
                break;
            case 'BSH.Common.EnumType.OperationState.Inactive':
            default:
                this.log('Fan inactive');
                run = false;
                break;
            }
            this.fanService.updateCharacteristic(Characteristic.Active,
                                                 run ? ACTIVE : OFF);
            this.fanService.updateCharacteristic(Characteristic.CurrentFanState,
                                                 run ? BLOWING_AIR : INACTIVE);
        });
    }

    // Add a light
    addLight(type, settings) {
        // Add a Lightbulb service
        this.lightService =
            this.accessory.getServiceByUUIDAndSubType(Service.Lightbulb, type)
            || this.accessory.addService(Service.Lightbulb,
                                         this.name + ' ' + type, type);

        // Update whether the light is on or off
        this.device.on(settings.on, item => {
            this.log('Light ' + type + ' ' + (item.value ? 'on' : 'off'));
            this.lightService.updateCharacteristic(Characteristic.On,
                                                   item.value);
        });
        this.lightService.getCharacteristic(Characteristic.On)
            .on('set', this.callbackify(async value => {
                this.log('SET Light ' + type + ' ' + (value ? 'on' : 'off'));
                await this.device.setSetting(settings.on, value);
            }));

        // Update the brightness
        // HERE - Should check that brightness is supported and its range
        this.device.on(settings.brightness, item => {
            let percent = Math.round(item.value);
            this.log('Light ' + type + ' ' + percent + '% brightness');
            this.lightService.updateCharacteristic(Characteristic.Brightness,
                                                   percent);
        });
        this.lightService.getCharacteristic(Characteristic.Brightness)
            .setProps({ minValue: 10, maxValue: 100 })
            .on('set', this.callbackify(async value => {
                this.log('SET Light ' + type + ' ' + value + '% brightness');
                await this.device.setSetting(settings.brightness, value);
            }));
    }
}

// A Homebridge accessory for a Home Connect oven
module.exports.Oven = class ApplianceOven
                    extends ApplianceGeneric {

    // Initialise an appliance
    constructor(...args) {
        super(...args);

        // Customise the appliance as an oven
        this.addPowerOff('BSH.Common.EnumType.PowerState.Standby');
        this.addDoor();
        this.addEvents({
            'BSH.Common.Event.ProgramFinished':     'program finished',
            'BSH.Common.Event.AlarmClockElapsed':   'timer finished',
            'Cooking.Oven.Event.PreheatFinished':   'preheat finished'
        });
        this.addProgramRemainingTime();
        this.addOperationState({ hasError: true });
    }
}
