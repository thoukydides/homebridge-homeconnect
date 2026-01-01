/* eslint-disable max-len */
// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2026 Alexander Thoukydides

import { PlatformConfig } from 'homebridge';

import assert from 'assert';

import { HOMEBRIDGE_LANGUAGES } from '../api-languages.js';
import { assertIsDefined, keyofChecker, plural } from '../utils.js';
import { DEFAULT_CONFIG, PLATFORM_NAME } from '../settings.js';
import { ConfigSchemaData, SchemaAppliance, SchemaOptionalFeature,
         SchemaProgramOption, SchemaProgramOptionType,
         SchemaProgramOptionValue } from './schema-data.js';
import { typeSuite } from '../ti/config-types.js';

// Maximum number of enum values for numeric types with multipleOf constraint
const MAX_ENUM_STEPS = 18;

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
    enumNames?:             string[];
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
    } | {
        functionBodyRaw:    string;
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

// Config schema for homebridge-config-ui-x config
export interface SchemaFormFragment {
    schema:                 JSONSchemaProperties;
    form:                   FormItem[];
    code?:                  string;
}
export interface FormSchema {
  schema:                   JSONSchema;
  form?:                    FormItem[];
  layout?:                  Record<string, unknown>[] | null;
}

// Schema generator for the Homebridge config.json configuration file
export class ConfigSchema extends ConfigSchemaData {

    // Construct a schema fragment for this plugin
    getSchemaFragmentPlugin(): SchemaFormFragment {
        const schema: JSONSchemaProperties = {
            platform: {
                type:       'string',
                default:    PLATFORM_NAME,
                required:   true
            },
            name: {
                type:       'string',
                minLength:  1,
                default:    PLATFORM_NAME
            }
        };
        const form: FormItem[] = [{
            key:            'name',
            notitle:        true,
            description:    'This is used to prefix entries in the Homebridge log.'
        }];
        return { schema, form };
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
    getSchemaFragmentClient(): SchemaFormFragment {
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
                enum:       [true, false],
                enumNames:  ['Simulated Appliances (test server)', 'Physical Appliances (production server)'],
                default:    false,
                required:   true
            },
            china: {
                type:       'boolean',
                enum:       [true, false],
                enumNames:  ['China', 'Worldwide (excluding China)'],
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
            type:           'select'
        }, {
            type:           'help',
            helpvalue:      '<div class="help-block">Create an application via the <a href="https://developer.home-connect.com/applications">Home Connect Developer Program</a>, ensuring that:'
                          + '<ul>'
                          + '<li><i>OAuth Flow</i> is set to <b>Device Flow</b></li>'
                          + '<li><i>Home Connect User Account for Testing</i> is the same as the <b>SingleKey ID email address</b></li>'
                          + '<li><i>Redirect URI</i> is <b>left blank</b></li>'
                          + '<li><i>Enable One Time Token Mode</i> is <b>not ticked</b></li>'
                          + '<li><i>Sync to China</i> is <b>ticked</b> if you are located within China</li>'
                          + '</ul>'
                          + 'If the application is subsequently edited then additionally ensure that:'
                          + '<ul>'
                          + '<li><i>Forces the usage of PKCE</i> is <b>not ticked</b></li>'
                          + '<li><i>Status</i> is <b>Enabled</b></li>'
                          + '<li><i>Client Secret Always Required</i> is <b>No</b></li>'
                          + '</ul>'
                          + 'Wait 15 minutes after creating (or editing) an application for changes to the application to be deployed to the Home Connect authorisation servers.</div>',
            condition: {
                functionBody: 'return !model.simulator'
            }
        }, {
            key:            'clientid',
            title:          'Client ID',
            description:    'Enter the Client ID of the registered Home Connect application.',
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
            key:            'china',
            title:          'Server Location',
            description:    'Separate Home Connect API servers are operated within China.',
            type:           'select',
            condition: {
                functionBody: 'return !model.simulator'
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

    // Construct a schema for debug options
    getSchemaFragmentDebug(): SchemaFormFragment {
        const schema: JSONSchemaProperties = {
            debug: {
                type:           'array',
                uniqueItems:    true,
                items: {
                    type:           'string',
                    enum:           keyofChecker(typeSuite, typeSuite.DebugFeatures)
                }
            }
        };
        const form: FormItem[] = [{
            key:            'debug',
            notitle:        true,
            description:    'Leave all options unchecked unless debugging a problem.'
        }];
        return { schema, form };
    }

    // Construct a schema for an appliance's service names
    getSchemaFragmentApplianceNames(appliance: SchemaAppliance): SchemaFormFragment {
        // Create the schema for the service name configuration
        const schema: JSONSchemaProperties = {
            names: {
                type:       'object',
                properties: {
                    prefix: {
                        type:       'object',
                        properties: {
                            programs: {
                                type:       'boolean',
                                default:    false
                            },
                            other: {
                                type:       'boolean',
                                default:    true
                            }
                        }
                    }
                }
            }
        };

        // Create the form items for the relevant service name configuration
        const namesForm: FormItem[] = [];
        const addPrefixForm = (key: string, title: string, name: string, enabledByDefault: boolean): void => {
            namesForm.push({
                type:           'flex',
                'flex-flow':    'column',
                notitle:        true,
                items: [{
                    key:            `names.prefix.${key}`,
                    title:          title,
                    default:        enabledByDefault
                }, {
                    type:           'help',
                    helpvalue:      `e.g. "<i>${name}</i>"`,
                    condition: {
                        functionBody:   `return !model.names.prefix.${key};`
                    }
                }, {
                    type:           'help',
                    helpvalue:      `e.g. "<i>${appliance.name} ${name}</i>"`,
                    condition: {
                        functionBody:   `return model.names.prefix.${key};`
                    }
                }]
            });
        };
        const firstProgram = appliance.programs[0];
        if (firstProgram !== undefined) {
            const program = firstProgram.name;
            addPrefixForm('programs',   'Prefix Program Names',                 program,    false);
            addPrefixForm('other',      'Prefix Other Service Names',           'Power',    true);
        } else {
            addPrefixForm('other',      'Prefix Appliance Name to Services',    'Power',    true);
        }

        // Create the top-level schema for the service names
        const form: FormItem[] = [{
            type:           'flex',
            notitle:        true,
            'flex-flow':    'row',
            items:          namesForm
        }];
        return { schema, form };
    }

    // Construct a schema for an appliance's optional features
    getSchemaFragmentApplianceOptionalFeatures(appliance: SchemaAppliance): SchemaFormFragment {
        // Special case if the appliance does not have any optional features
        if (!Object.keys(appliance.features).length) return {
            schema:     {},
            form:       []
        };

        // Create the schema for each optional feature
        const featuresSchema: JSONSchemaProperties = {};
        const groups: Record<string, SchemaOptionalFeature[]> = {};
        for (const feature of appliance.features) {
            featuresSchema[feature.name] = {
                type:       'boolean',
                default:    feature.enableByDefault,
                required:   false
            };
            groups[feature.group] ??= [];
            groups[feature.group]?.push(feature);
        }

        // Arrange the optional features into groups
        const groupForm: FormItem[] = [];
        for (const groupKey of Object.keys(groups).sort()) {
            assertIsDefined(groups[groupKey]);
            const features = groups[groupKey].sort((a, b) => a.name.localeCompare(b.name));
            const featuresForm: FormItem[] = [];
            let lastService: string | undefined;
            for (const feature of features) {
                if (feature.service !== lastService) {
                    lastService = feature.service;
                    const count = features.filter(f => f.service === feature.service).length;
                    featuresForm.push({
                        type:       'help',
                        helpvalue:  `<span class="help-block"><em>${feature.service}</em> ${plural(count, 'service', false)}:</span>`
                    });
                }
                featuresForm.push({
                    key:            `features.${feature.name}`,
                    title:          feature.name
                });
            }

            // Add this group to the schema
            groupForm.push({
                type:           'flex',
                'flex-flow':    'column',
                title:          `Optional ${appliance.type} ${(features[0]?.group ?? '') || 'Features'}`,
                items:          featuresForm
            });
        }

        // Create the top-level schema for the optional features
        const schema: JSONSchemaProperties = {
            features: {
                type:       'object',
                properties: featuresSchema
            }
        };
        const form: FormItem[] = [{
            type:           'flex',
            'flex-flow':    'row',
            notitle:        true,
            items:          groupForm
        }];
        return { schema, form };
    }

    // Construct a schema for an appliance's programs
    getSchemaFragmentAppliancePrograms(appliance: SchemaAppliance): SchemaFormFragment {
        // Special case if the appliance does not support any programs
        if (!appliance.programs.length) return {
            schema:     {},
            form:       [{
                type:       'help',
                helpvalue:  'This appliance does not support any programs.'
            }]
        };

        const keyArrayPrefix = 'programs[]';
        const keyConditionPrefix = 'model.programs[arrayIndices[arrayIndices.length-1]]';

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
                type:           'select'
            }, {
                key:            `${keyArrayPrefix}.key`,
                title:          'Appliance Program'
            }]
        }];

        // Add the superset of all program options to the schema
        const optionsSchema: JSONSchemaProperties = {};
        for (const program of appliance.programs) {
            for (const option of program.options ?? []) {
                optionsSchema[option.key] ??= { type: option.type };
                const optionSchema = optionsSchema[option.key];
                assertIsDefined(optionSchema);

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
        for (const program of appliance.programs) {
            // (workaround homebridge-config-ui-x / @ng-formworks/core)
            const escapedProgramKey = program.key.replaceAll('.', '\\u002E');
            const programCondition = `${keyConditionPrefix}.key === "${escapedProgramKey}"`;

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
                        mappings.push({ name: `${value}${suffix}`, key: value });
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
            assertIsDefined(programForm[0]);
            assert(programForm[1]?.type === 'flex');
            assertIsDefined(programForm[1].items[1]);
            programForm = [programForm[0], programForm[1].items[1]];
        }

        // Create the top-level schema for appliance programs
        const schema: JSONSchemaProperties = {
            // Choice of how to handle programs
            addprograms: {
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
            },

            // Array of programs
            programs: {
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
                            oneOf:      appliance.programs.map(program => ({
                                title:  program.name,
                                const:  program.key
                            })),
                            required:   true,
                            default:    appliance.programs[0]?.key
                        },
                        selectonly: {
                            type:       'boolean',
                            enum:       [true, false],
                            enumNames:  ['Select program', 'Start program'],
                            required:   true,
                            default:    false
                        },
                        options: {
                            type:       'object',
                            properties: optionsSchema
                        }
                    }
                }
            }
        };
        const programListCondition = {
            functionBody: 'try { return model.addprograms === "custom"; } catch (err) { return true; }'
        };
        const form: FormItem[] = [{
            key:            'addprograms',
            title:          'Program Switches',
            description:    'A separate Switch service can be created for individual appliance programs. These indicate which program is running, and (if authorised) can be used to select options and start a specific program.'
        }, {
            type:           'help',
            helpvalue:      '<div class="help-block"><p>Specify a unique HomeKit Name for each program (preferably short and without punctuation).</p><p>The same Appliance Program may be used multiple times with different options.</p></div>',
            condition:      programListCondition
        }, {
            key:            'programs',
            notitle:        true,
            startEmpty:     true,
            items:          programForm,
            condition:      programListCondition
        }];

        // Delete the programs member or set an empty array if appropriate
        // (workaround homebridge-config-ui-x / @ng-formworks/core)
        const code = 'switch (model.addprograms) { case "none": Object.assign(model, { programs: []}); break; case "auto": delete model.programs; break; }';

        return { schema, form, code };
    }

    // Retrieve the active plugin configuration
    async getConfig(): Promise<PlatformConfig | undefined> {
        await this.load(true);
        return this.config;
    }

    // Retrieve the global configuration schema
    async getSchemaGlobal(): Promise<FormSchema> {
        await this.load(true);

        // Generate schema fragments for non-appliance configuration
        const pluginSchema = this.getSchemaFragmentPlugin();
        const clientSchema = this.getSchemaFragmentClient();
        const debugSchema  = this.getSchemaFragmentDebug();

        // Combine the schema fragments
        const schema: JSONSchema = {
            type:       'object',
            properties: { ...pluginSchema.schema, ...clientSchema.schema, ...debugSchema.schema }
        };
        const form: FormItem[] = [{
            type:       'fieldset',
            title:      'Homebridge Plugin Name',
            expandable: false,
            items:      pluginSchema.form,
            condition: {
                functionBody: `return model.name !== "${PLATFORM_NAME}";`
            }
        }, {
            type:       'fieldset',
            title:      'Home Connect Client',
            expandable: false,
            items:      clientSchema.form,
            condition:  {
                functionBody: 'try { return !model.debug.includes("Mock Appliances") } catch (err) { return true; }'
            }
        }, {
            type:       'fieldset',
            title:      'Debug Options',
            expandable: true,
            expanded:   false,
            items:      debugSchema.form
        }];

        // Return the schema
        return { schema, form };
    }

    // Retrieve the configuration schema for a specified appliance
    async getSchemaAppliance(haid: string): Promise<FormSchema | undefined> {
        await this.load(true);
        const appliance = this.appliances.get(haid);
        if (!appliance) return;

        // Generate schema fragments for the appliance configuration
        const namesSchema    = this.getSchemaFragmentApplianceNames(appliance);
        const featuresSchema = this.getSchemaFragmentApplianceOptionalFeatures(appliance);
        const programsSchema = this.getSchemaFragmentAppliancePrograms(appliance);

        // Combine the schema fragments
        const schema: JSONSchema = {
            type:       'object',
            properties: {
                enabled: {
                    type:       'boolean',
                    default:    true
                },
                ...namesSchema.schema,
                ...featuresSchema.schema,
                ...programsSchema.schema
            }
        };
        const form: FormItem[] = [{
            key:            'enabled',
            title:          appliance.name,
            description:    `${appliance.brand} ${appliance.type} (E-Nr: ${appliance.enumber})`
        }, {
            type:           'help',
            helpvalue:      'This appliance will not be exposed to HomeKit.',
            condition: {
                functionBody: 'return !model.enabled;'
            }
        }, {
            type:           'fieldset',
            notitle:        true,
            items:          [...namesSchema.form, ...featuresSchema.form, ...programsSchema.form],
            condition: {
                functionBody: `try { ${programsSchema.code ?? ''} } catch (err) {} return !!model.enabled;`
            }
        }];

        // Return the schema
        return { schema, form };
    }
}