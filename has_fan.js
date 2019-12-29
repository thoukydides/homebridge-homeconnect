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

        // Read the fan program details
        this.getFanPrograms();
    },

    // Read the available programs
    async getFanPrograms() {
        let programs = await this.getCached('fan',
                                 () => this.device.getAvailablePrograms());
        if (!programs) return this.warn('Does not support fan programs');

        // Only interested in the Venting and Automatic programs
        let findProgram = key => programs.find(p => p.key == key);
        this.fanPrograms = {
            manual: findProgram('Cooking.Common.Program.Hood.Venting'),
            auto:   findProgram('Cooking.Common.Program.Hood.Automatic')
        };
        if (!this.fanPrograms.manual)
            return this.warn('Does not support manual fan program');
        let optionLevel = this.fanPrograms.manual.options.find(
            o => o.key == 'Cooking.Common.Option.Hood.VentingLevel');
        this.fanLevels = optionLevel.constraints.allowedvalues;
        if (!this.fanLevels) return this.warn('Does not support fan speeds');

        // Add the fan service
        this.addFan();
    },

    // Add a fan
    addFan() {
        // Add a fan (v2) service
        let service = this.accessory.getService(Service.Fanv2)
                      || this.accessory.addService(Service.Fanv2, this.name);

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
            return this.setFan(active == ACTIVE, auto == AUTO, percent);
        }

        // Add the fan state characteristics
        service.getCharacteristic(Characteristic.Active)
            .on('set', this.callbackify(async value => {
                return setFanProxy({ active: value });
            }));
        service.getCharacteristic(Characteristic.CurrentFanState);
        service.getCharacteristic(Characteristic.TargetFanState)
            .setProps(this.fanPrograms.auto
                      ? { minValue: MANUAL, maxValue: AUTO,
                          validValues: [MANUAL, AUTO] }
                      : { minValue: MANUAL, maxValue: MANUAL,
                          validValues: [MANUAL]})
            .on('set', this.callbackify(value => {
                return setFanProxy({ auto: value });
            }));

        // Add a rotation speed characteristic
        let step = 100 / (this.fanLevels.length - 1);
        service.getCharacteristic(Characteristic.RotationSpeed)
            .setProps({ minValue: 0, maxValue: 100, minStep: step })
            .on('set', this.callbackify(async value => {
                return setFanProxy({ percent: value });
            }));

        // Update the status
        this.device.on('Cooking.Common.Option.Hood.VentingLevel', item => {
            let percent = this.toFanSpeedPercent(item.value);
            this.log('Fan ' + Math.round(percent) + '%');
            service.updateCharacteristic(Characteristic.RotationSpeed, percent);
        });
        this.device.on('BSH.Common.Root.ActiveProgram', item => {
            const autoPrograms = [
                'Cooking.Common.Program.Hood.Automatic',
                'Cooking.Common.Program.Hood.DelayedShutOff'
            ];
            let auto = autoPrograms.includes(item.value);
            this.log('Fan ' + (auto ? 'automatic' : 'manual') + ' control');
            service.updateCharacteristic(Characteristic.TargetFanState,
                                         auto ? AUTO : MANUAL);
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
            // Start the manual program at the requested speed
            let level = this.fromFanSpeedPercent(percent);
            let snapPercent = this.toFanSpeedPercent(level);
            this.log('SET fan manual ' + Math.round(snapPercent) + '%');
            await this.device.startProgram(this.fanPrograms.manual.key, {
                'Cooking.Common.Option.Hood.VentingLevel': level
            });
        }
    },

    // Convert from a rotation speed percentage to a program
    fromFanSpeedPercent(percent) {
        let index = Math.round(percent * (this.fanLevels.length - 1) / 100);
        return this.fanLevels[index];
    },

    // Convert from a program to a rotation speed percentage
    toFanSpeedPercent(key) {
        let index = this.fanLevels.indexOf(key);
        if (index == -1) throw new Error('Unsupported VentingLevel: ' + key);
        return index * 100 / (this.fanLevels.length - 1);
    }
}
