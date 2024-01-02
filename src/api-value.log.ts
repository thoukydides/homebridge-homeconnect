// Homebridge plugin for Home Connect home appliances
// Copyright © 2023 Alexander Thoukydides

import { Logger } from 'homebridge';

import { green, greenBright } from 'chalk';
import assert from 'node:assert';

import { MS, columns, formatList, plural } from './utils';
import { HomeAppliance, OptionDefinition, Setting, Status, Value } from './api-types';
import { PLUGIN_VERSION } from './settings';
import { logError } from './log-error';

// Delay before summary log (longer than 1 minute rate-limit interval)
const SUMMARY_DELAY = 2 * 60 * MS;

// URL to create a new GitHub issue
const NEW_ISSUE_URL = 'https://github.com/thoukydides/homebridge-homeconnect/issues/new?template=key_value.yml&labels=api+keys%2Fvalues';

// Comment to tag unrecognised/mismatched values
const REPORT_COMMENT = '(unrecognised)';

// Mapping from Home Connect API (non-enum) types to Typescript equivalents
const TYPE_MAP: Record<string, string> = {
    String:     'string',
    Double:     'number',
    Int:        'number',
    Boolean:    'boolean'
};

// Detail of an API key
export type APIKeyValueDefinition = OptionDefinition | Setting | Status;

// Types of API key
export type APIKeyType = 'Command' | 'Event' | 'Option' | 'Setting' | 'Status';

// Information about a value for one or more keys
export interface APIValueLiteral {
    value:      Value;
    report:     boolean;
}
export interface APIValue {
    type?:      string; // enum name or 'String' | 'Double' | Int' | 'Boolean'
    values:     Record<string, APIValueLiteral>;
}

// Information about a key
export interface APIKey {
    key:        string;
    value?:     APIValue;
    report:     boolean;
}

// Information about a group (Option/Status/Setting/EventNotify/EventStatus/...)
export interface APIGroup {
    keys:       Record<string, APIKey>;
}

// Home Connect unrecognised/mismatched key-value logging
export class APIKeyValuesLog {

    // Appliances
    private appliances: Record<string, HomeAppliance> = {};
    private readonly applianceReports: Set<string> = new Set();

    // Known keys/values
    private readonly groups:    Record<string, APIGroup> = {};
    private readonly keys:      Record<string, APIKey> = {};

    // Reported keys/values
    private readonly reported:  Set<string> = new Set();
    private readonly pending:   Set<string> = new Set();
    private pendingScheduled?:  ReturnType<typeof setTimeout>;

    // Construct a key-value logger
    constructor(readonly log: Logger) {}

    // Update the dictionary of appliance descriptions
    setAppliances(appliances: HomeAppliance[]): void {
        for (const appliance of appliances)
            this.appliances[appliance.haId] = appliance;
    }

    // Add details of an key and its allowed values
    addDetail(detail: APIKeyValueDefinition) {
        // Only interested in the type name, if provided
        // (addValues() will be called for any value, default, or allowedvalues)
        if (!('type' in detail) || detail.type === undefined) return;
        const { key, type } = detail;

        // Find or create a record for this key
        const value = { type, values: {} };
        this.keys[key] ??= { key, value, report: false };
    }

    // Add a key that has been seen
    addKey(haid: string, group: string, subGroup: string | undefined, key: string, report: boolean) {
        // Generate a simple PascalCase group name
        if (subGroup) group += subGroup.charAt(0).toUpperCase() + subGroup.slice(1).toLowerCase();

        // Find or create records for this group and key
        const thisGroup = this.groups[group]  ??= { keys: {} };
        const thisKey   = thisGroup.keys[key] ??= this.keys[key] ??= { key, report };

        // Add to the pending report
        if (report) {
            thisKey.report = true;
            this.applianceReports.add(haid);
            this.scheduleSummary(group, key);
        }

    }

    // Add a value that has been seen (also used for ProgramKey values)
    addValue(haid: string, key: string, value: Value | null, report: boolean) {
        // Exclude null values
        if (value === null) return;

        // Find or create records for this key and value
        const thisKey     = this.keys[key] ??= { key, report: false };
        const thisValue   = thisKey.value  ??= { values: {} };
        const thisLiteral = thisValue.values[`${value}`] ??= { value, report };

        // Add to the pending report
        if (report) {
            thisKey.report = true;
            thisLiteral.report = true;
            this.applianceReports.add(haid);
            this.scheduleSummary(key, `${value}`);
        }
    }

