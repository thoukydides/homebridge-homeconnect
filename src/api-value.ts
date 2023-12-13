// Homebridge plugin for Home Connect home appliances
// Copyright © 2023 Alexander Thoukydides

import { LogLevel, Logger } from 'homebridge';

import { createCheckers, Checker } from 'ts-interface-checker';

import { CommandValues, EventMapValues, OptionValues, ProgramKey, SettingValues,
         StatusValues } from './api-value-types';
import { Command, ConstraintsCommon, EventApplianceConnection,
         EventApplianceData, EventData, Option, OptionConstraintsCommon,
         OptionDefinitionCommon, Program, ProgramDefinition, ProgramList,
         Programs, Setting, SettingCommon, Status, StatusCommon, Value } from './api-types';
import { APIEvent, EventStart, EventStop } from './api-events';
import valuesTI from './ti/api-value-types-ti';
import { MS, getValidationTree, keyofChecker } from './utils';

// Checkers for API responses
const checkers = createCheckers(valuesTI);

// Known keys
export type KVKey<Values> = keyof Values;
export type CommandKey  = KVKey<CommandValues>;
export type OptionKey   = KVKey<OptionValues>;
export type StatusKey   = KVKey<StatusValues>;
export type SettingKey  = KVKey<SettingValues>;
export type EventMapKey = KVKey<EventMapValues>;
export type EventKey<Event extends EventMapKey = EventMapKey> =
    Event extends Event ? KVKey<EventMapValues[Event]> : never;

// Value type for a specific key
export type KVValue<Values, Key> = Key extends keyof Values ? Required<Values>[Key] : never;
export type CommandValue<Key> = KVValue<CommandValues, Key>;
export type OptionValue <Key> = KVValue<OptionValues,  Key>;
export type StatusValue <Key> = KVValue<StatusValues,  Key>;
export type SettingValue<Key> = KVValue<SettingValues, Key>;
export type EventValue<Key, Event extends EventMapKey = EventMapKey> =
    Event extends Event ? KVValue<EventMapValues[Event], Key> : never;

// Strongly typed constraints
interface ConstraintsForType<Type> extends ConstraintsCommon {
    default?:       Type;
    min?:           MapValueType<Type, number,  never, never, never>;
    max?:           MapValueType<Type, number,  never, never, never>;
    stepsize?:      MapValueType<Type, number,  never, never, never>;
    allowedvalues?: MapValueType<Type, never,   never, never, Array<Type>>;
    displayvalues?: MapValueType<Type, never,   never, never, Array<string>>;
}
type MapValueType<Type, IsNumber, IsBoolean, IsString, IsEnum> =
    Type extends number ? IsNumber
    : (Type extends boolean ? IsBoolean
       : (string extends Type ? IsString : IsEnum));

// Srictly typed commands
export interface CommandKV extends Command {
    key:            CommandKey;
}

// Strongly typed programs (list)
export interface ProgramsKV extends Programs {
    programs:       ProgramListKV[];
    selected?:      Partial<ProgramKV>;
    active?:        Partial<ProgramKV>;
}
export interface ProgramListKV extends ProgramList {
    key:            ProgramKey;
}

// Strongly typed programs (selected/active)
export interface ProgramKV extends Program {
    key:            ProgramKey;
    options?:       OptionKV[];
}

// Strongly typed program definition
export interface ProgramDefinitionKV<PKey extends ProgramKey>
    extends Omit<ProgramDefinition, 'options'> {
    key:            PKey;
    options?:       OptionDefinitionKV[];
}
export type OptionDefinitionKV<KeyU extends OptionKey = OptionKey> =  { [Key in KeyU]: {
    key:            Key;
    type:           OptionTypeForType<OptionValue<Key>>;
    constraints?:   OptionConstraintsCommon & ConstraintsForType<OptionValue<Key>>;
} }[KeyU] & OptionDefinitionCommon;
type OptionTypeForType<Type> = MapValueType<Type, 'Double' | 'Int', 'Boolean', 'String', string>;

// Strongly typed option
export type OptionKV<KeyU extends OptionKey = OptionKey> = { [Key in KeyU]: {
    key:            Key;
    value:          OptionValue<Key>;
} }[KeyU] & Option;

