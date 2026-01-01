// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2026 Alexander Thoukydides

import { Perms, Service } from 'homebridge';

import { setTimeout as setTimeoutP } from 'timers/promises';

import { ApplianceBase } from './appliance-generic.js';
import { Constructor, MS, assertIsDefined, columns, formatList, plural } from './utils.js';
import { logError } from './log-error.js';
import { OptionValues, PowerState, ProgramKey } from './api-value-types.js';
import { CommandKey, OptionDefinitionKV, OptionKey, OptionValue,
         ProgramDefinitionKV } from './api-value.js';
import { Value } from './api-types.js';
import { ApplianceProgramConfig, ConfigAppliances } from './config-types.js';
import { SchemaProgramOption } from './homebridge-ui/schema-data.js';

// A program configuration that has passed sanity checks
export interface CheckedProgramConfig extends Omit<ApplianceProgramConfig, 'options'> {
    key:        ProgramKey;
    options?:   OptionValues;
}

// Relative time option keys that can be configured as absolute times
const RELATIVE_OPTION_KEY = ['BSH.Common.Option.StartInRelative', 'BSH.Common.Option.FinishInRelative'] as const;
type RelativeOptionKey<Index extends number = 0|1> = typeof RELATIVE_OPTION_KEY[Index];

// Maximum time to wait for an appliance to be ready after being switched on
const READY_TIMEOUT = 2 * 60 * MS;

// Delays when selecting programs to read their options
const READY_DELAY = 1 * MS;

