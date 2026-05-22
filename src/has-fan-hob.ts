// Homebridge plugin for Home Connect home appliances
// Copyright © 2026 Alexander Thoukydides

import { Characteristic, Service, WithUUID } from 'homebridge';

import { ApplianceBase } from './appliance-generic.js';
import { Constructor, assertIsDefined, assertIsNumber, plural } from './utils.js';
import { Ventilation } from './api-value-types.js';

// Ventilation fan speed with mapping to HomeKit speed
export interface VentilationLevelPercent {
    level:      Ventilation;
    percent:    number;
    siri?:      string;
}

// Coalesced HomeKit fan control characteristic values
export interface UpdateVentilationHCValue {
    active?:    number;
    percent?:   number;
}

// Add a ventilation fan to an accessory
export function HasFanHob<TBase extends Constructor<ApplianceBase>>(Base: TBase) {
    return class HasFanHob extends Base {

        // Accessory services
        readonly fanService: Service;

        // Manual control fan speeds
        fanLevels: VentilationLevelPercent[] = [];
        fanPercentStep = 0;

        // Mixin constructor
        constructor(...args: any[]) {
            super(...args as ConstructorParameters<TBase>);

            // Add a fan (v2) service for the hob ventilation
            this.fanService = this.makeService(this.Service.Fanv2, 'Fan');

            // Continue initialisation asynchronously
            this.asyncInitialise('Fan', this.initHasVentilation());
        }

        // Asynchronous initialisation
        async initHasVentilation(): Promise<void> {
            // Check whether the appliance supports ventilation fans
            const allSettings = await this.getCached('settings', () => this.device.getSettings());
            if (!allSettings.some(s => s.key === 'Cooking.Hob.Setting.Ventilation')) {
                this.log.info('Does not support integrated ventilation');
                return;
            }

            // Check the supported fan speeds
            const setting = await this.getCached(
                'ventilation', () => this.device.getSetting('Cooking.Hob.Setting.Ventilation'));
            const allLevels = setting?.constraints?.allowedvalues ?? [];
            const fanLevels = allLevels.filter(level => level !== Ventilation.Off);
            if (!fanLevels.length) throw new Error('No ventilation levels');
            this.log.info(`Fan supports ${plural(fanLevels.length, 'venting level')}`);

            // Select an appropriate rotation speed step size (suitable for Siri)
            // (allow low=25%, medium=50%, and high=100% for Siri)
            this.fanPercentStep = fanLevels.length <= 2 ? 100 / fanLevels.length
                               : (fanLevels.length <= 4 ? 25 : 5);

            // Convert each rotation speed to a percentage
            this.fanLevels = fanLevels.map((level, index) => {
                const percent = (index + 1) * 100 / fanLevels.length;
                const rounded = Math.floor(percent / this.fanPercentStep) * this.fanPercentStep;
                return { level, percent: rounded };
            });

            // Tweak the percentage values to match Siri
            const siriPercent: Record<string, number> = { low: 25, medium: 50, high: 100 };
            for (const [siri, percent] of Object.entries(siriPercent)) {
                const option = this.fromFanSpeedPercent(percent);
                const level = this.fanLevels.find(o => o.level === option.level);
                assertIsDefined(level);
                level.siri      = siri;
                level.percent   = percent;
            }

            // Verify that the fan speed mapping is stable
            for (const level of this.fanLevels) {
                const option = this.fromFanSpeedPercent(level.percent);
                if (level.level !== option.level) {
                    this.log.error(`Unstable fan speed mapping: ${level.level} → ${level.percent}% → ${option.level}`);
                }
                this.log.info(`    ${level.percent}% (${level.level})` + (level.siri ? ` = Siri '${level.siri}'` : ''));
            }

            // Control the fan
            const updateHC = this.makeSerialisedObject<UpdateVentilationHCValue>(value => this.updateFanHC(value));

            // Add the fan service
            this.addFan(updateHC);
        }

        // Add a fan
        addFan(updateHC: (value?: UpdateVentilationHCValue) => Promise<void>): void {
            const service = this.fanService;
            const { INACTIVE: OFF, ACTIVE } = this.Characteristic.Active;
            const { INACTIVE, BLOWING_AIR } = this.Characteristic.CurrentFanState;

            // Add the fan state characteristics
            service.getCharacteristic(this.Characteristic.Active)
                .onSet(this.onSetNumber(value => updateHC({ active: value })));
            service.getCharacteristic(this.Characteristic.CurrentFanState);

            // Add a rotation speed characteristic
            service.getCharacteristic(this.Characteristic.RotationSpeed)
                .setProps({ minValue: 0, maxValue: 100, minStep: this.fanPercentStep })
                .onSet(this.onSetNumber(value => updateHC({ percent: value })));

            // Update the status
            this.device.on('Cooking.Hob.Setting.Ventilation', level => {
                const percent = this.toFanSpeedPercent(level);
                const active = 0 < percent;
                this.log.info(active ? `Fan ${percent}%` : 'Fan off');
                service.updateCharacteristic(this.Characteristic.Active, active ? ACTIVE : OFF);
                service.updateCharacteristic(this.Characteristic.CurrentFanState, active ? BLOWING_AIR : INACTIVE);
                service.updateCharacteristic(this.Characteristic.RotationSpeed, percent);
            });
        }

        // Deferred update of Home Connect state from HomeKit characteristics
        async updateFanHC({ active, percent }: UpdateVentilationHCValue): Promise<void> {
            // Read missing Fan service values
            const read = (characteristic: WithUUID<new () => Characteristic>): number => {
                const value = this.fanService.getCharacteristic(characteristic).value;
                assertIsNumber(value);
                return value;
            };
            active  ??= read(this.Characteristic.Active);
            percent ??= read(this.Characteristic.RotationSpeed);

            // Configure the fan
            const { INACTIVE: OFF } = this.Characteristic.Active;
            if (active === OFF || percent === 0) {
                this.log.info('SET fan off');
                await this.device.setSetting('Cooking.Hob.Setting.Ventilation', Ventilation.Off);
            } else {
                const { level } = this.fromFanSpeedPercent(percent);
                const snapPercent = this.toFanSpeedPercent(level);
                this.log.info(`SET fan ${snapPercent}%`);
                await this.device.setSetting('Cooking.Hob.Setting.Ventilation', level);
            }
        }

        // Convert from a rotation speed percentage to a program option
        fromFanSpeedPercent(percent: number): VentilationLevelPercent {
            if (!percent) throw new Error('Attempted to convert 0% to ventilation level');
            const index = Math.ceil(percent * this.fanLevels.length / 100) - 1;
            const percentLevel = this.fanLevels[index];
            assertIsDefined(percentLevel);
            return percentLevel;
        }

        // Convert from a program option to a rotation speed percentage
        toFanSpeedPercent(level: Ventilation): number {
            const percentLevel = this.fanLevels.find(o => o.level === level);
            if (!percentLevel) return 0; // (presumably Off)
            return percentLevel.percent;
        }
    };
}