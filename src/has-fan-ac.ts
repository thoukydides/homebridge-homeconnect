// Homebridge plugin for Home Connect home appliances
// Copyright © 2025-2026 Alexander Thoukydides

import { Characteristic, Service, WithUUID } from 'homebridge';

import { setTimeout as setTimeoutP } from 'timers/promises';

import { ApplianceBase } from './appliance-generic.js';
import { Constructor, MS, assertIsDefined, assertIsNumber, formatList, plural } from './utils.js';
import { OptionValues, PowerState, ProgramKey } from './api-value-types.js';
import { ConstraintsNumber, OptionDefinitionNumber, OptionDefinitionString } from './api-types.js';

// HomeKit Target/Current Heating Cooling State (matches Characteristic values)
export enum ThermostatState {
    Off     = 0,
    Heat    = 1,
    Cool    = 2,
    Auto    = 3 // Maps to Cool for Current Heating Cooling State
}

// Coalesced HomeKit fan control characteristic values
export interface UpdateFanACHCValue {
    // Fan
    active?:        number;
    fanAuto?:       number;
    fanPercent?:    number;
    // Thermostat
    state?:         number; // = ThermostatState
    temperature?:   number; // °C
}

// Preference order of AC programs and associated Target Heating Cooling States
const THERMOSTAT_PROGRAMS = [
    ['HeatingVentilationAirConditioning.AirConditioner.Program.Fan',            ThermostatState.Off],   // All controls available
    ['HeatingVentilationAirConditioning.AirConditioner.Program.Cool',           ThermostatState.Cool],  // All controls available
    ['HeatingVentilationAirConditioning.AirConditioner.Program.Heat',           ThermostatState.Heat],  // All controls available
    ['HeatingVentilationAirConditioning.AirConditioner.Program.Auto',           ThermostatState.Auto],  // No manual fan speed
    ['HeatingVentilationAirConditioning.AirConditioner.Program.Dry',            ThermostatState.Cool],  // No manual fan speed
    ['HeatingVentilationAirConditioning.AirConditioner.Program.ActiveClean',    ThermostatState.Off]    // No fan or temperature control
] as const satisfies [ProgramKey, ThermostatState][];

// Simplified details of an air conditioner program
export interface ACProgramDetails {
    key:                ProgramKey;
    thermostatState:    ThermostatState;
    fanAuto?:           OptionDefinitionString;  // (all except ActiveClean)
    fanManual?:         OptionDefinitionNumber;  // (only Heat/Cool/Fan)
    temperature?:       OptionDefinitionNumber;  // (all except ActiveClean)
}
// Timings for switching on appliance power
const READY_TIMEOUT = 10 * MS;  // Maximum time for appliance to power on
const READY_DELAY   = 100;      // Delay before (re)checking appliance state

