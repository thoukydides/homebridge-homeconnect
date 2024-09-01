// Homebridge plugin for Home Connect home appliances
// Copyright © 2023 Alexander Thoukydides

import { Logger, PlatformConfig } from 'homebridge';

import { setImmediate as setImmediateP } from 'timers/promises';
import NodePersist from 'node-persist';

import { HomeAppliance } from '../api-types.js';
import { logError } from '../log-error.js';

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

// Define an optional feature supported by an appliance
export interface SchemaOptionalFeature {
    group:                  string;
    name:                   string;
    service:                string;
    enableByDefault:        boolean;
}

// Details of appliances and their configuration options
export interface SchemaAppliance extends HomeAppliance {
    hasControl?:            boolean;
    programs:               SchemaProgramWithOptions[];
    features:               SchemaOptionalFeature[];
}

// Format for the persistent data
interface PersistData {
    config?:                PlatformConfig;
    appliances?:            Record<string, SchemaAppliance>;
}

// Appliance data required for the configuration schema generator
export class ConfigSchemaData {

    // The configuration currently being used by the plugin
    config?:                PlatformConfig;

    // Details of known appliances, indexed by haId
    appliances = new Map<string, SchemaAppliance>();

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
    async setConfig(config: PlatformConfig): Promise<void> {
        await this.applyUpdate(() => {
            this.config = config;
        });
    }

    // Update the list of accessories
    async setAppliances(newAppliances: HomeAppliance[]): Promise<void> {
        await this.applyUpdate(() => {
            const appliances = new Map<string, SchemaAppliance>();
            for (const ha of newAppliances) {
                const appliance = {
                    programs:   [],
                    features:   [],
                    ...this.appliances.get(ha.haId),
                    ...ha
                };
                appliances.set(ha.haId, appliance);
            }
            this.appliances = appliances;
        });
    }

    // Set whether the Control scope has been authorised for an appliance
    async setHasControl(haId: string, control: boolean): Promise<void> {
        await this.applyUpdate(() => {
            const appliance = this.appliances.get(haId);
            if (appliance) appliance.hasControl = control;
        });
    }

    // Add the list of optional features for an appliance to the schema
    async setOptionalFeatures(haId: string, features: SchemaOptionalFeature[]): Promise<void> {
        await this.applyUpdate(() => {
            const appliance = this.appliances.get(haId);
            if (appliance) appliance.features = features;
        });
    }

    // Add the list of programs for an appliance to the schema
    async setPrograms(haId: string, newPrograms: SchemaProgram[]): Promise<void> {
        await this.applyUpdate(() => {
            const appliance = this.appliances.get(haId);
            if (!appliance) return;
            const findProgram = (key: string): SchemaProgramWithOptions | undefined => appliance.programs.find(p => p.key === key);
            appliance.programs = newPrograms.map(program => ({ ...findProgram(program.key), ...program }));
        });
    }

    // Add the options for an appliance program to the schema
    async setProgramOptions(haId: string, programKey: string, options: SchemaProgramOption[]): Promise<void> {
        await this.applyUpdate(() => {
            const appliance = this.appliances.get(haId);
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
        const save = async (): Promise<void> => {
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
    async load(reload = false): Promise<void> {
        if (reload || !this.loadPromise)
            this.loadPromise = this.exclusive(() => this.tryGet());
        await this.loadPromise;
    }

    // Perform an operation that must be exclusive
    async exclusive(operation: () => Promise<void>): Promise<void> {
        // Wait for any previous operation to complete
        while (this.busyPromise) await this.busyPromise;

        // Perform the requested operation
        const busyOperation = async (): Promise<void> => {
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
            const persist = await this.persist.getItem('config.schema.json') as PersistData | undefined;
            if (persist) {
                this.config     = persist.config;
                this.appliances = new Map(Object.entries(persist.appliances ?? {}));
            }
        } catch (err) {
            logError(this.log, 'Failed to load configuration schema data', err);
        }
    }

    // Attempt to write new data
    async trySet(): Promise<void> {
        try {
            const persist: PersistData = {
                config:     this.config,
                appliances: Object.fromEntries(this.appliances)
            };
            await this.persist.setItem('config.schema.json', persist);
        } catch (err) {
            logError(this.log, 'Failed to save configuration schema data', err);
        }
    }
}