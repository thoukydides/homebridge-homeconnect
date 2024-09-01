// Homebridge plugin for Home Connect home appliances
// Copyright © 2023 Alexander Thoukydides

import { Logger } from 'homebridge';

import { setImmediate as setImmediateP } from 'timers/promises';

import { ErrorResponse, HomeAppliance } from '../api-types.js';
import { CommandKV, CommandKey, EventApplianceConnectionEvent,
         EventApplianceDataEvent, EventApplianceDataKV, EventDataKV, EventKV,
         EventKey, EventMapKey, EventValue, OptionDefinitionKV, OptionKV,
         OptionKey, OptionValue, ProgramDefinitionKV, ProgramKV, ProgramsKV,
         SettingKV, SettingKey, SettingValue, StatusKV, StatusKey, StatusValue } from '../api-value.js';
import { OperationState, ProgramKey } from '../api-value-types.js';
import { Request, Response } from '../api-ua.js';
import { APIStatusCodeError } from '../api-errors.js';

// Simplified event parameters
export type MockEvent<Event extends EventMapKey = EventMapKey, Key extends EventKey<Event> = EventKey<Event>> =
    [Event, Key, EventValue<Key, Event>];

// Queue of data (STATUS, NOTIFY, or EVENT) events
export type DataEventQueue = {
    [Event in EventApplianceDataEvent]: EventDataKV<Event>[];
};

// Base class for a mock appliance
export abstract class MockAppliance {

    // Mandatory appliance details
    abstract readonly   type:       string;
    abstract readonly   enumber:    string;

    // Optional appliance details
    readonly            brand:      string                  = 'Mock';
    readonly            name?:      string;
    readonly            status:     StatusKV[]              = [];
    readonly            settings:   SettingKV[]             = [];
    readonly            commands:   CommandKV[]             = [];
    readonly            programs:   ProgramDefinitionKV[]   = [];

    // Other appliance state
    connected                                               = true;
    program?:                       ProgramKV;

    // Event stream
    readonly dataEventQueue:        DataEventQueue = { STATUS: [], NOTIFY: [], EVENT: [] };
    emitEventPromise:               Promise<EventKV>;
    emitEventResolve!:              (event: EventKV) => void;

    // Create a new API object
    constructor(readonly log: Logger) {
        this.emitEventPromise = new Promise(resolve => { this.emitEventResolve = resolve; });
    }

    // Derived identifiers for this appliance
    get vib():  string { return this.enumber.split('/')[0]; }
    get haid(): string { return `${this.brand.toUpperCase()}-${this.vib}-0123456789AB`; }

    // Get details of the mock appliance
    getAppliance(): HomeAppliance {
        return {
            brand:      this.brand,
            connected:  this.connected,
            enumber:    this.enumber,
            haId:       this.haid,
            name:       this.name ?? `Mock ${this.type}`,
            type:       this.type,
            vib:        this.vib
        };
    }

    // Get all programs
    getPrograms(): ProgramsKV {
        const getProgramPartial = (op: () => Partial<ProgramKV>): Partial<ProgramKV> => {
            try { return op(); } catch { return {}; }
        };

        return {
            programs:   this.programs.map(p => ({
                key:    p.key,
                name:   p.name,
                constraints: {
                    available:  true,
                    execution:  'selectandstart'
                }
            })),
            selected:   getProgramPartial(() => this.getSelectedProgram()),
            active:     getProgramPartial(() => this.getActiveProgram())
        };
    }

    // Get a list of the available programs
    getAvailablePrograms(): ProgramsKV {
        return this.getPrograms();
    }

    // Get the details of a specific available programs
    getAvailableProgram<PKey extends ProgramKey>(key: PKey): ProgramDefinitionKV<PKey> {
        const program = this.programs.find(p => p.key === key) as ProgramDefinitionKV<PKey> | undefined;
        if (!program) throw MockAppliance.statusCodeError(409, 'SDK.Error.UnsupportedProgram', key);
        return program;
    }

    // Get the program which is currently being executed
    getActiveProgram(): ProgramKV {
        if (this.isOperationState('Inactive', 'Ready') || !this.program)
            throw MockAppliance.statusCodeError(404, 'SDK.Error.NoProgramActive');
        return this.program;
    }

    // Start a specified program
    setActiveProgram(key: ProgramKey, options: OptionKV[] = []): void {
        this.setProgramWithDefaultOptions(key, options);
        this.emitNotifyEvent('BSH.Common.Root.ActiveProgram', key);
        this.setStatus('BSH.Common.Status.OperationState', OperationState.Run);
    }

