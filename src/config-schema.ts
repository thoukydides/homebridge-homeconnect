/* eslint-disable max-len */
/* eslint-disable no-console */
// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2023 Alexander Thoukydides

import { Logger } from 'homebridge';

import NodePersist from 'node-persist';
import { join } from 'path';
import { promises } from 'fs';
import { setTimeout as setTimeoutP } from 'timers/promises';

import { HOMEBRIDGE_LANGUAGES } from './api-languages';
import { MS } from './utils';
import { DEFAULT_CONFIG, PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { AuthorisationURI } from './api-ua-auth';
import { ProgramKey } from './api-value-types';
import { HomeAppliance } from './api-types';
import assert from 'assert';

// Schema version to indicate incompatible changes to homebridge-config-ui-x
const SCHEMA_VERSION = 1;

// Header and footer (may contain Markdown but not HTML tags)
const HEADER = 'For help please refer to the [README](https://github.com/thoukydides/homebridge-homeconnect/blob/master/README.md) and [`config.json`](https://github.com/thoukydides/homebridge-homeconnect/wiki/config.json).';
const HEADER_DEFAULT = '*This is a temporary configuration schema for initial setup only. When the plugin runs it will replace this schema with one tailored to the available Home Connect appliances.*\n\n*Update [homebridge-config-ui-x](https://github.com/oznu/homebridge-config-ui-x) to version 4.8.1 or later if this message remains after the Home Connect Client has been configured.*\n\n' + HEADER;
const FOOTER = '© 2019-2023 [Alexander Thoukydides](https://www.thouky.co.uk/)';

// Maximum number of enum values for numeric types with multipleOf constraint
const MAX_ENUM_STEPS = 18;

// Delay before writing the schema to allow multiple updates to be applied
const WRITE_DELAY = 3 * MS;

// Schema management for a single accessory
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
export interface SchemaUpdateFunctions {
    setHasControl:          (control: boolean) => void;
    setPrograms:            (newPrograms: SchemaProgram[]) => void;
    setProgramOptions:      (programKey: ProgramKey, options: SchemaProgramOption[]) => void;
}

// Details of appliances and their configuration options
export interface SchemaProgramWithOptions extends SchemaProgram {
    options?:               SchemaProgramOption[];
}
export interface SchemaAppliance extends HomeAppliance {
    programs:               SchemaProgramWithOptions[];
    hasControl:             boolean;
}

// Component of a config schema
export interface JSONSchemaEnumValue<Type> {
    title:                  string;
    const:                  Type;
}
export interface JSONSchemaArray {
    type:                   'array';
    items:                  JSONSchema;
    minItems?:              number;
    maxItems?:              number;
    uniqueItems?:           boolean;
    default?:               unknown[];
}
export interface JSONSchemaValue {
    type:                   SchemaProgramOptionType;
    default?:               SchemaProgramOptionValue;
    enum?:                  SchemaProgramOptionValue[];
    oneOf?:                 JSONSchemaEnumValue<SchemaProgramOptionValue>[];
    minimum?:               number;
    maximum?:               number;
    multipleOf?:            number;
    minLength?:             number;
    maxLength?:             number;
    pattern?:               string;
}
export type JSONSchemaProperties = Record<string, JSONSchema>;
export interface JSONSchemaObject {
    type:                   'object';
    properties:             JSONSchemaProperties;
}
export type JSONSchema = (JSONSchemaArray | JSONSchemaValue | JSONSchemaObject) & {
    required?:              boolean;
};

// Angular schema form definition
export interface FormItemCommon<Type = SchemaProgramOptionValue> {
    key?:                   string;
    title?:                 string;
    notitle?:               boolean;
    description?:           string;
    validationMessage?:     string;
    placeholder?:           Type;
    condition?: {
        functionBody:       string;
    };
    expandable?:            boolean;
    expanded?:              boolean;
    startEmpty?:            boolean;
}
export interface FormItemValue<Type = SchemaProgramOptionValue> extends FormItemCommon<Type> {
    type?:                  'input' | 'number' | 'select' | 'checkboxes' | 'radio' | 'radiobuttons';
    fieldAddonLeft?:        string;
    fieldAddonRight?:       string;
    minimum?:               number;
    maximum?:               number;
    multipleOf?:            number;
    default?:               Type;
    oneOf?:                 JSONSchemaEnumValue<Type>[];
    titleMap?:              Record<string, string>;
}
//export type FormItemValue = FormItemSimple | FormItemSelect;
export interface FormItemGroup extends FormItemCommon {
    type:                   'fieldset' | 'flex';
    items:                  FormItem[];
    'flex-flow'?:           string;
}
export interface FormItemHelp extends FormItemCommon {
    type:                   'help';
    helpvalue:              string;
}
export type FormItem = FormItemValue | FormItemGroup | FormItemHelp;

// Config schema for homebridge-ui-x config
export interface SchemaFormFragment {
    schema:                 JSONSchemaProperties;
    form:                   FormItem[];
    code?:                  string;
}
export interface PluginSchema {
  pluginAlias:              string;
  pluginType:               string;
  dynamicSchemaVersion?:    number;
  singular?:                boolean;
  headerDisplay?:           string;
  footerDisplay?:           string;
  schema?:                  JSONSchema;
  layout?:                  unknown;
  form?:                    FormItem[];
  display?:                 null;
}

// Schema generator for the Homebridge config.json configuration file
export class ConfigSchema {

    // Full path to the schema file
    readonly schemaFile: string;

    // Details of known appliances, indexed by haId
    appliances: Record<string, SchemaAppliance> = {};

    // Promise fulfilled when any previous state has been restored
    readonly readyPromise: Promise<void>;

    // Deferred schema write
    pendingWritePromise?: Promise<void>;
    activeWritePromise?: Promise<void>;

    // Home Connect authorisation URI if available or authorisation status
    authorisation: AuthorisationURI | boolean = false;

    // The most recently saved schema (as a JSON string)
    oldSchema?: string;

    // Create a new schema generator
    constructor(
        readonly logRaw?:   Logger,
        readonly persist?:  NodePersist.LocalStorage,
        path?:              string
    ) {
        // Construct the full path to the schema file
        this.schemaFile = path ? join(path, `.${PLUGIN_NAME}-v${SCHEMA_VERSION}.schema.json`)
                               : join(__dirname, '../config.schema.json');
        // Initial state
        this.appliances = {};

        // Read any previous schema and persistent state
        this.readyPromise = this.readSchema();
    }

    // Update the schema if the user needs to authorise the client
    async setAuthorised(uri: AuthorisationURI | null): Promise<void> {
        // Set the verification URI or authorisation status
        await this.readyPromise;
        this.authorisation = uri ?? true;
        this.writeSchema();

        // Expire the authorisation URI
        if (uri !== null && uri.expires) {
            await setTimeoutP(uri.expires - Date.now());
            this.authorisation = false;
            this.writeSchema();
        }
    }

    // Update the list of accessories
    async setAppliances(newAppliances: HomeAppliance[]): Promise<void> {
        await this.readyPromise;
        this.authorisation = true;
        const appliances: Record<string, SchemaAppliance> = {};
        for (const ha of newAppliances) {
            const appliance = Object.assign({}, this.appliances[ha.haId], ha);
            if (!appliance.programs) appliance.programs = [];
            appliances[ha.haId] = appliance;
        }
        this.appliances = appliances;
        this.writeSchema();
    }

    // Obtain the schema management for a single accessory
    getAppliance(haId: string): SchemaUpdateFunctions {

        // Locate the object for the specified program key
        const findProgram = (programKey: string): SchemaProgramWithOptions | undefined => {
            const appliance = this.appliances[haId];
            return appliance?.programs.find(p => p.key === programKey);
        };

        // Return the methods that the accessory can use to update the schema
        return {
            // Set whether the Control scope has been authorised
            setHasControl: control => {
                const appliance = this.appliances[haId];
                if (!appliance) return;
                appliance.hasControl = control;
                this.writeSchema();
            },

            // Add the list of programs to the schema
            setPrograms: newPrograms => {
                const appliance = this.appliances[haId];
                if (!appliance) return;
                appliance.programs = newPrograms.map(program => Object.assign({}, findProgram(program.key), program));
                this.writeSchema();
            },

            // Add the options for a program to the schema
            setProgramOptions: (programKey, options) => {
                const program = findProgram(programKey);
                if (!program) return;
                program.options = options;
                this.writeSchema();
            }
        };
    }

    // Convert the supported Home Connect API languages into a schema
    getSchemaHomeConnectLanguages(): JSONSchema {
        // Flatten the supported languages
        const languages = [];
        for (const [language, countries] of Object.entries(HOMEBRIDGE_LANGUAGES)) {
            const single = Object.keys(countries).length === 1;
            for (const [country, tag] of Object.entries(countries)) {
                let title = language;
                if (!single) title += `: ${country} - ${language}`;
                languages.push({
                    title:  title,
                    const:  tag
                });
            }
        }

        // Return the configuration schema for the language choices
        return {
            type:       'string',
            default:    DEFAULT_CONFIG.language?.api ?? '',
            oneOf:      languages,
            required:   true
        };
    }

    // Construct a schema for the Home Connect Client
    getSchemaClient(): SchemaFormFragment {
        const schema: JSONSchemaProperties = {
            clientid: {
                type:       'string',
                minLength:  64,
                maxLength:  64,
                pattern:    '^[0-9A-Fa-f]+$',
                required:   true
            },
            simulator: {
                type:       'boolean',
                default:    false,
                required:   true
            },
            language: {
                type:       'object',
                properties: {
                    api:    this.getSchemaHomeConnectLanguages()
                }
            }
        };
        const form: FormItem[] = [{
            key:            'simulator',
            title:          'Client Type',
            type:           'select',
            titleMap: {
                false:      'Physical Appliances (production server)',
                true:       'Simulated Appliances (test server)'
            }
        }, {
            key:            'clientid',
            title:          'Client ID',
            description:    'Create an application via the <a href="https://developer.home-connect.com/applications">Home Connect Developer Program</a>, with <strong>OAuth Flow</strong> set to <strong>Device Flow</strong>.',
            placeholder:    'e.g. 0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF',
            condition: {
                functionBody: 'return !model.simulator'
            }
        }, {
            key:            'clientid',
            title:          'Client ID',
            description:    'Enter the Client ID for the automatically generated <a href="https://developer.home-connect.com/applications">API Web Client</a> to use the <a href="https://developer.home-connect.com/simulator">Appliance Simulators</a>.<br>Use this to test the functionality of this plugin without requiring access to physical appliances.',
            placeholder:    'e.g. 0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF',
            condition: {
                functionBody: 'return model.simulator'
            }
        }, {
            key:            'language.api',
            title:          'API Language',
            description:    'This changes the language used for program names and their options.',
            condition: {
                functionBody: 'return !model.simulator && model.clientid'
            }
        }];
        return { schema, form };
    }

    // Construct any authorisation help to include in the schema
    getSchemaAuthorisation(): FormItem | undefined {
        if (this.authorisation === true) {

            // Authorisation complete
            return;

        } else if (this.authorisation) {

            // Authorisation is required via the provided URI
            return {
                type:       'help',
                helpvalue:  '<em class="primary-text">AUTHORISATION REQUIRED</em><br>To authorise this plugin to access your Home Connect appliances please visit:<div align=center><a href="' + this.authorisation.uri + '">' + this.authorisation.uri + '</a></div>'
            };

        } else {

            // Not authorised, so warn if using physical appliances
            return {
                type:       'help',
                helpvalue:  '<p>This plugin requires authorisation to access Home Connect appliances.</p><p>The authorisation link will appear here (and in the Homebridge log file) after the Client ID has been configured and the plugin started.</p>',
                condition: {
                    functionBody: 'return !model.simulator && model.clientid'
                }
            };
        }
    }

    // Construct a schema for an appliance
    getSchemaAppliance(appliance: SchemaAppliance, keyPrefix: string): SchemaFormFragment {
        const schema: JSONSchemaProperties = {};
        const form: FormItem[] = [{
            type:       'help',
            helpvalue:  `${appliance.brand} ${appliance.type} (E-Nr: ${appliance.enumber})`
        }];
        let code = '';

        // Add any programs supported by the appliance
        const programs = appliance.programs;
        if (programs.length) {
            const keyArrayPrefix = `${keyPrefix}.programs[]`;
            const keyConditionPrefix = `model["${keyPrefix}"].programs[arrayIndices[arrayIndices.length-1]]`;

            // Values that are common to all programs
            let programForm: FormItem[] = [{
                key:            `${keyArrayPrefix}.name`,
                title:          'HomeKit Name',
                placeholder:    `e.g. My ${appliance.type} Program`
            }, {
                // (a valid array-element key is required for some reason)
                key:            `${keyArrayPrefix}.key`,
                type:           'flex',
                'flex-flow':    'row',
                notitle:        true,
                items: [{
                    key:            `${keyArrayPrefix}.selectonly`,
                    title:          'Action',
                    type:           'select',
                    titleMap: {
                        false:      'Start program',
                        true:       'Select program'
                    }
                }, {
                    key:            `${keyArrayPrefix}.key`,
                    title:          'Appliance Program'
                }]
            }];

            // Add the superset of all program options to the schema
            const optionsSchema: JSONSchemaProperties = {};
            for (const program of programs) {
                for (const option of program.options ?? []) {
                    let optionSchema = optionsSchema[option.key];
                    if (!optionSchema) optionSchema = optionsSchema[option.key] = { type: option.type };

                    // Apply restrictions to numeric types
                    if (optionSchema.type === 'integer' || optionSchema.type === 'number') {
                        if (option.minimum !== undefined) {
                            optionSchema.minimum = Math.min(optionSchema.minimum ?? Infinity, option.minimum);
                        }
                        if (option.maximum !== undefined) {
                            optionSchema.maximum = Math.max(optionSchema.maximum ?? -Infinity, option.maximum);
                        }
                        if (option.multipleOf) {
                            const gcd = (x: number, y?: number): number => y ? gcd(y, x % y) : x;
                            optionSchema.multipleOf = gcd(option.multipleOf, optionSchema.multipleOf);
                        }
                    }

                    // Allowed values for (string) enum types
                    if (optionSchema.type !== 'array' && optionSchema.type !== 'object' && option.values) {
                        optionSchema.enum ??= [];
                        for (const mapping of option.values) {
                            if (!optionSchema.enum.includes(mapping.key)) optionSchema.enum.push(mapping.key);
                        }
                    }
                }
            }

            // Add per-program options to the form
            for (const program of programs) {
                const programCondition = `${keyConditionPrefix}.key == "${program.key}"`;

                // Add form items to customise the schema for this program
                for (let option of program.options ?? []) {
                    const schemaKey = `${keyArrayPrefix}.options.['${option.key}']`;
                    const formOption: FormItemValue = {
                        key:        schemaKey,
                        title:      option.name,
                        condition:  {
                            functionBody: `try { return ${programCondition}; } catch (err) { return false; }`
                        }
                    };

                    // Treat restricted numeric types as enum types
                    if (option.minimum !== undefined && option.maximum !== undefined && option.multipleOf
                        && (option.maximum - option.minimum) / option.multipleOf <= MAX_ENUM_STEPS) {
                        const suffix = option.suffix ? ` ${option.suffix}` : '';
                        const mappings = [];
                        for (let value = option.minimum; value <= option.maximum; value += option.multipleOf) {
                            mappings.push({ name: value + suffix, key: value });
                        }
                        option = { values: mappings } as SchemaProgramOption;
                    }

                    // Range limit and units for numeric types
                    if (option.minimum    !== undefined) formOption.minimum    = option.minimum;
                    if (option.maximum    !== undefined) formOption.maximum    = option.maximum;
                    if (option.multipleOf !== undefined) formOption.multipleOf = option.multipleOf;
                    if (option.type === 'integer' || option.type === 'number') formOption.type = 'number';
                    if (option.suffix) {
                        formOption.fieldAddonRight = `&nbsp;${option.suffix}`;
                    }
                    if (option.minimum !== undefined && option.maximum !== undefined) {
                        const suffix = option.suffix ? ` ${option.suffix}` : '';
                        formOption.description = `Supported range: ${option.minimum} to ${option.maximum}${suffix}`;
                        if (option.multipleOf) formOption.description += `, in steps of ${option.multipleOf}${suffix}`;
                    }

                    // Allowed values for enum types
                    if (option.values) {
                        formOption.titleMap = {};
                        for (const mapping of option.values) {
                            formOption.titleMap[mapping.key.toString()] = mapping.name;
                        }
                    }

                    // If there is a default then add it as placeholder text
                    if (option.default !== undefined) {
                        const defaultValue = option.default.toString();
                        const value = formOption.titleMap?.[defaultValue] ?? defaultValue;
                        formOption.placeholder = `e.g. ${value}`;
                    }
                    programForm.push(formOption);
                }

                // Add form items to remove options unsupported by this program
                const supported = (program.options ?? []).map(option => option.key);
                const unsupported = Object.keys(optionsSchema).filter(key => !supported.includes(key));
                if (unsupported.length) {
                    programForm.push({
                        key:        `${keyArrayPrefix}.options.['${unsupported[0]}']`,
                        condition: {
                            functionBody: `try { if (${programCondition}) { let options = ${keyConditionPrefix}.options;${unsupported.map(key => ` delete options["${key}"];`).join('')} } } catch (err) {} return false;`
                        }
                    });
                }
            }

            // Hide most of the options if Control scope has not been authorised
            if (appliance.hasControl === false) {
                assert(programForm[1].type === 'flex');
                programForm = [programForm[0], programForm[1].items[1]];
            }

            // Add a choice of how to handle programs to the schema
            schema.addprograms = {
                type:       'string',
                oneOf: [{
                    title:  'No individual program switches',
                    const:  'none'
                }, {
                    title:  `A switch to start each ${appliance.name} program`,
                    const:  'auto'
                }, {
                    title:  'Custom list of programs and options',
                    const:  'custom'
                }],
                default:    'auto',
                required:   true
            };

            // Add an array of programs to the schema
            schema.programs = {
                type:           'array',
                uniqueItems:    true,
                items: {
                    type:       'object',
                    properties: {
                        name: {
                            type:       'string',
                            minLength:  1,
                            required:   true
                        },
                        key: {
                            type:       'string',
                            minLength:  1,
                            oneOf:      programs.map(program => ({
                                title:  program.name,
                                const:  program.key
                            })),
                            required:   true,
                            default:    programs[0].key
                        },
                        selectonly: {
                            type:       'boolean',
                            required:   true,
                            default:    false
                        },
                        options: {
                            type:       'object',
                            properties: optionsSchema
                        }
                    }
                }
            };
            const modelPrefix = `model["${keyPrefix}"]`;
            const programListCondition = {
                functionBody: `try { return ${modelPrefix}.addprograms == "custom"; } catch (err) { return true; }`
            };
            form.push({
                key:            `${keyPrefix}.addprograms`,
                title:          'Program Switches',
                description:    'A separate Switch service can be created for individual appliance programs. These indicate which program is running, and (if authorised) can be used to select options and start a specific program.'
            }, {
                type:           'help',
                helpvalue:      '<p>Specify a unique HomeKit Name for each program (preferably short and without punctuation).</p><p>The same Appliance Program may be used multiple times with different options.</p>',
                condition:      programListCondition
            }, {
                key:            `${keyPrefix}.programs`,
                notitle:        true,
                startEmpty:     true,
                items:          programForm,
                condition:      programListCondition
            });

            // Delete the programs member or set an empty array if appropriate
            // (workaround homebridge-config-ui-x / angular6-json-schema-form)
            code += `switch (${modelPrefix}.addprograms) {`
                  + `case "none": ${modelPrefix}.programs = [];   break;`
                  + `case "auto": delete ${modelPrefix}.programs; break;`
                  + '}';
        } else {
            // This appliance does not support any programs
            form.push({
                type:       'help',
                helpvalue:  'This appliance does not support any programs.'
            });
        }

        // Return the schema for this appliance
        return { schema, form, code };
    }

    // Construct the complete configuration schema
    getSchema(): PluginSchema {
        const schema: JSONSchema = {
            type:       'object',
            properties: {}
        };
        const form: FormItem[] = [];

        // Add the Home Connect Client
        const clientSchema = this.getSchemaClient();
        Object.assign(schema.properties, clientSchema.schema);
        form.push({
            type:       'fieldset',
            title:      'Home Connect Client',
            expandable: false,
            items:      clientSchema.form
        });

        // Add any Home Connect authorisation
        const authForm = this.getSchemaAuthorisation();
        if (authForm) clientSchema.form.push(authForm);

        // Per-appliance configuration
        const appliances = Object.values(this.appliances).sort((a, b) => a.name.localeCompare(b.name));
        for (const appliance of appliances) {
            const keyPrefix = appliance.haId;
            const appSchema = this.getSchemaAppliance(appliance, keyPrefix);
            schema.properties[appliance.haId] = {
                type:       'object',
                properties: appSchema.schema
            };
            form.push({
                type:       'fieldset',
                title:      appliance.name,
                expandable: true,
                expanded:   false,
                items:      appSchema.form,
                condition: {
                    functionBody: `try { ${appSchema.code} } catch (err) {} return true;`
                }
            });
        }

        // Return the schema
        return {
            pluginAlias:            PLATFORM_NAME,
            pluginType:             'platform',
            dynamicSchemaVersion:   SCHEMA_VERSION,
            singular:               true,
            headerDisplay:          this.persist ? HEADER : HEADER_DEFAULT,
            footerDisplay:          FOOTER,
            schema:                 schema,
            form:                   form,
            display:                null
        };
    }

    // Read any existing schema file
    async readSchema(): Promise<void> {
        // First read any persistent data
        if (this.persist) {
            try {
                const persist = await this.persist.getItem('config.schema.json');
                if (persist) Object.assign(this, persist);
            } catch (err) {
                this.log(`Failed to read configuration schema cache: ${err}`);
            }
        }

        // Then try reading a schema file (does not exist initially)
        try {
            const data = await promises.readFile(this.schemaFile, 'utf8');
            this.oldSchema = data;
        } catch (err) {
            this.debug(`Failed to read the current configuration schema: ${err}`);
        }
    }

    // Schedule writing a new schema file, if changed
    writeSchema(): Promise<void> {
        this.pendingWritePromise ??= this.writeSchemaPending();
        return this.pendingWritePromise;
    }

    // Wait for any previous write to complete and then write a new version
    async writeSchemaPending(): Promise<void> {
        // Wait for any previous write to complete and a further delay
        this.debug('Scheduling configuration schema write');
        try {
            await this.readyPromise;
            await this.activeWritePromise;
            await setTimeoutP(WRITE_DELAY);
        } catch (err) { /* empty */ }

        // Perform the schema write
        this.debug('Starting configuration schema write');
        this.pendingWritePromise = undefined;
        this.activeWritePromise = this.writeSchemaActive();
        try {
            await this.activeWritePromise;
        } catch (err) { /* empty */ }
        this.activeWritePromise = undefined;
    }

    // Write a new schema file, if changed
    async writeSchemaActive(): Promise<void> {
        // First write persistent data
        if (this.persist) {
            try {
                await this.persist.setItem('config.schema.json', {
                    authorisation:  this.authorisation,
                    appliances:     this.appliances
                });
            } catch (err) {
                this.log(`Failed to write configuration schema cache: ${err}`);
            }
        }

        // Construct the new schema and check whether it has changed
        const schema = this.getSchema();
        const data = JSON.stringify(schema, null, 4);
        if (data === this.oldSchema) {
            return this.debug('Configuration schema unchanged');
        }

        // Attempt to write the new schema
        try {
            await promises.writeFile(this.schemaFile, data, 'utf8');
            this.oldSchema = data;
            this.log(`Configuration schema file updated: ${this.schemaFile}`);
        } catch (err) {
            this.warn(`Failed to write a new configuration schema: ${err}`);
        }
    }

    // Logging
    error(msg: string): void { this.logRaw ? this.logRaw.error(msg) : console.error(msg); }
    warn (msg: string): void { this.logRaw ? this.logRaw.warn(msg)  : console.warn(msg);  }
    log  (msg: string): void { this.logRaw ? this.logRaw.info(msg)  : console.log(msg);   }
    debug(msg: string): void { this.logRaw ? this.logRaw.debug(msg) : console.debug(msg); }
}

// If this script is being run interactively then generate the default schema
if (require.main === module) {
    const schema = new ConfigSchema();
    schema.writeSchema();
}
