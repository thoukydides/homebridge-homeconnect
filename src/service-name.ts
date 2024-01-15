// Homebridge plugin for Home Connect home appliances
// Copyright © 2023 Alexander Thoukydides

import { Logger, Perms, Service } from 'homebridge';

import assert from 'node:assert';
import NodePersist from 'node-persist';

import { assertIsDefined, assertIsString, formatList, plural } from './utils';
import { ApplianceBase } from './appliance-generic';
import { logError } from './log-error';

// Service name length in Unicode characters (code points, not octets or code units)
const SERVICE_LENGTH_MIN = 1;
const SERVICE_LENGTH_MAX = 250; // (Name is limited to 64, but ConfiguredName can be longer)

// Characters allowed in a service name (requires RegExp with 'u' flag)
const SERVICE_CHAR_END      = /\p{L}|\p{Nd}/u;          // (alphabetic or numeric)
const SERVICE_CHAR_ANY      = /\p{L}|\p{Nd}|[- '&,.]/u; // (alphanumeric or punctuation)
const SERVICE_CHAR_EMOJI    = /\p{Extended_Pictographic}/u;

// HomeKit service naming for an accessory
export class ServiceNames {

    // Shortcuts to Homebridge API
    readonly Service;
    readonly Characteristic;

    // Logger
    readonly log:   Logger;

    // Persistent storage
    persist:        NodePersist.LocalStorage;

    // Service names set via HomeKit (which should not be overwritten)
    customNames:    Record<string, string> = {};
    busyPromise?:   Promise<void>;

    // Construct a service naming service
    constructor(readonly appliance: ApplianceBase) {
        this.Service        = appliance.Service;
        this.Characteristic = appliance.Characteristic;
        this.log            = appliance.log;

        // Load any previous custom names
        assertIsDefined(this.appliance.platform.persist);
        this.persist = this.appliance.platform.persist;
        this.busyPromise = this.loadCustomNames();
    }

    // Add a Configured Name characteristic to the service
    addConfiguredName(service: Service, suffix: string, subtype?: string): void {
        assert.notStrictEqual(suffix, '');
        const description = `${suffix} Service`;
        const defaultName = this.makeServiceName(suffix, subtype);

        // Add the Configured Name characteristic
        if (!service.testCharacteristic(this.Characteristic.ConfiguredName)) {
            service.addOptionalCharacteristic(this.Characteristic.ConfiguredName);
            service.setCharacteristic(this.Characteristic.Name, defaultName);
            service.setCharacteristic(this.Characteristic.ConfiguredName, defaultName);
        }
        const characteristic = service.getCharacteristic(this.Characteristic.ConfiguredName);
        characteristic.setProps({ perms: [Perms.NOTIFY, Perms.PAIRED_READ, Perms.PAIRED_WRITE] });

        // Current and default names
        let currentName = characteristic.value;
        assertIsString(currentName);

        // Set the initial value (asynchronously)
        this.withCustomNames('read-only', () => {
            if (currentName === this.customNames[suffix]) {
                // Name was set via HomeKit, so preserve it
                this.log.debug(`Preserving ${description} name "${currentName}" set via HomeKit`);
            } else {
                // Probably not changed by the user via HomeKit, so set explicitly
                if (currentName !== defaultName) {
                    if (currentName === '') this.log.debug(`Naming ${description} as "${defaultName}"`);
                    else this.log.info(`Renaming ${description} to "${defaultName}" (was "${currentName}")`);
                }
                characteristic.updateValue(defaultName);
                currentName = defaultName;
            }
        });

        // Monitor changes to the name
        characteristic.onSet(this.appliance.onSetString(async name => {
            await this.withCustomNames('read-write', () => {
                if (name !== currentName) {
                    this.log.info(`SET ${description} name to "${name}" (was "${currentName}")`);
                    currentName = name;
                    if (name !== defaultName) {
                        if (this.customNames[suffix] === undefined) this.log.info(`HomeKit override on ${suffix} service name`);
                        this.customNames[suffix] = name;
                    } else {
                        this.log.info(`Removing HomeKit override on ${suffix} service name`);
                        delete this.customNames[suffix];
                    }
                }
            });
        }));
    }

    // Construct the display name for a service
    makeServiceName(suffix: string, subtype?: string): string {
        assert.notStrictEqual(suffix, '');

        // Check whether the appliance name should be used as a prefix
        const prefixConfig = this.appliance.config.names?.prefix;
        const applyPrefix = /^program /.test(subtype ?? '') ? (prefixConfig?.programs ?? false)
                                                            : (prefixConfig?.other    ?? true);
        // Construct the service name
        const accessoryName = this.appliance.accessory.displayName;
        const name = applyPrefix ? `${accessoryName} ${suffix}` : suffix;
        this.validateServiceName(suffix, name);
        return name;
    }

    // Validate a service name (log warnings, but do not apply any fixes)
    validateServiceName(suffix: string, name: string): boolean {
        // Check the length in characters (Unicode code units)
        const issues: string[] = [];
        const characters = [...name];
        const length = characters.length;
        if (length < SERVICE_LENGTH_MIN) issues.push(`too short (${length} < ${SERVICE_LENGTH_MIN})`);
        if (SERVICE_LENGTH_MAX < length) issues.push(`too long (${length} > ${SERVICE_LENGTH_MAX})`);

        // Check for invalid characters
        const firstChar = characters.shift();
        const lastChar  = characters.pop();
        const firstCharIssue = this.validateCharacters(SERVICE_CHAR_END, [firstChar], 'invalid first character');
        const otherCharIssue = this.validateCharacters(SERVICE_CHAR_ANY,  characters, 'invalid character');
        const lastCharIssue  = this.validateCharacters(SERVICE_CHAR_END, [lastChar],  'invalid last character');

        // If there were any issues then issue a summary warning
        const defined = <T>(items: (T | undefined)[]) => items.filter(item => item !== undefined) as T[];
        issues.push(...defined([firstCharIssue, otherCharIssue, lastCharIssue]));
        if (issues.length) this.log.warn(`Invalid ${suffix} service name "${name}": ${formatList(issues)}`);

        // Log Apple's guidance for any matching issues
        if (otherCharIssue)                  this.log.warn('    Use only alphanumeric, space, and apostrophe characters');
        if (firstCharIssue || lastCharIssue) this.log.warn('    Start and end with an alphabetic or numeric character');
        if (SERVICE_CHAR_EMOJI.test(name))   this.log.warn("    Don't include emojis");

        // Return whether the name passed all checks
        return issues.length === 0;
    }

    // Validate characters (Unicode code units) in a servce name
    validateCharacters(regexp: RegExp, characters: (string | undefined)[], issue: string): string | undefined {
        const badCharacters = characters.filter(c => c !== undefined && !regexp.test(c));
        if (!badCharacters.length) return;
        return `${plural(badCharacters.length, issue, false)} (${formatList(badCharacters.map(c => `"${c}"`))})`;
    }

    // Perform an operation using the custom names
    async withCustomNames(type: 'read-only' | 'read-write', operation: () => void): Promise<void> {
        while (this.busyPromise) await this.busyPromise;
        operation();
        if (type === 'read-write') {
            this.busyPromise = this.saveCustomNames();
            await this.busyPromise;
        }
    }

    // Restore any previous custom names
    async loadCustomNames(): Promise<void> {
        try {
            const persist = await this.persist.getItem('custom service names');
            if (persist) this.customNames = persist.customNames ?? {};
        } catch (err) {
            logError(this.log, 'Load custom names', err);
        } finally {
            this.busyPromise = undefined;
        }
    }

    // Save changes to the custom names
    async saveCustomNames(): Promise<void> {
        try {
            await this.persist.setItem('custom service names', { customNames: this.customNames });
        } catch (err) {
            logError(this.log, 'Save custom names', err);
        } finally {
            this.busyPromise = undefined;
        }
    }
}