    // Stop the active program
    stopActiveProgram(): void {
        this.setStatus('BSH.Common.Status.OperationState', OperationState.Ready);
        this.emitNotifyEvent('BSH.Common.Root.ActiveProgram', null);
    }

    // Get all options of the active program
    getActiveProgramOptions(): OptionKV[] {
        return this.getActiveProgram().options ?? [];
    }

    // Set all options of the active program
    setActiveProgramOptions(options: OptionKV[]): void {
        for (const option of options) {
            const activeOption = this.getActiveProgramOption(option.key);
            activeOption.value = option.value;
            this.emitNotifyEvent(option.key, option.value);
        }
    }

    // Get a specific option of the active program
    getActiveProgramOption<Key extends OptionKey>(key: Key): OptionKV<Key> {
        const option = this.getActiveProgramOptions().find(o => o.key === key) as OptionKV<Key> | undefined;
        if (!option) throw MockAppliance.statusCodeError(409, 'SDK.Error.UnsupportedOption', key);
        return option;
    }

    // Set a specific option of the active program
    setActiveProgramOption<Key extends OptionKey>(key: Key, value: OptionValue<Key>): void {
        const selectedOption = this.getActiveProgramOption(key);
        selectedOption.value = value;
        this.emitNotifyEvent(key, value);
    }

    // Get the program which is currently selected
    getSelectedProgram(): ProgramKV {
        if (!this.program) throw MockAppliance.statusCodeError(404, 'SDK.Error.NoProgramSelected');
        return this.program;
    }

    // Select a program
    setSelectedProgram(key: ProgramKey, options: OptionKV[]): void {
        this.setProgramWithDefaultOptions(key, options);
        this.emitNotifyEvent('BSH.Common.Root.SelectedProgram', key);
    }

    // Get all options of the selected program
    getSelectedProgramOptions(): OptionKV[] {
        return this.getSelectedProgram().options ?? [];
    }

    // Set all options of the selected program
    setSelectedProgramOptions(options: OptionKV[]): void {
        for (const option of options) {
            const selectedOption = this.getSelectedProgramOption(option.key);
            selectedOption.value = option.value;
            this.emitNotifyEvent(option.key, option.value);
        }
    }

    // Get a specific option of the selected program
    getSelectedProgramOption<Key extends OptionKey>(key: Key): OptionKV<Key> {
        const option = this.getSelectedProgramOptions().find(o => o.key === key) as OptionKV<Key> | undefined;
        if (!option) throw MockAppliance.statusCodeError(409, 'SDK.Error.UnsupportedOption', key);
        return option;
    }

    // Set a specific option of the selected program
    setSelectedProgramOption<Key extends OptionKey>(key: Key, value: OptionValue<Key>): void {
        const selectedOption = this.getSelectedProgramOption(key);
        selectedOption.value = value;
        this.emitNotifyEvent(key, value);
    }

    // Select a program and apply its initial options
    setProgramWithDefaultOptions(key: ProgramKey, options: OptionKV[] = []): void {
        // First check whether the supplied options are valid
        const programOptions = this.getAvailableProgram(key).options ?? [];
        for (const option of options) {
            const programOption = programOptions.some(o => o.key === option.key);
            if (!programOption) throw MockAppliance.statusCodeError(409, 'SDK.Error.UnsupportedOption', option.key);
        }

        // Select the program
        this.program = { key, options: [] };
        this.emitNotifyEvent('BSH.Common.Root.SelectedProgram', key);

        // Set its options
        this.program.options = programOptions.map(<Key extends OptionKey>(option: OptionDefinitionKV<Key>): OptionKV<Key> => {
            const requested = options.find(o => o.key === option.key);
            let value: unknown = requested?.value ?? option.constraints?.default;
            switch (option.type) {
            case 'Double': case 'Int':  value ??= option.constraints?.min ?? 0;     break;
            case 'Boolean':             value ??= false;                            break;
            default:                    value ??= option.constraints?.allowedvalues?.[0] ?? '';
            }
            if (value !== undefined) this.emitNotifyEvent(option.key, value as EventValue<Key>);
            return {
                key:        option.key,
                name:       option.name,
                value:      value as OptionValue<Key>,
                unit:       option.unit
            };
        });
    }

    // Get the current status
    getStatus(): StatusKV[] {
        return this.status;
    }

    // Get a specific status
    getStatusSpecific<Key extends StatusKey>(key: Key): StatusKV<Key> {
        const status = this.status.find(s => s.key === key) as StatusKV<Key> | undefined;
        if (!status) throw MockAppliance.statusCodeError(409, 'SDK.Error.UnsupportedStatus', key);
        return status;
    }