// Add program support to an accessory
export function HasPrograms<TBase extends Constructor<ApplianceBase & { activeService?: Service }>>(Base: TBase) {
    return class HasPrograms extends Base {

        // Accessory services
        readonly programService: Service[] = [];

        // Details of all programs supported by the appliance
        programs: (ProgramDefinitionKV & { selected?: boolean })[] = [];

        // Does the appliance support switching the power on
        supportsPowerOn = true;

        // Ignore program selection events when reading program details
        autoSelectingPrograms = false;

        // Mixin constructor
        constructor(...args: any[]) {
            super(...args as ConstructorParameters<TBase>);

            // Continue initialisation asynchronously
            this.asyncInitialise('Programs', this.initHasPrograms());
        }

        // Asynchronous initialisation
        async initHasPrograms(): Promise<void> {
            // Enable polling of selected/active programs when connected
            this.device.pollPrograms();

            // Update the cache of programs supported by this appliance
            await this.initPrograms();
            this.device.on('BSH.Common.Root.SelectedProgram', programKey => this.updateSelectedProgram(programKey));

            // Add the appropriate services depending on the configuration
            const config = this.config.programs;
            if (config && Array.isArray(config)) {
                this.addConfiguredPrograms(config);
            } else {
                this.addAllPrograms();
            }

            // Add start, stop, pause, and resume if supported by the appliance
            if (this.activeService && this.device.hasScope('Control')) {
                // Read the list of supported commands
                const commands = await this.getCached('commands', () => this.device.getCommands());
                const supports = (key: CommandKey): boolean => commands.some(command => command.key === key);
                const supportsPause  = supports('BSH.Common.Command.PauseProgram');
                const supportsResume = supports('BSH.Common.Command.ResumeProgram');
                if (supportsPause && supportsResume) this.log.info('Can pause and resume programs');
                else if (supportsPause)              this.log.info('Can pause (but not resume) programs');
                else if (supportsResume)             this.log.info('Can resume (but not pause) programs');

                // Add start, stop, pause, and resume support as appropriate
                this.addActiveProgramControl(supportsPause, supportsResume);
            }
        }

        // Restore and populate a cache of the programs supported by the appliance
        async initPrograms(): Promise<void> {
            // Retrieve any previously cached program details
            this.programs = await this.cache.get<ProgramDefinitionKV[]>('Program details') ?? [];
            const count = Object.keys(this.programs).length;
            if (count) this.log.debug(`Restored details of ${count} programs`);

            // Check whether the appliance supports turning power on
            const setting = await this.getCached(
                'power', () => this.device.getSetting('BSH.Common.Setting.PowerState'));
            const allValues = setting?.constraints?.allowedvalues ?? [];
            this.supportsPowerOn = allValues.includes(PowerState.On);

            // Attempt to update the list of programs
            await this.device.waitConnected(true);
            await this.refreshPrograms(false);
        }

        // Refresh details of all programs
        async refreshPrograms(active = false): Promise<void> {
            const warnPrograms = (programs: ProgramDefinitionKV[], description: string): void => {
                if (!programs.length) return;
                this.log.warn(`${programs.length} of ${plural(this.programs.length, 'program')} ${description}:`);
                const fields = programs.map(program => [program.name ?? '?', `(${program.key})`]);
                for (const line of columns(fields)) this.log.warn(`    ${line}`);
            };

            try {
                // Read the list of all supported programs
                const all = await this.getCached('programs', () => this.device.getAllPrograms());
                if (!all.length) this.log.warn('Does not support any programs');

                // Merge any previous program details with the current list
                this.programs = all.map(newProgram => ({ ...this.programs.find(p => p.key === newProgram.key), ...newProgram }));

                // Read the list of currently available programs (not cached)
                const available = await this.device.getAvailablePrograms();
                const availableKeys = available.map(p => p.key);
                const unavailablePrograms = this.programs.filter(p => !availableKeys.includes(p.key));
                warnPrograms(unavailablePrograms, 'advertised by appliance currently unavailable');
                const unexpectedPrograms = available.filter(avail => !this.programs.some(p => p.key === avail.key));
                warnPrograms(unexpectedPrograms, 'available but unexpected (not included in list of all supported programs)');

                // First read programs passively (less likely to generate errors)
                const passiveKeys = availableKeys.filter(key => this.programs.some(p => p.key === key && !p.selected));
                if (passiveKeys.length) {
                    // Update details of the selected programs
                    this.log.info(`Passively reading options for ${passiveKeys.length} programs`);
                    await this.updateProgramsWithoutSelecting(passiveKeys);
                }

                // Actively read programs missing options (unless active refresh)
                const activeKeys = availableKeys.filter(key => this.programs.some(p => p.key === key && (active || !p.selected)));
                if (this.device.hasScope('Control') && activeKeys.length) {
                    // Check whether the appliance is in a suitable state
                    const problems = [];
                    if (!this.device.isOperationState('Inactive', 'Ready'))
                        problems.push('there is an active program');
                    if (this.device.getItem('BSH.Common.Status.LocalControlActive'))
                        problems.push('appliance is being controlled locally');
                    if (this.device.getItem('BSH.Common.Status.RemoteControlActive') === false)
                        problems.push('remote control is not enabled');
                    if (problems.length) {
                        this.log.warn(`Unable to actively read options for ${activeKeys.length} programs (${formatList(problems)})`);
                    } else {
                        // Update details of the selected programs
                        this.log.info(`Actively reading options for ${activeKeys.length} programs`);
                        await this.updateProgramsSelectFirst(activeKeys);
                    }
                }
            } catch (err) {
                logError(this.log, 'Reading available programs and options', err);
            } finally {
                // Regardless of what happened save the results and updated schema
                await this.savePrograms();

                // Summarise the results
                const missingPrograms = this.programs.filter(p => !p.options);
                const unselectedPrograms = this.device.hasScope('Control') ? this.programs.filter(p => p.options && !p.selected) : [];
                if (missingPrograms.length || unselectedPrograms.length) {
                    warnPrograms(missingPrograms, 'missing options (program never available to read supported options)');
                    warnPrograms(unselectedPrograms, 'could not be selected (details of supported options may be unreliable)');
                    this.missingOptionsHelp([...missingPrograms, ...unselectedPrograms]);
                } else {
                    this.log.info('Finished reading available program options');
                }
            }
        }

        // Suggest how to resolve missing program options
        missingOptionsHelp(programs: ProgramDefinitionKV[]): void {
            // General comments about the issue
            this.log.info('This could be entirely expected if some programs are never available for use'
                          + ' (e.g. some appliances require Sabbath programs to be enabled in'
                          + ' the appliance setting before they can be selected)');
            this.log.info('Unavailable programs may also be due to bugs in the appliance firmware or Home Connect API service');

            // Appliance state that might affect reading of program options
            const localControl  = this.device.getItem('BSH.Common.Status.LocalControlActive');
            const remoteControl = this.device.getItem('BSH.Common.Status.RemoteControlActive');

            // Detailed suggestions
            let stepCount = 0;
            const logStep = (step: string, subSteps: string[] = []): void => {
                this.log.info(`    ${++stepCount}.  ${step}`);
                subSteps.forEach((sub, index) => { this.log.info(`      (${String.fromCharCode('a'.charCodeAt(0) + index)})  ${sub}`); });
            };
            this.log.info('However, if these programs should be usable then these steps may help resolve the issue:');
            const preconditions = [];
            preconditions.push('Replenish any consumables that are low or empty');
            preconditions.push('Complete any required cleaning or other maintenance operations');
            preconditions.push('Ensure that the appliance has power and that no program is active');
            if (this.device.hasScope('Control') && remoteControl === false) {
                preconditions.push('Enable remote control on the appliance; this setting is currently disabled)');
            }
            if (this.device.hasScope('Control') && localControl !== undefined) {
                preconditions.push('Leave the appliance idle for a few minutes (so that it can be controlled remotely)'
                                   + (localControl ? '; it is currently being controlled locally' : ''));
            }
            logStep('Ensure that the appliance is in a suitable state to allow selection of all programs:', preconditions);
            logStep('Manually select (but do not start) each program on the appliance,'
                    + ' leaving the appliance idle for a couple of minutes after each selection:',
                    programs.map(p => p.name ?? p.key.replace(/^.*\./, '')));
            logStep('Trigger this plugin to re-read the details of all programs using one of these methods:', [
                'Restart the Homebridge instance for this plugin',
                'Invoke the HomeKit "Identify" routine for this appliance (e.g. using the "ID" button in the Eve app)'
            ]);
        }

        // Update the details of specified programs without selecting them first
        async updateProgramsWithoutSelecting(programKeys: ProgramKey[]): Promise<void> {
            for (const programKey of programKeys) {
                const details = await this.getCached(`program ${programKey}`, () => this.device.getAvailableProgram(programKey));
                this.updateCachedProgram(details, false);
            }
        }

        // Update the details of specified programs by selecting them first
        async updateProgramsSelectFirst(programKeys: ProgramKey[]): Promise<void> {
            // Remember the original appliance state
            const initialPowerState      = this.device.getItem('BSH.Common.Setting.PowerState');
            const initialSelectedProgram = this.device.getItem('BSH.Common.Root.SelectedProgram');

            // Ignore notifications about programs being selected
            this.autoSelectingPrograms = true;

            // Select each program in turn and read its details
            try {
                for (const programKey of programKeys) {
                    const details = await this.getCached(
                        `program select ${programKey}`, () => this.selectAndGetAvailableProgram(programKey));
                    this.updateCachedProgram(details, true);
                }
            } finally {
                // Best-effort attempt to restore the originally selected program
                if (initialSelectedProgram
                    && this.device.getItem('BSH.Common.Root.SelectedProgram') !== initialSelectedProgram) {
                    try { await this.device.setSelectedProgram(initialSelectedProgram); } catch { /* empty */ }
                }

                // Best-effort attempt to restore the original power state
                if (initialPowerState
                    && this.device.getItem('BSH.Common.Setting.PowerState') !== initialPowerState) {
                    try { await this.device.setSetting('BSH.Common.Setting.PowerState', initialPowerState); } catch { /* empty */ }
                }

                // Reenable monitoring of the selected program
                this.autoSelectingPrograms = false;
            }
        }

        // Update the cached details of a single program
        updateCachedProgram<Key extends ProgramKey>(details: ProgramDefinitionKV<Key>, selected: boolean): void {
            // Find the cached details for this program
            const program = this.programs.find(program => program.key === details.key);
            if (!program) throw new Error('Attempted to update unknown program');
            if (program.selected && !selected)
                throw new Error('Attempted to overwrite selected program details');

            // Update the cache for this program
            if (selected || !program.options || details.options?.length) {
                Object.assign(program, details);
                if (selected) program.selected = true;
            }
        }

        // Select a program and read its details
        async selectAndGetAvailableProgram<Key extends ProgramKey>(programKey: Key): Promise<ProgramDefinitionKV<Key>> {
            // Switch the appliance on, if necessary
            const powerState = this.device.getItem('BSH.Common.Setting.PowerState');
            if (this.supportsPowerOn && powerState && powerState !== PowerState.On) {
                this.log.warn('Switching appliance on to read program options');
                await this.device.setSetting('BSH.Common.Setting.PowerState', PowerState.On);
                await setTimeoutP(READY_DELAY);
                await this.device.waitOperationState(['Ready'], READY_TIMEOUT);
                await setTimeoutP(READY_DELAY);
            }

            // Select the program, if necessary
            if (this.device.getItem('BSH.Common.Root.SelectedProgram') !== programKey) {
                this.log.warn(`Temporarily selecting program ${programKey} to read its options`);
                await this.device.setSelectedProgram(programKey);
            }

            // Read the program's options
            return this.getAvailableProgram(programKey);
        }

        // Read the details of the currently selected program
        async getAvailableProgram<Key extends ProgramKey>(programKey: Key): Promise<ProgramDefinitionKV<Key>>  {
            // Read the program's options
            this.requireProgramReady(programKey);
            const details = await this.device.getAvailableProgram(programKey);
            this.requireProgramReady(programKey);

            // Return the program details
            return details;
        }

        // Ensure that the required program is selected and ready
        requireProgramReady(programKey: ProgramKey): void {
            // The appliance needs to be ready to read the program details reliably
            if (this.supportsPowerOn && !this.device.isOperationState('Ready'))
                throw new Error('Appliance is not ready (switched on without an active program)');
            if (!this.device.isOperationState('Inactive', 'Ready'))
                throw new Error('Appliance is not inactive or ready (without an active program)');

            // The program must be currently selected
            if (this.device.getItem('BSH.Common.Root.SelectedProgram') !== programKey)
                throw new Error(`Program ${programKey} is not selected`);
        }

        // Update the configuration schema after updating the cached programs
        async savePrograms(): Promise<void> {
            // Programs can only be selected or started with Control scope
            this.schema.setHasControl(this.device.ha.haId, this.device.hasScope('Control'));

            // Update the list of programs and their options in the schema
            this.setSchemaPrograms(this.programs);
            for (const program of this.programs) this.setSchemaProgramOptions(program);

            // Cache the results
            await this.cache.set('Program details', this.programs);
        }

        // Some appliances change their supported options when a program is selected
        async updateSelectedProgram(programKey: ProgramKey | null): Promise<void> {
            try {
                // Ignore if this plugin selected the program automatically
                if (this.autoSelectingPrograms) return;

                // Check that there is actually a program selected
                if (!programKey) {
                    this.log.info('No program selected');
                    return;
                }

                // Check that the program is actually supported
                const supported = this.programs.some(program => program.key === programKey);
                if (!supported) {
                    this.log.warn(`Selected program ${programKey} is not supported by the Home Connect API`);
                    return;
                }

                // Read and save the options for this program
                await setTimeoutP(READY_DELAY);
                const details = await this.getCached(`program select ${programKey}`, () => this.getAvailableProgram(programKey));
                this.updateCachedProgram(details, true);
                await this.savePrograms();
            } catch (err) {
                logError(this.log, 'Reading selected program options', err);
            }
        }

        // Add all supported programs
        addAllPrograms(): void {
            // Convert the API response to the configuration format
            const config = this.programs.map(program => ({
                name:   this.simpleName(program.name, program.key),
                key:    program.key
            }));

            // Add a service for each supported program
            this.addPrograms(config);
        }

        // Add the programs specified in the configuration file
        addConfiguredPrograms(config: ApplianceProgramConfig[]): void {
            // Treat a single invalid entry as being an empty array
            // (workaround for homebridge-config-ui-x / angular6-json-schema-form)
            if (config.length === 1 && !config[0]?.name && !config[0]?.key) {
                this.log.warn('Treating Invalid programs array as empty (presumably written by homebridge-config-ui-x)');
                config = [];
            }

            // Perform some validation of the configuration
            const checkedConfig: CheckedProgramConfig[] = [];
            const names: string[] = [];
            for (const program of config) {
                try {
                    // Check that a name and program key have both been provided
                    const { name, key, selectonly, options } = program;
                    if (!name.length) throw new Error("No 'name' field provided for program");
                    if (!key.length)  throw new Error("No 'key' field provided for program");

                    // Check that the name is unique
                    if (names.includes(name)) throw new Error(`Program name '${name}' is not unique`);
                    names.push(name);

                    // Check that the program key is supported by the appliance
                    this.assertIsProgramKey(key);

                    // Finally check the program options
                    const checkedOptions: OptionValues = {};

                    const checkOption = <Key extends OptionKey>([optionKey, value]: [string, string | number | boolean]): void => {
                        // Remove any option keys starting with underscore
                        if (optionKey.startsWith('_')) return;

                        // Check that the option key is supported by the program
                        this.assertIsOptionKey<Key>(key, optionKey);
                        this.assertIsOptionValue<Key>(key, optionKey, value);
                        checkedOptions[optionKey] = value;
                    };
                    for (const option of Object.entries(options ?? {})) checkOption(option);
                    checkedConfig.push({ name, key, selectonly, options: checkedOptions });
                } catch (err) {
                    const message = err instanceof Error ? err.message : String(err);
                    this.log.error(`Invalid program configuration ignored: ${message}\n`
                                   + JSON.stringify(program, null, 4));
                }
            }

            // Add a service for each configured program
            this.addPrograms(checkedConfig);
        }

        // Test whether a program key is supported by the appliance
        assertIsProgramKey<Key extends ProgramKey>(programKey: string): asserts programKey is Key {
            if (!this.programs.some(program => program.key === programKey))
                throw new Error(`Program key '${programKey}' is not supported by the appliance`);
        }

        // Test whether an option key is supported by the specified program
        assertIsOptionKey<Key extends OptionKey>(programKey: ProgramKey, optionKey: string): asserts optionKey is Key {
            const program = this.programs.find(program => program.key === programKey);
            const options = program?.options ?? [];
            if (!options.some(option => option.key === optionKey))
                throw new Error(`Option key '${optionKey}' is not valid for program '${programKey}'`);
        }

        // Test whether an option value is supported by the specified program
        assertIsOptionValue<Key extends OptionKey>(programKey: ProgramKey, optionKey: Key, value: string | number | boolean):
            asserts value is OptionValue<Key> {
            // Should really check something here...
            const program = this.programs.find(program => program.key === programKey);
            const option = (program?.options ?? []).find(option => option.key === optionKey);
            if (!option) throw new Error(`Option '${optionKey}' specified for optionless program '${programKey}'`);

            // Special case for relative time values specified as an absolute time
            const description = `for '${programKey}' option '${optionKey}'`;
            if (this.isOptionRelative(optionKey) && typeof value === 'string') {
                try {
                    value = this.timeToSeconds(value);
                } catch (err) {
                    const message = err instanceof Error ? err.message : String(err);
                    throw new Error(`Unable to parse '${value}' as a time ${description}: ${message}`);
                }
            }

            // Check whether the type is essentially correct
            const constraints = option.constraints ?? {};
            const allowedValues: string[] = constraints.allowedvalues ?? [];
            switch (option.type) {
            case 'Boolean':
                if (typeof value !== 'boolean') throw new Error(`Value '${value}' is not boolean ${description}`);
                break;
            case 'Double':
            case 'Int':
                if (typeof value !== 'number') throw new Error(`Value '${value}' is not numeric ${description}`);
                if ((constraints.min !== undefined && value < constraints.min)
                    || (constraints.max !== undefined && constraints.max < value))
                    throw new Error(`Value '${value}' is outside the permitted range ${description}`);
                break;
            case 'String':
            default: // (enumerated types)
                if (typeof value !== 'string') throw new Error(`Value '${value}' is not a string ${description}`);
                if (allowedValues.length && !allowedValues.includes(value))
                    throw new Error(`Value '${value}' is not an allowed value ${description}`);
            }
        }

        // Add a list of programs
        addPrograms(programs: CheckedProgramConfig[]): void {
            // Add a service for each program
            this.log.info(`Adding services for ${programs.length} programs`);
            const fields = programs.map(program => [program.name || '?', `(${program.key})`, program.selectonly ? 'select only' : '']);
            const descriptions = columns(fields);
            let prevService;
            for (const program of programs) {
                // Log information about this program
                this.log.info(`    ${descriptions.shift()}`);
                const options = program.options ?? {};
                for (const key of Object.keys(options) as OptionKey[])
                    this.log.info(`        ${key}=${options[key]}`);

                // Add the service for this program
                const service = this.addProgram(program);
                this.programService.push(service);

                // Link the program services
                if (this.activeService) this.activeService.addLinkedService(service);
                if (prevService) prevService.addLinkedService(service);
                prevService = service;
            }

            // Make the services read-only when programs cannot be controlled
            const allowWrite = (write: boolean): void => {
                const perms = [Perms.PAIRED_READ, Perms.NOTIFY];
                if (write) perms.push(Perms.PAIRED_WRITE);
                for (const service of this.programService) {
                    service.getCharacteristic(this.Characteristic.On).setProps({ perms });
                }
            };
            if (programs.length && !this.device.hasScope('Control')) {
                // Control of this appliance has not been authorised
                this.log.warn('Programs cannot be controlled without Control scope;'
                              + ' re-authorise with the Home Connect API to add the missing scope');
                allowWrite(false);
            } else {
                allowWrite(true);
            }
        }

        // Add a single program
        addProgram({ name, key, selectonly, options }: CheckedProgramConfig): Service {
            // Add a switch service for this program
            const service = this.makeService(this.Service.Switch, name, `program v2 ${name}`);

            // Either select the program, or start/stop the active program
            service.getCharacteristic(this.Characteristic.On)
                .onSet(this.onSetBoolean(async value => {
                    // Convert any absolute times to relative times in seconds
                    const fixedOptions: OptionValues = {};
                    const fixOption = <Key extends OptionKey>(key: Key): void => {
                        assertIsDefined(options);
                        if (this.isOptionRelative(key)) {
                            fixedOptions[key] = this.timeToSeconds(options[key] ?? 0);
                        } else {
                            fixedOptions[key] = options[key];
                        }
                    };
                    for (const key of Object.keys(options ?? {}) as OptionKey[]) fixOption(key);

                    // Select or start/stop the program as appropriate
                    if (selectonly) {
                        // Select this program and its options
                        if (value) {
                            this.log.info(`SELECT Program '${name}' (${key})`);
                            await this.device.setSelectedProgram(key, fixedOptions);
                            setImmediate(() => service.updateCharacteristic(this.Characteristic.On, false));
                        }
                    } else {
                        // Attempt to start or stop the program
                        if (value) {
                            this.log.info(`START Program '${name}' (${key})`);
                            await this.device.startProgram(key, fixedOptions);
                        } else {
                            this.log.info(`STOP Program '${name}' (${key})`);
                            await this.device.stopProgram();
                        }
                    }
                }));

            // Update the status
            const updateHK = this.makeSerialised<boolean>(active => {
                const prevActive = service.getCharacteristic(this.Characteristic.On).value;
                if (active !== prevActive) {
                    this.log.info(`Program '${name}' (${key}) ${active ? 'active' : 'inactive'}`);
                    service.updateCharacteristic(this.Characteristic.On, active);
                }
            }, false);
            this.device.on('BSH.Common.Root.ActiveProgram', programKey => updateHK(programKey === key));
            this.device.on('BSH.Common.Status.OperationState', () =>
                this.device.isOperationState('Inactive', 'Ready', 'Finished') && updateHK(false));

            // Return the service
            return service;
        }

        // Add the ability to pause and resume programs
        addActiveProgramControl(supportsPause = false, supportsResume = false): void {
            // Make the (Operation State) active On characteristic writable
            // (status update is performed by the normal Operation State handler)
            assertIsDefined(this.activeService);
            this.activeService.getCharacteristic(this.Characteristic.On)
                .setProps({ perms: [Perms.PAIRED_READ, Perms.PAIRED_WRITE, Perms.NOTIFY] })
                .onSet(this.onSetBoolean(async value => {
                    // Use pause and resume if supported in the current state
                    if (!value && supportsPause
                        && this.device.isOperationState('DelayedStart', 'Run', 'ActionRequired')) {
                        this.log.info('PAUSE Program');
                        await this.device.pauseProgram(true);
                    } else if (value && supportsResume && this.device.isOperationState('Pause')) {
                        this.log.info('RESUME Program');
                        await this.device.pauseProgram(false);
                    } else {
                        this.log.info(`${value ? 'START' : 'STOP'} Program`);
                        if (value) await this.device.startProgram();
                        else await this.device.stopProgram();
                    }
                }));
        }

        // Read and log details of all available programs
        async identify(): Promise<void> {
            await super.identify();

            // Read the supported programs and their options
            await this.refreshPrograms(true);

            // Log details of each program
            const json: ConfigAppliances = {
                [this.device.ha.haId]: {
                    programs:       this.programs.map(program => {
                        const config: ApplianceProgramConfig = {
                            name:   this.simpleName(program.name, program.key),
                            key:    program.key
                        };
                        if (this.device.hasScope('Control') && program.options) {
                            config.options = {};
                            for (const option of program.options) {
                                Object.assign(config.options, this.makeConfigOption(option));
                            }
                        }
                        return config;
                    })
                }
            };
            this.log.info(`${this.programs.length} programs supported\n` + JSON.stringify(json, null, 4));
        }

        // Convert a program option into the configuration file format
        makeConfigOption<Key extends OptionKey>(option: OptionDefinitionKV<Key>): Record<string, unknown> {
            // Pick a default value for this option
            const { type, unit } = option;
            const constraints = option.constraints ?? {};
            const { allowedvalues } = constraints;
            const value =  'value'   in option      ? option.value
                        : ('default' in constraints ? constraints.default
                        : ('min'     in constraints ? constraints.min
                        : (allowedvalues            ? allowedvalues[0]
                        : (type === 'Boolean'       ? false : null))));

            // Construct a comment describing the allowed values
            let comment;
            if (allowedvalues) {
                comment = allowedvalues;
            } else if ('min' in constraints && 'max' in constraints) {
                const { min, max, stepsize } = constraints;
                const commentParts = [];
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                if (type)     commentParts.push(type);
                commentParts.push(`[${min}..${max}]`);
                if (stepsize) commentParts.push(`step ${stepsize}`);
                if (unit)     commentParts.push(unit);
                comment = commentParts.join(' ');
            } else if (type === 'Boolean') {
                comment = [true, false];
            }

            // Alternative absolute format for relative times
            if (this.isOptionRelative(option.key) && typeof comment === 'string') {
                comment += ' OR Time HH:MM';
            }

            // Return the value and comment
            return {
                [option.key]:       value,
                ['_' + option.key]: comment
            };
        }

        // Update the configuration schema with the latest program list
        setSchemaPrograms(allPrograms: ProgramDefinitionKV[]): void {
            this.schema.setPrograms(this.device.ha.haId, allPrograms.map(program => ({
                name:   this.makeName(program.name, program.key),
                key:    program.key
            })));
        }

        // Update the configuration schema with the options for a single program
        setSchemaProgramOptions<Key extends ProgramKey>(program: ProgramDefinitionKV<Key>): void {
            const options = program.options?.map(o => this.makeSchemaOption(o)) ?? [];
            this.schema.setProgramOptions(this.device.ha.haId, program.key, options);
        }

        // Convert program options into the configuration schema format
        makeSchemaOption<Key extends OptionKey>(option: OptionDefinitionKV<Key>): SchemaProgramOption {
            // Common mappings from Home Connect to JSON schema
            const typeMap = new Map<string, SchemaProgramOption['type']>
            ([['Double', 'number'], ['Int', 'integer'], ['Boolean', 'boolean']]);
            const schema: SchemaProgramOption= {
                key:    option.key,
                name:   this.makeName(option.name, option.key),
                type:   typeMap.get(option.type) ?? 'string'
            };
            const constraints = option.constraints ?? {};
            if ('default' in constraints)              schema.default    = constraints.default;
            if ('min'     in constraints)              schema.minimum    = constraints.min;
            if ('max'     in constraints)              schema.maximum    = constraints.max;
            if (constraints.stepsize)                  schema.multipleOf = constraints.stepsize;
            if (option.unit && option.unit !== 'enum') schema.suffix     = option.unit;

            // Construct a mapping for enum and boolean types
            if (constraints.allowedvalues) {
                schema.values = constraints.allowedvalues.map((key, i) => ({
                    key:    key,
                    name:   this.makeName(constraints.displayvalues?.[i], key)
                }));
            }

            // Allow an absolute time to be specified for relative times
            if (this.isOptionRelative(option.key)) {
                schema.type = 'string';
                schema.suffix = (schema.suffix ?? '') + ' (or HH:MM absolute time)';
            }

            // Return the mapped option
            return schema;
        }

        // Select a name for a program or an option
        // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
        makeName(name: string | undefined, key: ProgramKey | Value): string {
            // Use any existing name unchanged
            if (name) return name;

            // Remove any enum prefix and insert spaces to convert from PascalCase
            return key.toString()
                .replace(/^.*\./g, '')
                .replace(/(?=\p{Lu}\p{Ll})|(?<=\p{Ll})(?=\p{Lu})/gu, ' ');
        }

        // HomeKit restricts the characters allowed in names
        simpleName(name: string | undefined, key: string): string {
            return this.makeName(name, key)
                .replace(/[^\p{L}\p{N}.' -]/ug, '')
                .replace(/^[^\p{L}\p{N}]*/u, '')
                .replace(/[^\p{L}\p{N}]*$/u, '');
        }

        // Check if an option key is a relative time
        isOptionRelative(key: OptionKey): key is RelativeOptionKey {
            const relativeOptionKeys: OptionKey[] = [...RELATIVE_OPTION_KEY];
            return relativeOptionKeys.includes(key);
        }

        // Convert an absolute time (HH:MM) to the number of seconds in the future
        timeToSeconds(value: string | number): number {
            // Assume that simple integers are already relative times in seconds
            if (typeof value === 'number') return value;
            if (/^\d+$/.test(value)) return parseInt(value, 10);

            // Otherwise attempt to parse the value as a time
            const parsed = /^(\d\d):(\d\d)$/.exec(value);
            if (!parsed) throw new Error(`Time '${value}' is not in 'HH:MM' format`);
            const [hours, minutes] = parsed.slice(1, 3).map(d => parseInt(d, 10));

            // Convert to seconds in the future
            const now = new Date();
            const then = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
            let seconds = Math.floor((then.getTime() - now.getTime()) / MS);
            if (seconds < 0) seconds += 24 * 60 * 60;
            this.log.debug(`Converted time ${value} to ${seconds} seconds`);
            return seconds;
        }
    };
}