// Strongly typed status
export type StatusKV<KeyU extends StatusKey = StatusKey> = { [Key in KeyU]: {
    key:            Key;
    value:          StatusValue<Key>;
    constraints?:   ConstraintsForType<StatusValue<Key>>;
} }[KeyU] & StatusCommon;

// Strongly typed setting
export type SettingKV<KeyU extends SettingKey = SettingKey> = { [Key in KeyU]: {
    key:            Key;
    value:          SettingValue<Key>;
    constraints?:   ConstraintsForType<SettingValue<Key>>;
} }[KeyU] & SettingCommon;

// Strongly typed events
export type EventKV = EventApplianceConnectionKV | EventApplianceDataKV | EventStart | EventStop;
type EventApplianceConnectionEvent = EventApplianceConnection['event'];
export type EventApplianceConnectionKV<EventU extends EventApplianceConnectionEvent = EventApplianceConnectionEvent> =
{ [Event in EventU]: {
    event:      Event;
    data?:      '' | EventDataKV<Event>;
} }[EventU] & EventApplianceConnection;
type EventApplianceDataEvent = EventApplianceData['event'];
export type EventApplianceDataKV<EventU extends EventApplianceDataEvent = EventApplianceDataEvent> =
EventApplianceData & { [Event in EventU]: {
    event:          Event;
    data:           Omit<EventApplianceData['data'], 'items'> & {
        items:      EventDataKV<Event>[];
    };
} }[EventU];
export type EventDataKV<EventU extends EventMapKey = EventMapKey, KeyU extends EventKey<EventU> = EventKey<EventU>> =
{ [Event in EventU]: { [Key in KeyU]: {
    key:            Key;
    value:          EventValue<Key, Event>;
} }[KeyU] }[EventU] & EventData;

// Minimum interval between reporting unrecognised keys
const REPORT_INTERVAL = 24 * 60 * 60 * MS; // (24 hours in milliseconds)

// Home Connect key-value type checkers
export class APICheckValues {

    // Earliest to report an unrecognised key again
    private readonly nextKeyReport: Record<string, number> = {};

    // Create a key-value type checker
    constructor(readonly log: Logger) {}

    // Validation errors are logged, but values still returned with type assertion regardless

    // Check a list of programs
    programs(programs: Programs): ProgramsKV {
        programs.programs.forEach((program, index) =>
            this.isLiteral(checkers.ProgramKey, LogLevel.INFO, `Programs.programs[${index}]`, program, program.key));
        if (programs.selected?.key) this.program(programs.selected as Program, 'Programs.selected');
        if (programs.active?.key)   this.program(programs.active   as Program, 'Programs.active');
        return programs as ProgramsKV;
    }

    // Check a single program definition
    programDefinition<PKey extends ProgramKey>(program: ProgramDefinition): ProgramDefinitionKV<PKey> {
        this.isLiteral(checkers.ProgramKey, LogLevel.INFO, 'ProgramDefinition', program, program.key);
        if (program.options) {
            program.options.forEach((option, index) =>
                this.isKey(checkers.OptionValues, LogLevel.INFO, `ProgramDefinition.options[${index}]`, option, option.key));
        }
        return program as ProgramDefinitionKV<PKey>;
    }

    // Check a single program (selected/active)
    program(program: Program, type: string = 'Program'): ProgramKV {
        this.isLiteral(checkers.ProgramKey, LogLevel.INFO, type, program, program.key);
        if (program.options) this.options(program.options);
        return program as ProgramKV;
    }

    // Check a list of program options
    options(options: Option[]): OptionKV[] {
        return options.map(option => this.option(option));
    }

    // Check a single program option
    option<Key extends OptionKey>(option: Option): OptionKV<Key> {
        if (this.isKey(  checkers.OptionValues, LogLevel.INFO,  'Option', option, option.key))
            this.isValue(checkers.OptionValues, LogLevel.ERROR, 'Option', option, option.key, option.value);
        return option as OptionKV<Key>;
    }

    // Check a list of statuses
    statuses(status: Status[]): StatusKV[] {
        return status.map(status => this.status(status));
    }

