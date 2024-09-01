// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2023 Alexander Thoukydides

import { Characteristic, Service, WithUUID } from 'homebridge';

import { ApplianceBase } from './appliance-generic';
import { Constructor, assertIsDefined, assertIsNumber } from './utils';
import { OptionDefinitionKV, OptionKey, OptionValue } from './api-value';
import { ProgramKey } from './api-value-types';

// Extractor fan programs
const FAN_PROGRAM_MANUAL: ProgramKey = 'Cooking.Common.Program.Hood.Venting';
const FAN_PROGRAM_AUTO:   ProgramKey = 'Cooking.Common.Program.Hood.Automatic';

// A single extractor fan speed
export interface FanLevel<Key extends OptionKey = OptionKey> {
    key:        Key;
    value:      OptionValue<Key>;
}

// Extractor fan speed with mapping to HomeKit speed
export interface FanLevelPercent<Key extends OptionKey = OptionKey> extends FanLevel<Key> {
    percent:    number;
    siri?:      string;
}

// Coalesced HomeKit fan control characteristic values
export interface UpdateFanHCValue {
    active?:    number;
    auto?:      number;
    percent?:   number;
}

// Add an extractor fan to an accessory
export function HasFan<TBase extends Constructor<ApplianceBase>>(Base: TBase) {
    return class HasFan extends Base {

        // Accessory services
        readonly activeService: Service;

        // Does the extractor fan support automatic speed control
        fanSupportsAuto?: boolean;

        // Manual control fan speeds
        fanLevels: FanLevelPercent[] = [];
        fanPercentStep = 0;

        // Mixin constructor
        constructor(...args: any[]) {
            super(...args as ConstructorParameters<TBase>);

            // Add a fan (v2) service (instead of the usual HasActive service)
            this.activeService = this.makeService(this.Service.Fanv2, 'Fan');

            // Continue initialisation asynchronously
            this.asyncInitialise('Fan', this.initHasFan());
        }

        // Asynchronous initialisation
        async initHasFan(): Promise<void> {
            // Enable polling of selected/active programs when connected
            this.device.pollPrograms();

            // Read the fan program details
            const programs = await this.getCached('fan', () => this.device.getAvailablePrograms());
            if (!programs.length) throw new Error('No fan programs are supported');

            // Check which programs are supported by the extractor fan
            // (DelayedShutOff (fan run-on) is not supported by this plugin)
            const supportsProgram = (key: ProgramKey): boolean => programs.some(program => program.key === key);
            const supportsManual = supportsProgram(FAN_PROGRAM_MANUAL);
            this.fanSupportsAuto = supportsProgram(FAN_PROGRAM_AUTO);
            if (!supportsManual) throw new Error('No manual fan program');

            // Read the options supported by the manual fan program
            const manualProgram = await this.getCached(
                'fan manual program', () => this.device.getAvailableProgram(FAN_PROGRAM_MANUAL));

            // Determine the supported fan speeds
            const getOption = <Key extends OptionKey>(key: Key, excludeOff: OptionValue<Key>): FanLevel<Key>[] => {
                const manualOptions = manualProgram.options ?? [];
                const option = manualOptions.find(o => o.key === key) as OptionDefinitionKV<Key> | undefined;
                const values = option?.constraints?.allowedvalues ?? [];
                return values.filter(value => value !== excludeOff).map(value => ({ key, value }));
            };
            const levels = {
                venting:   getOption('Cooking.Common.Option.Hood.VentingLevel',
                                     'Cooking.Hood.EnumType.Stage.FanOff'),
                intensive: getOption('Cooking.Common.Option.Hood.IntensiveLevel',
                                     'Cooking.Hood.EnumType.IntensiveStage.IntensiveStageOff')
            };
            const fanLevels = [...levels.venting, ...levels.intensive];
            if (!fanLevels.length) throw new Error('No fan speed levels');
            this.log.info(`Fan supports ${levels.venting.length} venting levels + ${levels.intensive.length} intensive levels`
                          + (this.fanSupportsAuto ? ' + auto mode' : ''));

            // Select an appropriate rotation speed step size (suitable for Siri)
            // (allow low=25%, medium=50%, and high=100% for Siri)
            this.fanPercentStep = fanLevels.length <= 2 ? 100 / fanLevels.length
                                                              : (fanLevels.length <= 4 ? 25 : 5);

            // Convert each rotation speed to a percentage
            this.fanLevels = fanLevels.map((level, index) => {
                const percent = (index + 1) * 100 / fanLevels.length;
                const rounded = Math.floor(percent / this.fanPercentStep) * this.fanPercentStep;
                return { key: level.key, value: level.value, percent: rounded };
            });

            // Tweak the percentage values to match Siri
            const siriPercent: Record<string, number> = { low: 25, medium: 50, high: 100 };
            for (const [siri, percent] of Object.entries(siriPercent)) {
                const option = this.fromFanSpeedPercent(percent);
                const level = this.fanLevels.find(o => o.key === option.key && o.value === option.value);
                assertIsDefined(level);
                Object.assign(level, { siri, percent });
            }

            // Verify that the fan speed mapping is stable
            for (const level of this.fanLevels) {
                const option = this.fromFanSpeedPercent(level.percent);
                if (level.value !== option.value) {
                    this.log.error(`Unstable fan speed mapping: ${level.value} → ${level.percent}% → ${option.value}`);
                }
                this.log.info(`    ${level.percent}% (${level.value})` + (level.siri ? ` = Siri '${level.siri}'` : ''));
            }

            // Add the fan service
            this.addFan();
        }

        // Add a fan
        addFan(): void {
            const service = this.activeService;
            const { INACTIVE: OFF, ACTIVE } = this.Characteristic.Active;
            const { INACTIVE, BLOWING_AIR } = this.Characteristic.CurrentFanState;
            const { MANUAL, AUTO }          = this.Characteristic.TargetFanState;

            // Control the fan
            const updateHC = this.makeSerialisedObject<UpdateFanHCValue>(value => this.updateFanHC(value));

            // Add the fan state characteristics
            service.getCharacteristic(this.Characteristic.Active)
                .onSet(this.onSetNumber(value => updateHC({ active: value })));
            service.getCharacteristic(this.Characteristic.CurrentFanState);
            service.getCharacteristic(this.Characteristic.TargetFanState)
                .setProps(this.fanSupportsAuto ? { minValue: MANUAL, maxValue: AUTO,   validValues: [MANUAL, AUTO] }
                                               : { minValue: MANUAL, maxValue: MANUAL, validValues: [MANUAL]})
                .onSet(this.onSetNumber(value => updateHC({ auto: value })));

            // Add a rotation speed characteristic
            service.getCharacteristic(this.Characteristic.RotationSpeed)
                .setProps({ minValue: 0, maxValue: 100, minStep: this.fanPercentStep })
                .onSet(this.onSetNumber(value => updateHC({ percent: value })));

            // Update the status
            const newLevel = <Key extends OptionKey>(key: Key, value: OptionValue<Key>): void => {
                const percent = this.toFanSpeedPercent({ key, value });
                if (!percent) return;
                this.log.info(`Fan ${percent}%`);
                service.updateCharacteristic(this.Characteristic.RotationSpeed, percent);
            };
            this.device.on('Cooking.Common.Option.Hood.VentingLevel',
                           level => { newLevel('Cooking.Common.Option.Hood.VentingLevel',   level); });
            this.device.on('Cooking.Common.Option.Hood.IntensiveLevel',
                           level => { newLevel('Cooking.Common.Option.Hood.IntensiveLevel', level); });
            this.device.on('BSH.Common.Root.ActiveProgram', programKey => {
                if (!programKey) return;
                const manual = programKey === FAN_PROGRAM_MANUAL;
                this.log.info(`Fan ${manual ? 'manual' : 'automatic'} control`);
                service.updateCharacteristic(this.Characteristic.TargetFanState, manual ? MANUAL : AUTO);
            });
            this.device.on('BSH.Common.Status.OperationState', () => {
                const active = this.device.isOperationState('Run');
                this.log.info(`Fan ${active ? 'running' : 'off'}`);
                service.updateCharacteristic(this.Characteristic.Active, active ? ACTIVE : OFF);
                service.updateCharacteristic(this.Characteristic.CurrentFanState, active ? BLOWING_AIR : INACTIVE);
            });
        }

        // Deferred update of Home Connect state from HomeKit characteristics
        updateFanHC({ active, auto, percent }: UpdateFanHCValue): Promise<void> {
            // Read missing values
            const read = (characteristic: WithUUID<new () => Characteristic>): number => {
                const value = this.activeService.getCharacteristic(characteristic).value;
                assertIsNumber(value);
                return value;
            };
            active  ??= read(this.Characteristic.Active);
            auto    ??= read(this.Characteristic.TargetFanState);
            percent ??= read(this.Characteristic.RotationSpeed);

            // Configure the fan
            const { INACTIVE: OFF, ACTIVE } = this.Characteristic.Active;
            const { AUTO }                  = this.Characteristic.TargetFanState;
            if (auto !== AUTO && percent === 0) active = OFF;
            return this.setFan(active === ACTIVE, auto === AUTO, percent);
        }

        // Configure the fan for a particular mode and speed
        async setFan(active: boolean, auto: boolean, percent: number): Promise<void> {
            if (!active) {
                // Turn the fan off
                this.log.info('SET fan off');
                await this.device.stopProgram();
            } else if (auto) {
                // Start the automatic program
                this.log.info('SET fan automatic');
                await this.device.startProgram(FAN_PROGRAM_AUTO);
            } else {
                const option = this.fromFanSpeedPercent(percent);
                const snapPercent = this.toFanSpeedPercent(option);
                this.log.info(`SET fan manual ${snapPercent}%`);
                if (this.device.isOperationState('Run')
                    && this.device.getItem('BSH.Common.Root.ActiveProgram') === FAN_PROGRAM_MANUAL) {
                    // Try changing the options for the current program
                    await this.device.setActiveProgramOption(option.key, option.value);
                } else {
                    // Start the manual program at the requested speed
                    await this.device.startProgram(FAN_PROGRAM_MANUAL, { [option.key]: option.value });
                }
            }
        }

        // Convert from a rotation speed percentage to a program option
        fromFanSpeedPercent(percent: number): FanLevelPercent {
            if (!percent) throw new Error('Attempted to convert 0% to fan program');
            const index = Math.ceil(percent * this.fanLevels.length / 100) - 1;
            return this.fanLevels[index];
        }

        // Convert from a program option to a rotation speed percentage
        toFanSpeedPercent(option: FanLevel): number {
            const level = this.fanLevels.find(o => o.key === option.key && o.value === option.value);
            if (!level) return 0; // (presumably FanOff or IntensiveStageOff)
            return level.percent;
        }
    };
}