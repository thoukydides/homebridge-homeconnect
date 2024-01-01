// Homebridge plugin for Home Connect home appliances
// Copyright © 2023-2024 Alexander Thoukydides

import { Logger } from 'homebridge';

import { createCheckers, Checker, ITypeSuite, TType, TName } from 'ts-interface-checker';
import assert from 'node:assert';

import { CommandValues, EventMapValues, OptionValues, ProgramKey, SettingValues,
         StatusValues } from './api-value-types';
import { Command, Constraints, ConstraintsCommon, EventApplianceConnection,
         EventApplianceData, EventData, HomeAppliance, Option, OptionConstraintsCommon,
         OptionDefinition, OptionDefinitionCommon, Program, ProgramDefinition,
         ProgramList, Programs, Setting, SettingCommon, Status, StatusCommon,
         Value } from './api-types';
import { APIEvent, EventStart, EventStop } from './api-events';
import { MS, getValidationTree, keyofChecker } from './utils';
import valuesTI from './ti/api-value-types-ti';
import { APIKeyValuesLog } from './api-value.log';

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

// Extend and replace properties
type ExtendKV<Super, Sub> = Sub & Omit<Super, keyof Sub>;

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
export interface ProgramDefinitionKV<PKey extends ProgramKey = ProgramKey>
    extends Omit<ProgramDefinition, 'options'> {
    key:            PKey;
    options?:       OptionDefinitionKV[];
}
export type OptionDefinitionKV<KeyU extends OptionKey = OptionKey> =
{ [Key in KeyU]: ExtendKV<OptionDefinitionCommon, {
    key:            Key;
    type:           OptionTypeForType<OptionValue<Key>>;
    constraints?:   OptionConstraintsCommon & ConstraintsForType<OptionValue<Key>>;
}> }[KeyU];
type OptionTypeForType<Type> = MapValueType<Type, 'Double' | 'Int', 'Boolean', 'String', string>;

// Strongly typed option
export type OptionKV<KeyU extends OptionKey = OptionKey> =
{ [Key in KeyU]: ExtendKV<Option, {
    key:            Key;
    value:          OptionValue<Key>;
}> }[KeyU];

// Strongly typed status
export type StatusKV<KeyU extends StatusKey = StatusKey> =
{ [Key in KeyU]: ExtendKV<StatusCommon, {
    key:            Key;
    value:          StatusValue<Key>;
    constraints?:   ConstraintsForType<StatusValue<Key>>;
}> }[KeyU];

// Strongly typed setting
export type SettingKV<KeyU extends SettingKey = SettingKey> =
{ [Key in KeyU]: ExtendKV<SettingCommon, {
    key:            Key;
    value:          SettingValue<Key>;
    constraints?:   ConstraintsForType<SettingValue<Key>>;
}> }[KeyU];

// Strongly typed events
export type EventKV = EventApplianceConnectionKV | EventApplianceDataKV | EventStart | EventStop;
export type EventApplianceConnectionEvent = EventApplianceConnection['event'];
export type EventApplianceConnectionKV<EventU extends EventApplianceConnectionEvent = EventApplianceConnectionEvent> =
{ [Event in EventU]: ExtendKV<EventApplianceConnection, {
    event:      Event;
    data?:      '' | EventDataKV<Event>;
}> }[EventU];
export type EventApplianceDataEvent = EventApplianceData['event'];
export type EventApplianceDataKV<EventU extends EventApplianceDataEvent = EventApplianceDataEvent> =
{ [Event in EventU]: ExtendKV<EventApplianceData, {
    event:          Event;
    data:           Omit<EventApplianceData['data'], 'items'> & {
        items:      EventDataKV<Event>[];
    };
}> }[EventU];
export type EventDataKV<EventU extends EventMapKey = EventMapKey, KeyU extends EventKey<EventU> = EventKey<EventU>> =
{ [Event in EventU]: { [Key in KeyU]: ExtendKV<EventData, {
    key:            Key;
    value:          EventValue<Key, Event>;
}> }[KeyU] }[EventU];

// Context of key or value being checked
export interface APICheckValueContext {
    haid:       string;
    group:      string;
    subGroup?:  string;
    type?:      string;
    json:       object;
    keyFailed?: boolean;
}

// Minimum interval between reporting unrecognised keys
const REPORT_INTERVAL = 24 * 60 * 60 * MS; // (24 hours in milliseconds)

// Home Connect key-value type checkers
export class APICheckValues {

    // Earliest to report an unrecognised key again
    private readonly nextKeyReport: Record<string, number> = {};

    // Key-value logger
    private readonly logValues: APIKeyValuesLog;

