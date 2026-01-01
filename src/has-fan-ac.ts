// Homebridge plugin for Home Connect home appliances
// Copyright © 2025-2026 Alexander Thoukydides

import { Characteristic, Service, WithUUID } from 'homebridge';

import { ApplianceBase } from './appliance-generic.js';
import { Constructor, assertIsDefined, assertIsNumber, formatList, plural } from './utils.js';
import { OptionKey, OptionKV } from './api-value.js';
import { ProgramKey } from './api-value-types.js';

// Simplified details of air conditioner programs
export interface ACProgram {
    auto:       boolean;
    manual:     boolean;
}

// Coalesced HomeKit fan control characteristic values
export interface UpdateFanACHCValue {
    active?:    number;
    auto?:      number;
    percent?:   number;
}

// Add an air conditioner fan to an accessory
export function HasFanAC<TBase extends Constructor<ApplianceBase>>(Base: TBase) {
    return class HasFan extends Base {

        // Accessory services
        readonly activeService: Service;

        // Supported air conditioner programs
        acPrograms = new Map<ProgramKey, ACProgram>();

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

            // Read the air conditioner program details
            const programs = await this.getCached('fan', () => this.device.getAvailablePrograms());
            if (!programs.length) throw new Error('No air conditioner programs are supported');
            const programNames = programs.map(program => program.key.replace(/^.*\./, ''));
            this.log.info(`Air conditioner supports ${plural(programs.length, 'program')}: ${formatList(programNames)}`);

            // Read the options supported by each program
            for (const program of programs) {
                const details = await this.getCached(`fan ${program.key}`, () => this.device.getAvailableProgram(program.key));
                const { options } = details;
                const supports = (option: OptionKey): boolean => Boolean(options?.some(o => o.key === option));
                this.acPrograms.set(program.key, {
                    auto:   supports('HeatingVentilationAirConditioning.AirConditioner.Option.FanSpeedMode'),
                    manual: supports('HeatingVentilationAirConditioning.AirConditioner.Option.FanSpeedPercentage')
                });
            }

            // Control the fan
            const updateHC = this.makeSerialisedObject<UpdateFanACHCValue>(value => this.updateFanHC(value));

            // Add the fan service
            this.addFan(updateHC);
        }

        // Add a fan
        addFan(updateHC: (value?: UpdateFanACHCValue) => Promise<void>): void {
            const service = this.activeService;
            const { INACTIVE: OFF, ACTIVE } = this.Characteristic.Active;
            const { INACTIVE, BLOWING_AIR } = this.Characteristic.CurrentFanState;
            const { MANUAL, AUTO }          = this.Characteristic.TargetFanState;

            // Add the fan state characteristics
            service.getCharacteristic(this.Characteristic.Active)
                .onSet(this.onSetNumber(value => updateHC({ active: value })));
            service.getCharacteristic(this.Characteristic.CurrentFanState);
            service.getCharacteristic(this.Characteristic.TargetFanState)
                .onSet(this.onSetNumber(value => updateHC(value === AUTO ? { auto: value, active: ACTIVE } : { auto: value })));
            service.getCharacteristic(this.Characteristic.RotationSpeed)
                .onSet(this.onSetNumber(value => updateHC({ percent: value })));

            // Update the status
            this.device.on('HeatingVentilationAirConditioning.AirConditioner.Option.FanSpeedMode', mode => {
                const manual = mode === 'HeatingVentilationAirConditioning.AirConditioner.EnumType.FanSpeedMode.Manual';
                this.log.info(`Fan ${manual ? 'manual' : 'automatic'} control`);
                service.updateCharacteristic(this.Characteristic.TargetFanState, manual ? MANUAL : AUTO);
            });
            this.device.on('HeatingVentilationAirConditioning.AirConditioner.Option.FanSpeedPercentage', percent => {
                this.log.info(`Fan ${percent}%`);
                service.updateCharacteristic(this.Characteristic.RotationSpeed, percent);
            });
            this.device.on('BSH.Common.Status.OperationState', () => {
                const active = this.device.isOperationState('Run');
                this.log.info(`Fan ${active ? 'running' : 'off'}`);
                service.updateCharacteristic(this.Characteristic.Active, active ? ACTIVE : OFF);
                service.updateCharacteristic(this.Characteristic.CurrentFanState, active ? BLOWING_AIR : INACTIVE);
            });
        }

        // Deferred update of Home Connect state from HomeKit characteristics
        updateFanHC({ active, auto, percent }: UpdateFanACHCValue): Promise<void> {
            // Read missing Fan service values
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
            } else {
                // Check the active or selected program capabilities
                const isActive = this.device.isOperationState('Run');
                let program = this.device.getItem(isActive ? 'BSH.Common.Root.ActiveProgram' : 'BSH.Common.Root.SelectedProgram');
                program ??= this.acPrograms.keys().next().value;
                assertIsDefined(program);
                const details = this.acPrograms.get(program);
                assertIsDefined(details);

                // Select the appropriate program options
                if (!details.manual) auto = true;
                this.log.info(`SET fan ${auto ? 'automatic' : `manual ${percent}%`}`);
                const optionsList: OptionKV[] = [];
                if (details.auto) optionsList.push({
                    key:    'HeatingVentilationAirConditioning.AirConditioner.Option.FanSpeedMode',
                    value:  auto ? 'HeatingVentilationAirConditioning.AirConditioner.EnumType.FanSpeedMode.Automatic'
                                 : 'HeatingVentilationAirConditioning.AirConditioner.EnumType.FanSpeedMode.Manual'
                });
                if (details.manual && !auto) optionsList.push({
                    key:    'HeatingVentilationAirConditioning.AirConditioner.Option.FanSpeedPercentage',
                    value:  percent
                });
                if (isActive) {
                    // Try changing the options for the current program
                    for (const { key, value } of optionsList) {
                        await this.device.setActiveProgramOption(key, value);
                    }
                } else {
                    // Start the currently selected program
                    const options = Object.fromEntries(optionsList.map(({ key, value }) => [key, value]));
                    await this.device.startProgram(program, options);
                }
            }
        }
    };
}