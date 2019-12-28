// Homebridge plugin for Home Connect home appliances
// Copyright © 2019 Alexander Thoukydides

'use strict';

let Service, Characteristic;

// Add an extractor fan to an accessory
module.exports = {
    init() {
        // Shortcuts to useful HAP objects
        Service = this.homebridge.hap.Service;
        Characteristic = this.homebridge.hap.Characteristic;

        // Add a fan (v2) service
        this.fanService =
            this.accessory.getService(Service.Fanv2)
            || this.accessory.addService(Service.Fanv2, this.name);
        const { INACTIVE: OFF, ACTIVE } = Characteristic.Active;
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
        const { INACTIVE, IDLE, BLOWING_AIR } = Characteristic.CurrentFanState;
        this.fanService.getCharacteristic(Characteristic.CurrentFanState);

        // Add a target fan state characteristic
        const { MANUAL, AUTO } = Characteristic.TargetFanState;
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
}