// Add an air conditioner fan and thermostat to an accessory
export function HasFanAC<TBase extends Constructor<ApplianceBase>>(Base: TBase) {
    return class HasFan extends Base {

        // Accessory services
        readonly activeService: Service;
        thermostatService?: Service;

        // Supported air conditioner programs in preference order
        acPrograms: ACProgramDetails[] = [];

        // Mixin constructor
        constructor(...args: any[]) {
            super(...args as ConstructorParameters<TBase>);

            // Add a fan (v2) service (instead of the usual HasActive service)
            this.activeService = this.makeService(this.Service.Fanv2, 'Fan');

            // Continue initialisation asynchronously
            this.asyncInitialise('FanAC', this.initHasFanAC());
        }

        // Asynchronous initialisation
        async initHasFanAC(): Promise<void> {
            // Enable polling of selected/active programs when connected
            this.device.pollPrograms();

            // Read the air conditioner program details
            const programs = await this.getCached('fan', () => this.device.getAvailablePrograms());
            const programsList = (programs: { key: ProgramKey }[]): string =>
                formatList(programs.map(program => program.key.replace(/^.*\./, '')));
            this.log.info(`Air conditioner supports ${plural(programs.length, 'program')}: ${programsList(programs)}`);

            // Read the options supported by each program (in preference order)
            for (const [key, thermostatState] of THERMOSTAT_PROGRAMS) {
                if (!programs.some(program => program.key === key)) continue;
                const { options } = await this.getCached(`fan ${key}`, () => this.device.getAvailableProgram(key));
                const details: ACProgramDetails = { key, thermostatState };
                for (const option of options ?? []) {
                    switch (option.key) {
                    case 'HeatingVentilationAirConditioning.AirConditioner.Option.FanSpeedMode':        details.fanAuto     = option; break;
                    case 'HeatingVentilationAirConditioning.AirConditioner.Option.FanSpeedPercentage':  details.fanManual   = option; break;
                    case 'HeatingVentilationAirConditioning.AirConditioner.Option.SetpointTemperature': details.temperature = option; break;
                    default:
                        this.log.warn(`Unexpected air conditioner option ${option.key}`);
                    }
                }
                const temperatureUnit = details.temperature?.unit;
                if (temperatureUnit !== '°C') throw new Error(`Unsupported temperature unit for program ${key}: ${temperatureUnit}`);
                this.acPrograms.push(details);
            }
            const unsupported = programs.filter(program => !THERMOSTAT_PROGRAMS.some(([key]) => key === program.key));
            if (unsupported.length) this.log.warn(`${plural(unsupported.length, 'unsupported program')}: ${programsList(unsupported)}`);
            if (!this.acPrograms.length) throw new Error('No supported air conditioner programs');

            // Coalesce HomeKit updates to control the air conditioner
            const updateHC = this.makeSerialisedObject<UpdateFanACHCValue>(value => this.updateACHC(value));

            // Add the fan service
            this.addFan(updateHC);

            // If temperature setpoint is supported then create a thermostat
            if (this.acPrograms.some(details => details.temperature)) {
                this.log.info('Air conditioner supports temperature setpoint');
                this.thermostatService = this.addThermostat(updateHC);
                this.thermostatService.addLinkedService(this.activeService);
            }
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
                .onSet(this.onSetNumber(value => updateHC(value === AUTO ? { fanAuto: value, active: ACTIVE } : { fanAuto: value })));
            service.getCharacteristic(this.Characteristic.RotationSpeed)
                .onSet(this.onSetNumber(value => updateHC({ fanPercent: value })));

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

        // Add a thermostat
        addThermostat(updateHC: (value?: UpdateFanACHCValue) => Promise<void>): Service {
            const service = this.makeService(this.Service.Thermostat, 'Thermostat');

            // Determine the superset of supported program options
            const getTemperatureConstraint = (key: keyof ConstraintsNumber): number[] =>
                this.acPrograms.map(details => details.temperature?.constraints?.[key]).filter(Boolean) as number[];
            const gcd = (x: number, y?: number): number => y ? gcd(y, x % y) : x;
            const temperatureMinValue = Math.min(...getTemperatureConstraint('min'));
            const temperatureMaxValue = Math.max(...getTemperatureConstraint('max'));
            const temperatureMinStep = getTemperatureConstraint('stepsize').reduce(gcd);

            // Add the thermostat characteristics
            service.getCharacteristic(this.Characteristic.TargetHeatingCoolingState)
                .setProps({ validValues: [...new Set(this.acPrograms.map(details => details.thermostatState))] })
                .onSet(this.onSetNumber(value => updateHC({ state: value })));
            service.getCharacteristic(this.Characteristic.TargetTemperature)
                .setProps({ minValue: temperatureMinValue, maxValue: temperatureMaxValue, minStep: temperatureMinStep })
                .onSet(this.onSetNumber(value => updateHC({ temperature: value })));

            // Update the status
            this.device.on('HeatingVentilationAirConditioning.AirConditioner.Option.SetpointTemperature', temperature => {
                this.log.info(`Setpoint temperature ${temperature}°C`);
                service.updateCharacteristic(this.Characteristic.CurrentTemperature,    temperature);
                service.updateCharacteristic(this.Characteristic.TargetTemperature,     temperature);
            });
            this.device.on('BSH.Common.Root.ActiveProgram', programKey => {
                const details = this.acPrograms.find(details => details.key === programKey);
                if (details) {
                    const { thermostatState } = details;
                    const currentState = thermostatState === ThermostatState.Auto ? ThermostatState.Cool : thermostatState;
                    this.log.info(`Target state ${ThermostatState[thermostatState]} (current state ${ThermostatState[currentState]})`);
                    service.updateCharacteristic(this.Characteristic.TargetHeatingCoolingState,     thermostatState);
                    service.updateCharacteristic(this.Characteristic.CurrentHeatingCoolingState,    currentState);

                } else {
                    this.log.info(programKey ? `Unsupported program: ${programKey}` : 'No active program');
                    service.updateCharacteristic(this.Characteristic.CurrentHeatingCoolingState,    ThermostatState.Off);
                }
            });
            return service;
        }

        // Deferred update of Home Connect state from HomeKit characteristics
        updateACHC({ active, fanAuto, fanPercent, state, temperature }: UpdateFanACHCValue): Promise<void> {
            // Read missing Fan and Thermostat service values
            const read = (service: Service, characteristic: WithUUID<new () => Characteristic>): number => {
                const value = service.getCharacteristic(characteristic).value;
                assertIsNumber(value);
                return value;
            };
            active      ??= read(this.activeService, this.Characteristic.Active);
            fanAuto     ??= read(this.activeService, this.Characteristic.TargetFanState);
            fanPercent  ??= read(this.activeService, this.Characteristic.RotationSpeed);
            if (this.thermostatService) {
                state       ??= read(this.thermostatService, this.Characteristic.TargetHeatingCoolingState);
                temperature ??= read(this.thermostatService, this.Characteristic.TargetTemperature);
            }

            // Configure the air conditioner
            const { INACTIVE: OFF, ACTIVE } = this.Characteristic.Active;
            const { AUTO }                  = this.Characteristic.TargetFanState;
            if (fanAuto !== AUTO && fanPercent === 0) active = OFF;
            return this.setAC(active === ACTIVE, fanAuto === AUTO, fanPercent, state, temperature);
        }

        // Configure the air conditioner for a particular mode and speed
        async setAC(active: boolean, auto: boolean, percent: number, state?: ThermostatState, temperature?: number): Promise<void> {
            if (!active) {
                // Turn the fan off
                this.log.info('SET A/C off');
                await this.device.stopProgram();
                return;
            }

            // If there is an active supported program then identify its details
            let program: ACProgramDetails | undefined;
            if (this.device.isOperationState('Run')) {
                const programKey = this.device.getItem('BSH.Common.Root.ActiveProgram');
                program = this.acPrograms.find(p => p.key === programKey);
            }

            // Choose the preferred program(s) for the HomeKit state
            const preferred = this.acPrograms.filter(p => state !== undefined ? state === p.thermostatState : auto || p.fanManual);

            // Keep active program if suitable, otherwise select first preferred
            if (!program || !preferred.includes(program)) program = preferred[0];
            assertIsDefined(program);
            let description = `SET program ${program.key.replace(/^.*\./, '')}`;

            // Select the appropriate program options
            const options: OptionValues = {};
            if (program.temperature && temperature !== undefined) {
                description += ` setpoint ${temperature}°C`;
                options['HeatingVentilationAirConditioning.AirConditioner.Option.SetpointTemperature'] = temperature;
            }
            if (program.fanManual && !auto) {
                description += ` fan manual ${percent}%`;
                options['HeatingVentilationAirConditioning.AirConditioner.Option.FanSpeedMode'] =
                    'HeatingVentilationAirConditioning.AirConditioner.EnumType.FanSpeedMode.Manual';
                options['HeatingVentilationAirConditioning.AirConditioner.Option.FanSpeedPercentage'] = percent;
            } else if (program.fanAuto) {
                description += ' fan automatic';
                options['HeatingVentilationAirConditioning.AirConditioner.Option.FanSpeedMode'] =
                    'HeatingVentilationAirConditioning.AirConditioner.EnumType.FanSpeedMode.Automatic';
            }
            this.log.info(description);

            // Ensure that the appliance is on before starting a program
            if (!this.device.isOperationState('Run')) {
                await this.device.setSetting('BSH.Common.Setting.PowerState', PowerState.On);
                await setTimeoutP(READY_DELAY);
                await this.device.waitOperationState(['Run'], READY_TIMEOUT);
                await setTimeoutP(READY_DELAY);
            }

            // Start the program with the requested options
            await this.device.startOrModifyProgram(program.key, options);
        }
    };
}