    // Create a key-value type checker
    constructor(readonly log: Logger) {
        this.logValues = new APIKeyValuesLog(log);
    }

    // Validation errors are logged, but values still returned with type assertion regardless

    // Check a list of appliances
    appliances(appliances: HomeAppliance[]): HomeAppliance[] {
        this.logValues.setAppliances(appliances);
        return appliances;
    }

    // Check a single appliance
    appliance(haid: string, appliance: HomeAppliance): HomeAppliance {
        assert.strictEqual(appliance.haId, haid);
        this.logValues.setAppliances([appliance]);
        return appliance;
    }

    // Check a list of programs
    programs(haid: string, programs: Programs): ProgramsKV {
        const context: APICheckValueContext = { haid, group: 'Program', json: {} };
        programs.programs.forEach((program, index) =>
            this.isLiteral(checkers.ProgramKey, { ...context, type: `Programs.programs[${index}]`, json: program }, program.key));
        if (programs.selected?.key) this.program(haid, programs.selected as Program, 'Programs.selected');
        if (programs.active?.key)   this.program(haid, programs.active   as Program, 'Programs.active');
        return programs as ProgramsKV;
    }

    // Check a single program definition
    programDefinition<PKey extends ProgramKey>(haid: string, program: ProgramDefinition): ProgramDefinitionKV<PKey> {
        const context: APICheckValueContext = { haid, group: 'Program', type: 'ProgramDefinition', json: program };
        this.isLiteral(checkers.ProgramKey, context, program.key);
        if (program.options) this.optionDefinitions(haid, program.options);
        return program as ProgramDefinitionKV<PKey>;
    }

    // Check a single program (selected/active)
    program(haid: string, program: Program, type: string = 'Program'): ProgramKV {
        const context: APICheckValueContext = { haid, group: 'Program', type, json: program };
        this.isLiteral(checkers.ProgramKey, context, program.key);
        if (program.options) this.options(haid, program.options);
        return program as ProgramKV;
    }

    // Check a list of program options
    options(haid: string, options: Option[]): OptionKV[] {
        return options.map(option => this.option(haid, option));
    }

    // Check a single program option
    option<Key extends OptionKey>(haid: string, option: Option): OptionKV<Key> {
        const context: APICheckValueContext = { haid, group: 'Option', json: option };
        this.isKey(valuesTI, valuesTI.OptionValues, context, option.key);
        this.isValue(checkers.OptionValues, context, option.key, option.value);
        return option as OptionKV<Key>;
    }

    // Check a list of program option definitionss
    optionDefinitions(haid: string, options: OptionDefinition[]): OptionDefinitionKV[] {
        return options.map(option => this.optionDefinition(haid, option));
    }

    // Check a single program option definition
    optionDefinition<Key extends OptionKey>(haid: string, option: OptionDefinition): OptionDefinitionKV<Key> {
        const context: APICheckValueContext = { haid, group: 'Option', type: 'OptionDefinition', json: option };
        this.logValues.addDetail(option);
        this.isKey(valuesTI, valuesTI.OptionValues, context, option.key);
        this.isConstraints(checkers.OptionValues, context, option.key, option.constraints);
        return option as OptionDefinitionKV<Key>;
    }

    // Check a list of statuses
    statuses(haid: string, status: Status[]): StatusKV[] {
        return status.map(status => this.status(haid, status));
    }

    // Check a single status
    status<Key extends StatusKey>(haid: string, status: Status): StatusKV<Key> {
        const context: APICheckValueContext = { haid, group: 'Status', json: status };
        this.logValues.addDetail(status);
        this.isKey(valuesTI, valuesTI.StatusValues, context, status.key);
        this.isValue(checkers.StatusValues, context, status.key, status.value);
        this.isConstraints(checkers.StatusValues, context, status.key, status.constraints);
        return status as StatusKV<Key>;
    }

    // Check a list of settings
    settings(haid: string, settings: Setting[]): SettingKV[] {
        return settings.map(setting => this.setting(haid, setting));
    }

    // Check a single setting
    setting<Key extends SettingKey>(haid: string, setting: Setting): SettingKV<Key> {
        const context: APICheckValueContext = { haid, group: 'Setting', json: setting };
        this.logValues.addDetail(setting);
        this.isKey(valuesTI, valuesTI.SettingValues, context, setting.key);
        this.isValue(checkers.SettingValues, context, setting.key, setting.value);
        this.isConstraints(checkers.SettingValues, context, setting.key, setting.constraints);
        return setting as SettingKV<Key>;
    }

    // Check a list of commands
    commands(haid: string, commands: Command[]): CommandKV[] {
        commands.forEach(command => {
            const context: APICheckValueContext = { haid, group: 'Command', json: command };
            this.isKey(valuesTI, valuesTI.CommandValues, context, command.key);
        });
        return commands as CommandKV[];
    }

