// Homebridge plugin for Home Connect home appliances
// Copyright © 2023 Alexander Thoukydides

import { Logger, PlatformConfig } from 'homebridge';

import { setImmediate as setImmediateP } from 'timers/promises';
import NodePersist from 'node-persist';

import { HomeAppliance } from '../api-types';
import { logError } from '../log-error';

// Appliance programs and their options
export interface SchemaProgram {
    key:                    string;
    name:                   string;
}
export type SchemaProgramOptionType = 'number' | 'integer' | 'boolean' | 'string';
export type SchemaProgramOptionValue = number | boolean | string;
export interface SchemaEnumValue {
    key:                    SchemaProgramOptionValue;
    name:                   string;
}
export interface SchemaProgramOption {
    key:                    string;
    name:                   string;
    type:                   SchemaProgramOptionType;
    suffix?:                string;
    default?:               SchemaProgramOptionValue;
    minimum?:               number;
    maximum?:               number;
    multipleOf?:            number;
    values?:                SchemaEnumValue[];
}
export interface SchemaProgramWithOptions extends SchemaProgram {
    options?:               SchemaProgramOption[];
}

// Definte an optional feature supported by an appliance
export interface SchemaOptionalFeature {
    group:                  string;
    name:                   string;
    service:                string;
    enableByDefault:        boolean;
}

// Details of appliances and their configuration options
export interface SchemaAppliance extends HomeAppliance {
    hasControl:             boolean;
    programs:               SchemaProgramWithOptions[];
    features:               SchemaOptionalFeature[];
}

// Appliance data required for the configuration schema generato
export class ConfigSchemaData {

    // The configuration currently being used by the plugin
    config?:                PlatformConfig;

    // Details of known appliances, indexed by haId
    appliances:             Record<string, SchemaAppliance> = {};

    // Promise fulfilled when any previous state has been restored
    loadPromise?:           Promise<void>;

    // Deferred schema write
    pendingSavePromise?:    Promise<void>;
    savePromise?:           Promise<void>;

    // Create a new schema generator
    constructor(
        readonly log:       Logger,
        readonly persist:   NodePersist.LocalStorage
    ) {}

    // Update the active plugin configuration
    async setConfig(config: PlatformConfig): Promise<void> {
        await this.load();
        this.config = config;
        await this.save();
    }

    // Update the list of accessories
    async setAppliances(newAppliances: HomeAppliance[]): Promise<void> {
        await this.load();
        const appliances: Record<string, SchemaAppliance> = {};
        for (const ha of newAppliances) {
            const appliance = { ...this.appliances[ha.haId], ...ha };
            appliance.programs ??= [];
            appliance.features ??= [];
            appliances[ha.haId] = appliance;
        }
        this.appliances = appliances;
        await this.save();
    }

    // Set whether the Control scope has been authorised for an appliance
    async setHasControl(haId: string, control: boolean): Promise<void> {
        await this.load();
        const appliance = this.appliances[haId];
        if (appliance) appliance.hasControl = control;
        await this.save();
    }

    // Add the list of optional features for an appliance to the schema
    async setOptionalFeatures(haId: string, features: SchemaOptionalFeature[]): Promise<void> {
        await this.load();
        const appliance = this.appliances[haId];
        if (appliance) appliance.features = features;
        await this.save();
    }

    // Add the list of programs for an appliance to the schema
    async setPrograms(haId: string, newPrograms: SchemaProgram[]): Promise<void> {
        await this.load();
        const appliance = this.appliances[haId];
        if (!appliance) return;
        const findProgram = (key: string) => appliance?.programs.find(p => p.key === key);
        appliance.programs = newPrograms.map(program => ({ ...findProgram(program.key), ...program }));
        await this.save();
    }

    // Add the options for an appliance program to the schema
    async setProgramOptions(haId: string, programKey: string, options: SchemaProgramOption[]): Promise<void> {
        await this.load();
        const appliance = this.appliances[haId];
        const program = appliance?.programs.find(p => p.key === programKey);
        if (program) program.options = options;
        await this.save();
    }

    // Read any previously saved data
    load(reload: boolean = false): Promise<void> {
        const doLoad = async () => {
            try {
                const persist = await this.persist.getItem('config.schema.json');
                if (persist) {
                    this.config     = persist.config;
                    this.appliances = persist.appliances ?? {};
                }
            } catch (err) {
                logError(this.log, 'Failed to load configuration schema data', err);
            }
        };
        this.loadPromise = (reload ? undefined : this.loadPromise) ?? doLoad();
        return this.loadPromise;
    }

    // Schedule saving the schema data following any changes
    save(): Promise<void> {
        this.pendingSavePromise ??= this.savePending();
        return this.pendingSavePromise;
    }

    // Wait for any previous save to complete and then save a new version
    async savePending(): Promise<void> {
        await this.savePromise;
        await setImmediateP();

        // Perform the schema write
        const doSave = async () => {
            try {
                await this.persist.setItem('config.schema.json', {
                    config:     this.config,
                    appliances: this.appliances
                });
            } catch (err) {
                logError(this.log, 'Failed to save configuration schema data', err);
            }
        };
        this.log.debug('Saving configuration schema data');
        this.pendingSavePromise = undefined;
        this.savePromise = doSave();
        await this.savePromise;
        this.savePromise = undefined;
    }
}