    // Set a specific status
    setStatus<Key extends StatusKey>(key: Key, value: StatusValue<Key>): void {
        this.log.debug(`Mock status ${key} <= ${String(value)}`);
        const status = this.getStatusSpecific(key);
        status.value = value;
        this.emitStatusEvent(key, value);
    }

    // Get all settings
    getSettings(): SettingKV[] {
        return this.settings;
    }

    // Get a specific setting
    getSetting<Key extends SettingKey>(key: Key): SettingKV<Key> {
        const setting = this.settings.find(s => s.key === key) as SettingKV<Key> | undefined;
        if (!setting) throw MockAppliance.statusCodeError(409, 'SDK.Error.UnsupportedSetting', key);
        return setting;
    }

    // Set a specific setting
    setSetting<Key extends SettingKey>(key: Key, value: SettingValue<Key>): void {
        this.log.debug(`Mock setting ${key} <= ${String(value)}`);
        const setting = this.getSetting(key);
        setting.value = value;
        this.emitNotifyEvent(key, value);
    }

    // Get a list of supported commands
    getCommands(): CommandKV[] {
        return this.commands;
    }

    // Issue a command
    setCommand(key: CommandKey): void {
        this.log.debug(`Mock command ${key}`);
    }

    // Emit a CONNECTED/DISCONNECTED/PAIRED/DEPAIRED event
    emitConnectedEvent(event: EventApplianceConnectionEvent): void {
        this.log.debug(`Mock event ${event}`);
        this.emitEventResolve({
            event,
            id:     this.haid
        });
    }

    // Emit a NOTIFY event
    emitNotifyEvent<Key extends OptionKey | SettingKey | EventKey<'NOTIFY'>>
    (key: Key, value: OptionValue<Key> | SettingValue<Key> | EventValue<Key>): void {
        this.emitDataEvent('NOTIFY', key, value as EventValue<Key>);
    }

    // Emit a STATUS event
    emitStatusEvent<Key extends StatusKey>(key: Key, value: StatusValue<Key>): void {
        this.emitDataEvent('STATUS', key, value as EventValue<Key>);
    }

    // Emit an EVENT event
    emitEventEvent<Key extends EventKey<'EVENT'>>(key: Key, value: EventValue<Key>): void {
        this.emitDataEvent('EVENT', key, value);
    }

    // Emit a NOTIFY/STATUS/EVENT event
    emitDataEvent<Event extends EventApplianceDataEvent, Key extends EventKey<Event> = EventKey<Event>>
    (event: Event, key: Key, value: EventValue<Key, Event>): void {
        // Emit the event after collecting all pending data
        const emitEvent = async (): Promise<void> => {
            await setImmediateP();
            const eventWithData: EventApplianceDataKV<Event> = {
                event,
                id:     this.haid,
                data: {
                    items: this.dataEventQueue[event]
                }
            };
            this.emitEventResolve(eventWithData as EventKV);
            this.dataEventQueue[event] = [];
        };
        if (!this.dataEventQueue[event].length) emitEvent();

        // Queue the data
        this.dataEventQueue[event].push({
            key,
            value,
            timestamp:  Math.floor(Date.now() / 1000),
            level:      'info',
            handling:   'none'
        });
        this.log.debug(`Mock event ${event}(${this.dataEventQueue[event].length}) ${key}=${value}`);
    }

    // Get events for the mock appliance
    async* getEvents(): AsyncGenerator<EventKV, void, void> {
        for (;;) {
            const event = await this.emitEventPromise;
            this.emitEventPromise = new Promise(resolve => this.emitEventResolve = resolve);
            yield event;
        }
    }

    // Test whether the current OperationState is one of the specified values
    isOperationState(...states: (keyof typeof OperationState)[]): boolean {
        try {
            const operationState = this.getStatusSpecific('BSH.Common.Status.OperationState').value;
            return states.map(state => OperationState[state]).includes(operationState);
        } catch {
            return false;
        }
    }

    // Create an APIStatusCodeError with a specified key
    static statusCodeError(statusCode: number, errorKey: string, itemKey = 'n/a'): APIStatusCodeError {
        const request = { method: 'MOCK', path: itemKey } as unknown as Request;
        const response = { statusCode } as Response;
        const body: ErrorResponse = { error: { key: errorKey } };
        return new APIStatusCodeError(request, response, JSON.stringify(body));
    }
}