    // Schedule a summary report for an unsupported key/value
    scheduleSummary(key: string, value: string) {
        // Check whether this has been reported already
        const id = `${key}.${value}`;
        if (this.reported.has(id)) return;

        // Add to the pending report
        this.pending.add(id);

        // Schedule (or reschedule) a summary report
        clearTimeout(this.pendingScheduled);
        this.pendingScheduled = setTimeout(() => {
            try {
                // Check whether the report is ready
                const unknownKeys = this.getUnknownTypes();
                if (unknownKeys.length) {
                    // Wait for more details before reporting
                    this.log.info('Delaying report of unrecognised keys/values until these types are known:');
                    for (const key of unknownKeys) {
                        this.log.info(`    ${key}`);
                        this.log.debug(`    ${JSON.stringify(this.keys[key])}`);
                    }
                } else {
                    // Generate the report
                    this.logSummary();
                    for (const id of this.pending) this.reported.add(id);
                    this.pending.clear();
                }
            } catch (err) {
                logError(this.log, 'Reporting unrecognised keys/values', err);
            }
        }, SUMMARY_DELAY);
    }

    // Generate a list of keys that currently have unknown types
    getUnknownTypes(): string[] {
        const unknownKeys = Object.values(this.keys).filter(key =>
            key.report && this.getTypeof(key.value) === 'unknown');
        return unknownKeys.map(key => key.key).sort();
    }

    // Generate summary report
    logSummary(): void {
        // Merge values that have the same enum name
        this.mergeSameEnums();

        // Construct enum or union types for values with unrecognised literals
        const lines: string[] = [];
        const reportValues = this.getValuesOfEnumType()
            .filter(value => Object.values(value.values).some(literal => literal.report));
        const reportUnions = reportValues.filter(value => !this.isEnumPreferred(value));
        if (reportUnions.length) {
            lines.push('', '// Union types');
            for (const value of reportValues)
                lines.push(...this.makeValueUnion(value));
        }
        const reportEnums = reportValues.filter(value => this.isEnumPreferred(value));
        if (reportEnums.length) {
            lines.push('', '// Enumerated types');
            for (const value of reportValues)
                lines.push(...this.makeValueEnum(value));
        }

        // Construct interfaces for groups with unrecognised keys
        lines.push('');
        for (const groupName of Object.keys(this.groups).sort()) {
            if (Object.values(this.groups[groupName].keys).some(key => key.report)) {
                lines.push(...this.makeGroupInterface(groupName), '');
            }
        }

        // Construct the URL to create a new issue for this report
        const appliances = Array.from(this.applianceReports);
        const appliancesTitle = this.makeApplianceDescription(appliances, 'short');
        const issueUrl = this.makeIssueURL(`HomeConnect API unexpected values (${appliancesTitle})`,
                                           this.makeApplianceDescription(appliances, 'long'));

        // Output the header text
        this.log.warn(greenBright('Home Connect API returned keys/values that are unrecognised by this plugin'));
        this.log.warn(greenBright('Please report these by creating a new GitHub issue using this link:'));
        this.log.warn(greenBright.bold(`    ${issueUrl}`));
        this.log.warn(greenBright('Most of the issue fields will be filled-in appropriately.'));
        this.log.warn(greenBright('Just paste the following into the "Log File" field and submit the issue:'));

        // Output the unrecognised keys/values with delimiter lines
        const maxLength = Math.max(...lines.map(line => line.length));
        this.log.warn(greenBright('='.repeat(maxLength)));
        for (const line of lines) this.log.warn(green.dim(line));
        this.log.warn(greenBright('='.repeat(maxLength)));
    }

    // Construct an interface for a group of keys
    makeGroupInterface(groupName: string): string[] {
        // Generate the properties for this group
        const group = this.groups[groupName];
        const properties: string[][] = Object.keys(group.keys).sort().map(keyName => {
            const { key, value, report } = group.keys[keyName];
            let line = `${this.makeType(value)};`;
            if (report) line += ` // ${REPORT_COMMENT}`;
            return [`'${key}'?:`, line];
        });

        // Return the interface for this group of keys
        return [
            `// ${groupName}`,
            `export interface ${groupName}Values {`,
            ...columns(properties).map(line => `    ${line}`),
            '}'
        ];
    }

    // Construct a union of literals for a value
    makeValueUnion(value: APIValue): string[] {
        // Generate the literal values
        const literals = Object.keys(value.values).sort();
        const lines = literals.map((literal, index) => {
            let line = (index === 0 ? '    ' : '  | ') + `'${literal}'`;
            if (index === literals.length - 1) line += ';';
            if (value.values[literal].report)  line += ` // ${REPORT_COMMENT}`;
            return line;
        });

        // Return the union of literals for this value
        return [
            `export type ${this.makeType(value)} =`,
            ...lines
        ];
    }

    // Construct an enum for a value
    makeValueEnum(value: APIValue): string[] {
        // Generate the enum values
        const literals = Object.keys(value.values).sort();
        const values: string[][] = literals.map((literal, index) => {
            let line = `= '${literal}'`;
            if (index !== literals.length - 1) line += ',';
            if (value.values[literal].report)  line += ` // ${REPORT_COMMENT}`;
            return [literal.replace(/^.*\./, ''), line];
        });

        // Return the enum type for this value
        return [
            `export enum ${this.makeType(value)} {`,
            ...columns(values).map(line => `    ${line}`),
            '}'
        ];
    }