    // Check a single status
    status<Key extends StatusKey>(status: Status): StatusKV<Key> {
        if (this.isKey(  checkers.StatusValues, LogLevel.WARN,  'Status', status, status.key))
            this.isValue(checkers.StatusValues, LogLevel.ERROR, 'Status', status, status.key, status.value);
        return status as StatusKV<Key>;
    }

    // Check a list of settings
    settings(settings: Setting[]): SettingKV[] {
        return settings.map(setting => this.setting(setting));
    }

    // Check a single setting
    setting<Key extends SettingKey>(setting: Setting): SettingKV<Key> {
        if (this.isKey(  checkers.SettingValues, LogLevel.WARN,  'Setting', setting, setting.key))
            this.isValue(checkers.SettingValues, LogLevel.ERROR, 'Setting', setting, setting.key, setting.value);
        return setting as SettingKV<Key>;
    }

    // Check a list of commands
    commands(commands: Command[]): CommandKV[] {
        commands.forEach(command =>
            this.isKey(checkers.CommandValues, LogLevel.WARN, 'Command', command, command.key));
        return commands as CommandKV[];
    }

    // Check an event
    event(event: APIEvent): EventKV {
        if ('data' in event && event.data) {
            const checker = {
                CONNECTED:    checkers.EventConnectedValues,
                DISCONNECTED: checkers.EventDisconnectedValues,
                PAIRED:       checkers.EventPairedValues,
                DEPAIRED:     checkers.EventDepairedValues,
                NOTIFY:       checkers.EventNotifyValues,
                STATUS:       checkers.EventStatusValues,
                EVENT:        checkers.EventEventValues
            }[event.event];
            const type = `${event.event} Event.data`;
            const check = (type: string, data: EventData) => {
                if (this.isKey(  checker, LogLevel.INFO,  type, data, data.key))
                    this.isValue(checker, LogLevel.ERROR, type, data, data.key, data.value);
            };
            if ('items' in event.data) {
                event.data.items.forEach((data, index) => check(`${type}.items[${index}]`, data));
            } else {
                check(type, event.data);
            }
        }
        return event as EventKV;
    }

    // Test whether a literal is recognised for the specified union type
    isLiteral(checker: Checker, level: LogLevel, type: string, json: object, literal: string): boolean {
        // Test whether the key exist in the type
        if (checker.test(literal)) return true;

        // Log the unrecognised literal, avoiding frequent reports of the same value
        const now = Date.now();
        if (!(literal in this.nextKeyReport) || this.nextKeyReport[literal] < now) {
            this.logValidation(level, `Unrecognised ${type} literal`, type, json, [literal]);
        }
        this.nextKeyReport[literal] = now + REPORT_INTERVAL;
        return false;
    }

    // Test whether a key is recognised for the specified type
    isKey(checker: Checker, level: LogLevel, type: string, json: object, key: string): boolean {
        // Test whether the key exist in the type
        if (keyofChecker(checker).includes(key)) return true;

        // Log the unrecognised key, avoiding frequent reports of the same key
        const now = Date.now();
        if (!(key in this.nextKeyReport) || this.nextKeyReport[key] < now) {
            this.logValidation(level, `Unrecognised ${type}`, type, json, [key]);
        }
        this.nextKeyReport[key] = now + REPORT_INTERVAL;
        return false;
    }

    // Test whether a value is of the correct type
    isValue(checker: Checker, level: LogLevel, type: string, json: object,
            key: string, value: Value | null): boolean {
        // Test whether the value has the expected type
        const kv = { [key]: value };
        const validation = checker.validate(kv);
        if (!validation) return true; // Key exists and value correct type

        // Log details of the mismatched value type
        this.logValidation(level, `Mismatched type for ${type} value`, type, json,
                           [`${value} (type ${typeof value})`,
                            ...getValidationTree(validation)]);
        return false;
    }

    // Log key-value validation errors
    logValidation(level: LogLevel, message: string, name: string, json: object,
                  details: string[]): void {
        this.log.log(level, `${message} in Home Connect API:`);
        for (const line of details) this.log.log(level, `    ${line}`);
        this.log.debug(`Received ${name} (reformatted)`);
        const jsonLines = JSON.stringify(json, null, 4).split('\n');
        for (const line of jsonLines) this.log.debug(`    ${line}`);
    }
}