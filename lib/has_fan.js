// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2020 Alexander Thoukydides

'use strict';

let Service, Characteristic;

// Add an extractor fan to an accessory
module.exports = {
    name: 'HasFan',

    // Initialise the mixin
    async init() {
        // Shortcuts to useful HAP objects
        Service = this.homebridge.hap.Service;
        Characteristic = this.homebridge.hap.Characteristic;

        // Add a fan (v2) service (before any asynchronous operations)
        this.activeService =
            service = this.accessory.getService(Service.Fanv2)
            || this.accessory.addService(Service.Fanv2, 'Fan');

        // Enable polling of selected/active programs when connected
        this.device.pollPrograms();

        // Read the fan program details
        let programs = await this.getCached('fan',
                                 () => this.device.getAvailablePrograms());
        if (!programs) throw new Error('No fan programs are supported');

        // Identify the Venting and/or Automatic programs
        // (DelatedShutOff (fan run-on) not currently supported by this plugin)
        let findProgram = key => programs.find(p => p.key == key);
        this.fanPrograms = {
            manual: findProgram('Cooking.Common.Program.Hood.Venting'),
            auto:   findProgram('Cooking.Common.Program.Hood.Automatic')
        };
        if (!this.fanPrograms.manual) throw new Error('No manual fan program');

        // Determine the supported fan speeds
        let findOption = key => {
            let option = this.fanPrograms.manual.options
                             .find(o => o.key == key);
            if (!option) return [];
            return option.constraints.allowedvalues
                         .filter(v => !v.endsWith('Off'))
                         .map(v => ({ key: key, value: v }));
        };
        let levels = {
            venting:   findOption('Cooking.Common.Option.Hood.VentingLevel'),
            intensive: findOption('Cooking.Common.Option.Hood.IntensiveLevel')
        }
        this.fanLevels = [...levels.venting, ...levels.intensive];
        if (!this.fanLevels.length) throw new Error('No fan speed levels');
        this.log('Fan suppports ' + levels.venting.length + ' venting levels + '
                 + levels.intensive.length + ' intensive levels'
                 + (this.fanPrograms.auto ? ' + auto mode' : ''));

        // Select an appropriate rotation speed step size (suitable for Siri)
        // (allow low=25%, medium=50%, and high=100% for Siri)
        this.fanLevelsPercentStep = this.fanLevels.length <= 2
                                    ? 100 / this.fanLevels.length
                                    : (this.fanLevels.length <= 4 ? 25 : 5);

        // Convert each rotation speed to a percentage
        this.fanLevels.forEach((level, index) => {
            let percent = (index + 1) * 100 / this.fanLevels.length;
            let rounded = Math.floor(percent / this.fanLevelsPercentStep)
                          * this.fanLevelsPercentStep;
            level.percent = rounded;
        });

        // Override the percentage values to match Siri
        const siriPercent = { low: 25, medium: 50, high: 100 };
        for (let siri of Object.keys(siriPercent)) {
            let percent = siriPercent[siri];
            let option = this.fromFanSpeedPercent(percent);
            let level = this.fanLevels.find(o => o.key == option.key
                                                 && o.value == option.value);
            level.siri = siri;
            level.percent = percent;
        }

        // Verify that the fan speed mapping is stable
        for (let level of this.fanLevels) {
            let option = this.fromFanSpeedPercent(level.percent);
            if (level.value != option.value) {
                this.error('Unstable fan speed mapping: ' + level.value
                           + ' -> ' + level.percent + '% -> ' + option.value);
            }
            this.log('    ' + level.percent + '% (' + level.value + ')'
                     + (level.siri ? " = Siri '" + level.siri + "'" : ''));
        }

        // Add the fan service
        this.addFan();
    },

    // Add a fan
    addFan() {
        let service = this.activeService;

        // Control the fan, reading missing parameters from the characteristics
        const { INACTIVE: OFF, ACTIVE }       = Characteristic.Active;
        const { INACTIVE, IDLE, BLOWING_AIR } = Characteristic.CurrentFanState;
        const { MANUAL, AUTO }                = Characteristic.TargetFanState;
        let setFanProxy = (options) => {
            // Read missing values
            let read = (option, characteristic) => {
                return option === undefined
                    ? service.getCharacteristic(characteristic).value
                    : option;
            }
            let active  = read(options.active,  Characteristic.Active);
            let auto    = read(options.auto,    Characteristic.TargetFanState);
            let percent = read(options.percent, Characteristic.RotationSpeed);

            // Configure the fan
            if (auto != AUTO && percent == 0) active = INACTIVE;
            return this.setFan(active == ACTIVE, auto == AUTO, percent);
        }

        // Add the fan state characteristics
        service.getCharacteristic(Characteristic.Active)
            .on('set', this.callbackify(
                value => this.serialise(setFanProxy, { active: value })));
        service.getCharacteristic(Characteristic.CurrentFanState);
        service.getCharacteristic(Characteristic.TargetFanState)
            .setProps(this.fanPrograms.auto
                      ? { minValue: MANUAL, maxValue: AUTO,
                          validValues: [MANUAL, AUTO] }
                      : { minValue: MANUAL, maxValue: MANUAL,
                          validValues: [MANUAL]})
            .on('set', this.callbackify(
                value => this.serialise(setFanProxy, { auto: value })));

        // Add a rotation speed characteristic
        service.getCharacteristic(Characteristic.RotationSpeed)
            .setProps({ minValue: 0, maxValue: 100,
                        minStep: this.fanLevelsPercentStep })
            .on('set', this.callbackify(
                value => this.serialise(setFanProxy, { percent: value })));

        // Update the status
        let newLevel = item => {
            let percent = this.toFanSpeedPercent(item);
            if (!percent) return;
            this.log('Fan ' + percent + '%');
            service.updateCharacteristic(Characteristic.RotationSpeed, percent);
        }
        this.device.on('Cooking.Common.Option.Hood.VentingLevel', newLevel);
        this.device.on('Cooking.Common.Option.Hood.IntensiveLevel', newLevel);
        this.device.on('BSH.Common.Root.ActiveProgram', item => {
            if (!item.value) return;
            let manual = item.value == this.fanPrograms.manual.key;
            this.log('Fan ' + (manual ? 'manual' : 'automatic') + ' control');
            service.updateCharacteristic(Characteristic.TargetFanState,
                                         manual ? MANUAL : AUTO);
        });
        this.device.on('BSH.Common.Status.OperationState', item => {
            const activeStates = [
                'BSH.Common.EnumType.OperationState.Run'
            ];
            let active = activeStates.includes(item.value);
            this.log('Fan ' + (active ? 'running' : 'off'));
            service.updateCharacteristic(Characteristic.Active,
                                         active ? ACTIVE : OFF);
            service.updateCharacteristic(Characteristic.CurrentFanState,
                                         active ? BLOWING_AIR : INACTIVE);
        });
    },

    // Configure the fan for a particular mode and speed
    async setFan(active, auto, percent) {
        if (!active) {
            // Turn the fan off
            this.log('SET fan off');
            await this.device.stopProgram();
        } else if (auto) {
            // Start the automatic program
            this.log('SET fan automatic');
            await this.device.startProgram(this.fanPrograms.auto.key);
        } else {
            let option = this.fromFanSpeedPercent(percent);
            let snapPercent = this.toFanSpeedPercent(option);
            this.log('SET fan manual ' + snapPercent + '%');
            if (this.device.getItem('BSH.Common.Status.OperationState')
                == 'BSH.Common.EnumType.OperationState.Run'
                && this.device.getItem('BSH.Common.Root.ActiveProgram')
                   == this.fanPrograms.manual.key) {
                // Try changing the options for the current program
                await this.device.setActiveProgramOption(option.key,
                                                         option.value);
            }
            else {
                // Start the manual program at the requested speed
                await this.device.startProgram(this.fanPrograms.manual.key,
                                               { [option.key]: option.value });
            }
        }
    },

    // Convert from a rotation speed percentage to a program option
    fromFanSpeedPercent(percent) {
        if (!percent) throw new Error('Attempted to convert 0% to fan program');
        let index = Math.ceil(percent * this.fanLevels.length / 100) - 1;
        return this.fanLevels[index];
    },

    // Convert from a program option to a rotation speed percentage
    toFanSpeedPercent(option) {
        // Attempt to convert option to an index into the supported fan levels
        let level = this.fanLevels.find(o => o.key == option.key
                                             && o.value == option.value);
        if (!level) return 0; // (presumably FanOff or IntensiveStageOff)
        return level.percent;
    }
}