    // Check an event
    event(haid: string, event: APIEvent): EventKV {
        if ('data' in event && event.data) {
            const type = `${event.event} Event.data`;
            const props = (valuesTI.EventMapValues as { props?: { name: string; ttype: TName}[] }).props;
            const tname = props?.find(prop => prop.name === event.event)?.ttype?.name;
            if (!tname) {
                this.logValidation('Unrecognised event', type, event, [event.event]);
            } else {
                const check = (type: string, data: EventData) => {
                    const context: APICheckValueContext = { haid, group: 'Event', subGroup: event.event, type, json: data };
                    this.isKey(valuesTI, valuesTI[tname], context, data.key);
                    this.isValue(checkers[tname], context, data.key, data.value);
                };
                if ('items' in event.data) {
                    event.data.items.forEach((data, index) => check(`${type}.items[${index}]`, data));
                } else {
                    check(type, event.data);
                }
            }
        }
        return event as EventKV;
    }

    // Test whether a literal is recognised for the specified union type
    isLiteral(checker: Checker, context: APICheckValueContext, literal: string): boolean {
        // Test whether the key exist in the type
        const isCorrect = checker.test(literal);
        this.logValues.addValue(context.haid, 'ProgramKey', literal, !isCorrect);
        if (isCorrect) return true;

        // Log the unrecognised literal, avoiding frequent reports of the same value
        const now = Date.now();
        const type = context.type ?? context.group;
        if (!(literal in this.nextKeyReport) || this.nextKeyReport[literal] < now) {
            this.logValidation(`Unrecognised ${type} literal`, type, context.json, [literal]);
        }
        this.nextKeyReport[literal] = now + REPORT_INTERVAL;
        return false;
    }

    // Test whether a key is recognised for the specified type
    isKey(typeSuite: ITypeSuite, checkerType: TType, context: APICheckValueContext, key: string): boolean {
        // Test whether the key exist in the type
        const isCorrect = keyofChecker(typeSuite, checkerType).includes(key);
        context.keyFailed = !isCorrect;
        this.logValues.addKey(context.haid, context.group, context.subGroup, key, !isCorrect);
        if (isCorrect) return true;

        // Log the unrecognised key, avoiding frequent reports of the same key
        const now = Date.now();
        const type = context.type ?? context.group;
        if (!(key in this.nextKeyReport) || this.nextKeyReport[key] < now) {
            this.logValidation(`Unrecognised ${type}`, type, context.json, [key]);
        }
        this.nextKeyReport[key] = now + REPORT_INTERVAL;
        return false;
    }

    // Test whether constraints are of the correct type
    isConstraints(checker: Checker, context: APICheckValueContext, key: string, constraints?: Constraints): boolean {
        // Constraints are optional
        if (constraints === undefined) return true;

        const isValueResults: boolean[] = [];
        const isValue = (type: string, value: Value) =>
            isValueResults.push(this.isValue(checker, { ...context, type }, key, value));
        const type = (context.type ?? context.group).concat('.constraints');

        // Check default value, if specified
        if (constraints.default !== undefined) {
            isValue(`${type}.default`, constraints.default);
        }

        // Check allowed values, if specified
        if ('allowedvalues' in constraints) {
            constraints.allowedvalues?.forEach((value, index) =>
                isValue(`${type}.allowedvalues[${index}]`, value));
        }

        // Return whether all tests paassed
        return !isValueResults.includes(false);
    }

    // Test whether a value is of the correct type
    isValue(checker: Checker, context: APICheckValueContext, key: string, value: Value | null): boolean {
        // Test whether the value has the expected type
        const kv = { [key]: value };
        const validation = checker.validate(kv);
        const isCorrect = validation === null; // Key exists and value correct type
        this.logValues.addValue(context.haid, key, value, context.keyFailed || !isCorrect);
        if (context.keyFailed || isCorrect) return true;

        // Log details of the mismatched value type
        const type = context.type ?? context.group;
        this.logValidation(`Mismatched type for ${type} value`, type, context.json,
                           [`${value} (type ${typeof value})`,
                            ...getValidationTree(validation)]);
        return false;
    }

    // Log key-value validation errors
    logValidation(message: string, name: string, json: object, details: string[]): void {
        this.log.info(`${message} in Home Connect API:`);
        for (const line of details) this.log.info(`    ${line}`);
        this.log.debug(`Received ${name} (reformatted)`);
        const jsonLines = JSON.stringify(json, null, 4).split('\n');
        for (const line of jsonLines) this.log.debug(`    ${line}`);
    }
}