    // Construct a Typescript type for a value
    makeType(value?: APIValue) {
        // Use the type specified by the API, if provided
        if (value?.type) {
            return TYPE_MAP[value.type] ?? this.makeEnumName(value.type);
        }

        // If it appears to be a string type then try to base it on the values
        const literalsType = this.getTypeof(value);
        if (literalsType === 'string') {
            const literals = Object.keys(value?.values ?? {});
            if (literals.every(literal => /\.Program\./.test(literal))) return 'ProgramKey';
            const isString = literals.some(literal => /[ :]/.test(literal));
            const types = literals.map(literal => this.makeEnumName(literal.replace(/\.[^.]*$/, '')));
            const isEnum = types.every(type => type === types[0]);
            if (!isString && isEnum) return types[0];
        }

        // Fallback to the 'typeof' value
        return literalsType;
    }

    // Test whether a value is of enum type
    isEnumType(value: APIValue): boolean | undefined {
        if (value.type) return TYPE_MAP[value.type] === undefined;
        if (['boolean', 'number'].includes(this.getTypeof(value))) return false;
        return undefined;
    }

    // Typescript type based on the typeof literals
    getTypeof(value?: APIValue): 'string' | 'number' | 'boolean' | 'unknown' {
        function assertisLiteral(type: string): asserts type is 'string' | 'number' | 'boolean' {
            assert.match(type, /^(string|number|boolean)$/);
        }
        const types = Object.values(value?.values ?? {}).map(literal => {
            const type = typeof literal.value;
            assertisLiteral(type);
            return type;
        });
        return types.length && types.every(type => type === types[0]) ? types[0] : 'unknown';
    }

    // Merge values that have the same enum name
    mergeSameEnums(): void {
        const enums: Record<string, APIValue> = {};
        for (const key of Object.values(this.keys)) {
            const { value } = key;
            const name = this.makeType(value);
            if (value && !['string', 'number', 'boolean', 'unknown'].includes(name)) {
                const existing = enums[name] ??= value;
                if (existing !== value) this.mergeEnumValue(existing, value);
            }
        }
    }

    // Merge two enum values
    mergeEnumValue(to: APIValue, from: APIValue): void {
        // Sanity checks
        if (from.type) assert.doesNotMatch(from.type, /^(Double|Int|Boolean)$/);
        if (to.type)   assert.doesNotMatch(to.type,   /^(Double|Int|Boolean)$/);
        if (from.type && to.type) assert.strictEqual(from.type, to.type);

        // Merge the literals
        for (const [key, literal] of Object.entries(from.values)) {
            to.values[key] ??= literal;
            if (literal.report) to.values[key].report = true;
        }

        // Update all references to the old value
        for (const key of Object.values(this.keys)) {
            if (key.value === from) key.value = to;
        }
    }

    // Construct an enum type name
    makeEnumName(type: string): string {
        return type
            // Remove any common prefix
            .replace(/^.*(EnumType|Option|Setting|Status)\./, '')
            .replace(/\./g, ''); // remove any remaining period separators
    }

    // Construct the issue URL for reporting this
    makeIssueURL(title: string, appliances: string): string {
        const url = new URL(NEW_ISSUE_URL);
        url.searchParams.set('title',     title);
        url.searchParams.set('version',   PLUGIN_VERSION);
        url.searchParams.set('appliance', appliances);
        return url.href;
    }

    // Convert a list of appliance haids into a description
    makeApplianceDescription(haids: string[], style: 'short' | 'long' = 'long'): string {
        if (haids.every(haid => this.appliances[haid])) {
            // All appliances are known, so use their types
            return formatList(haids.map(haid => {
                const { brand, type, enumber } = this.appliances[haid];
                return style === 'short' ? enumber : `${brand} ${type} ${enumber}`;
            }));
        } else {
            // At least one of the appliances is unknown
            return style === 'short' ? plural(haids.length, 'appliance') : formatList([...haids].sort());
        }
    }

    // Obtain a list of all values (that might be) of enum type
    getValuesOfEnumType(): APIValue[] {
        // Construct the set of (possible) enum values
        const values: Set<APIValue> = new Set();
        for (const value of Object.values(this.keys).map(key => key.value)) {
            if (value && this.isEnumType(value) !== false
                && Object.values(value.values).length)
                values.add(value);
        }

        // Return the values, sorted by their type name
        const sortBy = (value: APIValue) => this.makeType(value);
        return Array.from(values).sort((a, b) => sortBy(a).localeCompare(sortBy(b)));
    }

    // Decide whether an enum or union type is preferred
    isEnumPreferred(value: APIValue): boolean {
        const keys = Object.values(this.keys).filter(key => key.value === value);
        return keys.some(key => /\.(Event|Setting|State)\./.test(key.key));
    }
}