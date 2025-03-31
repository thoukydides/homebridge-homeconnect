// Homebridge plugin for Home Connect home appliances
// Copyright © 2023 Alexander Thoukydides

import '@homebridge/plugin-ui-utils/dist/ui.interface.js';
import { PluginConfig } from '@homebridge/plugin-ui-utils/dist/ui.interface.js';
import { Logger, PlatformConfig } from 'homebridge';

import { ApplianceConfig, ConfigAppliances, ConfigPlugin } from '../../config-types.js';
import { keyofChecker } from '../../utils.js';
import { ClientIPC } from './client-ipc.js';
import { cloneTemplate, getElementById } from './utils-dom.js';
import { typeSuite } from '../../ti/config-types.js';

// A delta between two configurations
export interface ConfigDiff {
    key:    string;
    from:   unknown;
    to:     unknown;
}

// The current plugin configuration
export class Config {

    // The saved configuration
    savedConfig?:   PluginConfig;

    // The configuration being edited
    global:         Partial<ConfigPlugin> = {};
    appliances:     ConfigAppliances = {};
    onGlobal?:      (global: Partial<ConfigPlugin>) => void;

    // Promises for retrieving the current configurations
    readyPromise:   Promise<void>;
    activePromise:  Promise<PlatformConfig>;

    // Create a new configuration object
    constructor(readonly log: Logger,
                readonly ipc: ClientIPC) {
        this.readyPromise  = this.getConfig();
        this.activePromise = this.getActiveConfig();
    }

    // Retrieve and parse the configuration to be edited
    async getConfig(): Promise<void> {
        // Retrieve the current plugin configuration (if any)
        const configArray = await window.homebridge.getPluginConfig();
        if (configArray[0] === undefined) {
            this.log.warn('No plugin configuration found; creating a new one');
            this.savedConfig = { platform: window.homebridge.plugin.displayName };
        } else {
            if (1 < configArray.length) {
                this.log.error(`Using the first of ${configArray.length} plugin configurations`, configArray);
                window.homebridge.toast.error('Only a single platform instance is supported; using the first',
                                              'Multiple Configuration Blocks');
            }
            this.savedConfig = configArray[0];
            this.checkIfModified(this.savedConfig);
        }

        // Treat all unexpected properties as appliance configurations
        const keyofConfigPlugin = keyofChecker(typeSuite, typeSuite.ConfigPlugin);
        const select = (predicate: ([key, value]: [string, unknown]) => boolean): Record<string, unknown> =>
            Object.fromEntries(Object.entries(this.savedConfig ?? {}).filter(predicate));
        this.global     = select(([key]) =>  keyofConfigPlugin.includes(key)) as Partial<ConfigPlugin>;
        this.appliances = select(([key]) => !keyofConfigPlugin.includes(key)) as ConfigAppliances;
        this.log.debug('getConfig() global %O appliances %O', this.global, this.appliances);
        this.onGlobal?.(this.global);
    }

    // Retrieve the most recently used configuration
    async getActiveConfig(): Promise<PlatformConfig> {
        try {
            return await this.ipc.request('/config', null);
        } catch {
            return {} as PlatformConfig;
        }
    }

    // Update the homebridge-ui-x copy of the configuration
    async putConfig(save = false): Promise<void> {
        // Construct the full configuration
        const config = { ...this.global, ...this.appliances };
        this.log.debug(`putConfig(${save})'}`, config);

        // Inform homebridge-ui-x of the new configuration
        await window.homebridge.updatePluginConfig([config]);
        if (save) {
            await window.homebridge.savePluginConfig();
            this.savedConfig = config;
            this.log.info('Plugin configuration saved');
        }

        // Check whether the configuration matches the active plugin
        this.checkIfModified(config);
    }

    // Compare two configuration objects
    diffObject(to: object, from: object, keyPrefix = ''): ConfigDiff[] {
        const keys = [...Object.keys(to), ...Object.keys(from)]
            .filter((key, index, self) => index === self.indexOf(key) && key !== '_bridge');
        const diff: ConfigDiff[]  = [];
        for (const key of keys) {
            const valueTo   = to  [key as never];
            const valueFrom = from[key as never];
            const keyName = `${keyPrefix}.${key}`;
            const isObject = (value: unknown): boolean => value !== undefined && typeof value === 'object';
            if (Array.isArray(valueTo) && Array.isArray(valueFrom)) diff.push(...this.diffArray (valueTo, valueFrom, keyName));
            else if (isObject(valueTo) && isObject(valueFrom))      diff.push(...this.diffObject(valueTo, valueFrom, keyName));
            else if (valueTo !== valueFrom) diff.push({ key: keyName, from: valueFrom, to: valueTo });
        }
        return diff;
    }

    // Compare two configuration arrays
    diffArray(to: unknown[], from: unknown[], keyPrefix = ''): ConfigDiff[] {
        const isSimple = (array: unknown[]): boolean => array.length !== 0 && typeof array[0] !== 'object';
        if (isSimple(to) || isSimple(from)) {
            if (to.length === from.length && to.every((value, index) => value === from[index])) return [];
            else return [{ key: keyPrefix, from, to }];
        } else {
            return this.diffObject(to, from, keyPrefix);
        }
    }

    // Check whether the configuration has been modified
    async checkIfModified(config: PluginConfig): Promise<void> {
        // Ignore completely new/empty configuration
        if (!Object.keys(config).length) return;

        // Compare the configuration to the active plugin and saved versions
        const activeConfig = await this.activePromise;
        const activeDiff = this.diffObject(config, activeConfig);
        const savedDiff = this.diffObject(config, this.savedConfig ?? {});
        if (activeDiff.length || savedDiff.length) {
            this.log.debug('checkIfModified(%O) active %O saved %O', config, activeDiff, savedDiff);
        }

        // Hide or show the restart required message
        this.showRestartRequired(activeDiff, 0 < savedDiff.length);
    }

    // Show or hide the restart required message
    showRestartRequired(changes: ConfigDiff[], isUnsaved: boolean): void {
        // Show the message if there are any differences
        getElementById('hc-modified').hidden = changes.length === 0 && !isUnsaved;
        getElementById('hc-modified-saved')  .hidden = isUnsaved;
        getElementById('hc-modified-unsaved').hidden = !isUnsaved;

        // Display the diff
        const formatValue = (value: unknown): string => JSON.stringify(value, null, 4);
        getElementById('hc-modified-diff').replaceChildren(...changes.map(change =>
            cloneTemplate('hc-modified-diff-delta', {
                key:    change.key,
                from:   formatValue(change.from),
                to:     formatValue(change.to)
            })));
    }

    // Get the current global configuration
    async getGlobal(): Promise<Partial<ConfigPlugin>> {
        await this.readyPromise;
        return this.global;
    }

    // Set updated global configuration
    async setGlobal(config: ConfigPlugin): Promise<void> {
        if (this.diffObject(config, await this.getGlobal()).length) {
            this.log.debug('setGlobal(%O)', config);
            this.global = config;
            this.onGlobal?.(config);
            await this.putConfig();
        }
    }

    // Get the current configuration for a specific appliance
    async getAppliance(haid: string): Promise<ApplianceConfig> {
        await this.readyPromise;
        return this.appliances[haid] ?? {};
    }

    // Set updated global configuration
    async setAppliance(haid: string, config: ApplianceConfig): Promise<void> {
        if (this.diffObject(config, await this.getAppliance(haid)).length) {
            this.log.debug(`setAppliance("${haid}", %O)`, config);
            this.appliances[haid] = config;
            await this.putConfig();
        }
    }
}