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

    // Avoid overlapping persistent store operations
    loadPromise?:           Promise<void>;
    savePromise?:           Promise<void>;
    busyPromise?:           Promise<void>;

    // Create a new schema generator
    constructor(
        readonly log:       Logger,
        readonly persist:   NodePersist.LocalStorage
    ) {}

    // Update the active plugin configuration
    setConfig(config: PlatformConfig): Promise<void> {
        return this.applyUpdate(() => {
            this.config = config;
        });
    }

    // Update the list of accessories
    setAppliances(newAppliances: HomeAppliance[]): Promise<void> {
        return this.applyUpdate(() => {
            const appliances: Record<string, SchemaAppliance> = {};
            for (const ha of newAppliances) {
                const appliance = { ...this.appliances[ha.haId], ...ha };
                appliance.programs ??= [];
                appliance.features ??= [];
                appliances[ha.haId] = appliance;
            }
            this.appliances = appliances;
        });
    }

    // Set whether the Control scope has been authorised for an appliance
    setHasControl(haId: string, control: boolean): Promise<void> {
        return this.applyUpdate(() => {
            const appliance = this.appliances[haId];
            if (appliance) appliance.hasControl = control;
        });
    }

    // Add the list of optional features for an appliance to the schema
    setOptionalFeatures(haId: string, features: SchemaOptionalFeature[]): Promise<void> {
        return this.applyUpdate(() => {
            const appliance = this.appliances[haId];
            if (appliance) appliance.features = features;
        });
    }

    // Add the list of programs for an appliance to the schema
    setPrograms(haId: string, newPrograms: SchemaProgram[]): Promise<void> {
        return this.applyUpdate(() => {
            const appliance = this.appliances[haId];
            if (!appliance) return;
            const findProgram = (key: string) => appliance?.programs.find(p => p.key === key);
            appliance.programs = newPrograms.map(program => ({ ...findProgram(program.key), ...program }));
        });
    }

    // Add the options for an appliance program to the schema
    setProgramOptions(haId: string, programKey: string, options: SchemaProgramOption[]): Promise<void> {
        return this.applyUpdate(() => {
            const appliance = this.appliances[haId];
            const program = appliance?.programs.find(p => p.key === programKey);
            if (program) program.options = options;
        });
    }

    // Apply an update to the schema data
    async applyUpdate(update: () => void): Promise<void> {
        // Load the old schema data
        await this.load();

        // Perform the required update
        update();

        // Save the updated data
        const save = async () => {
            // Coalesce updates from the same event loop
            await setImmediateP();

            // Perform the write
            this.exclusive(async () => {
                delete this.savePromise;
                this.log.debug('Saving configuration schema data');
                await this.trySet();
            });
        };
        this.savePromise ??= save();
        await this.savePromise;
    }

    // Read any previously saved data
    async load(reload: boolean = false): Promise<void> {
        if (reload || !this.loadPromise)
            this.loadPromise = this.exclusive(() => this.tryGet());
        await this.loadPromise;
    }

    // Perform an operation that must be exclusive
    async exclusive(operation: () => Promise<void>): Promise<void> {
        // Wait for any previous operation to complete
        while (this.busyPromise) await this.busyPromise;

        // Perform the requested operation
        const busyOperation = async () => {
            try {
                await operation();
            } finally {
                delete this.busyPromise;
            }
        };
        this.busyPromise = busyOperation();
        await this.busyPromise;
    }

    // Attempt to read previously saved data
    async tryGet(): Promise<void> {
        try {
            const persist = await this.persist.getItem('config.schema.json');
            if (persist) {
                this.config     = persist.config;
                this.appliances = persist.appliances ?? {};
            }
        } catch (err) {
            logError(this.log, 'Failed to load configuration schema data', err);
        }
    }

    // Attempt to write new data
    async trySet(): Promise<void> {
        try {
            await this.persist.setItem('config.schema.json', {
                config:     this.config,
                appliances: this.appliances
            });
        } catch (err) {
            logError(this.log, 'Failed to save configuration schema data', err);
        }
    }
}