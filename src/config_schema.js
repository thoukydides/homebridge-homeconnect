/* eslint-disable max-len */
/* eslint-disable no-console */
// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2023 Alexander Thoukydides

import HomeConnectLanguages from './homeconnect_languages.json';
import { join } from 'path';
import { promises } from 'fs';
import { sleep } from './utils';

// Platform identifier (must match index.js)
const PLATFORM_NAME = 'HomeConnect';

// Schema version to indicate incompatible changes to homebridge-config-ui-x
const SCHEMA_VERSION = 1;

// Header and footer (may contain Markdown but not HTML tags)
const HEADER = 'For help please refer to the [README](https://github.com/thoukydides/homebridge-homeconnect/blob/master/README.md) and [`config.json`](https://github.com/thoukydides/homebridge-homeconnect/wiki/config.json).';
const HEADER_DEFAULT = '*This is a temporary configuration schema for initial setup only. When the plugin runs it will replace this schema with one tailored to the available Home Connect appliances.*\n\n*Update [homebridge-config-ui-x](https://github.com/oznu/homebridge-config-ui-x) to version 4.8.1 or later if this message remains after the Home Connect Client has been configured.*\n\n' + HEADER;
const FOOTER = '© 2019-2021 [Alexander Thoukydides](https://www.thouky.co.uk/)';

// Maximum number of enum values for numeric types with multipleOf constraint
const MAX_ENUM_STEPS = 18;

// Delay before writing the schema to allow multiple updates to be applied
const WRITE_DELAY = 3 * 1000; // (milliseconds)

// Schema generator for the Homebridge config.json configuration file
export class ConfigSchema {

    // Create a new schema generator
    constructor(log, persist, path, pluginName) {
        this.logRaw = log;
        this.persist = persist;

        // The full path to the schema file
        this.schemaFile = path ? join(path, '.' + pluginName + '-v'
                                            + SCHEMA_VERSION + '.schema.json')
                               : join(__dirname, '../config.schema.json');
        // Initial state
        this.appliances = {};

        // Read any previous schema and persistent state
        this.ready = this.readSchema();
    }

    // Update the schema if the user needs to authorise the client
    async setAuthorised(uri) {
        // Set the verification URI or authorisation status
        await this.ready;
        this.authorisation = uri ?? true;
        this.writeSchema();

        // Expire the authorisation URI
        if (uri !== null && uri.expires) {
            await sleep(uri.expires - Date.now());
            this.authorisation = false;
            this.writeSchema();
        }
    }

    // Update the list of accessories
    async setAppliances(newAppliances) {
        await this.ready;
        this.authorisation = true;
        let appliances = {};
        for (let ha of newAppliances) {
            let appliance = Object.assign({}, this.appliances[ha.haId], ha);
            if (!appliance.programs) appliance.programs = [];
            appliances[ha.haId] = appliance;
        }
        this.appliances = appliances;
        this.writeSchema();
    }

    // Obtain the schema management for a single accessory
    getAppliance(haId) {

        // Locate the object for the specified program key
        let findProgram = programKey => {
            let appliance = this.appliances[haId];
            if (!appliance) return;
            return appliance.programs.find(p => p.key === programKey);
        };

        // Return the methods that the accessory can use to update the schema
        return {
            //
            setHasControl: control => {
                let appliance = this.appliances[haId];
                if (!appliance) return;
                appliance.hasControl = control;
                this.writeSchema();
            },

            // Add the list of programs to the schema
            setPrograms: newPrograms => {
                let appliance = this.appliances[haId];
                if (!appliance) return;
                appliance.programs = newPrograms.map(program => {
                    let oldProgram = findProgram(program.key);
                    return Object.assign({}, oldProgram, program);
                });
                this.writeSchema();
            },

            // Add the options for a program to the schema
            setProgramOptions: (programKey, options) => {
                let program = findProgram(programKey);
                if (!program) return;
                program.options = options;
                this.writeSchema();
            }
        };
    }

    // Convert the supported Home Connect API languages into a schema
    getSchemaHomeConnectLanguages() {
        // Flatten the supported languages
        let languages = [];
        for (let language of Object.keys(HomeConnectLanguages)) {
            let countries = HomeConnectLanguages[language];
            let single = Object.keys(countries).length === 1;
            for (let country of Object.keys(countries)) {
                let tag = countries[country];
                let title = language;
                if (!single) title += ': ' + country + ' - ' + language;
                languages.push({
                    title:  title,
                    const:  tag
                });
            }
        }

        // Return the configuration schema for the language choices
        return {
            type:       'string',
            default:    'en-GB',
            oneOf:      languages,
            required:   true
        };
    }

    // Construct a schema for the Home Connect Client
    getSchemaClient() {
        let schema = {
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
        let form = [{
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
        return {
            schema: schema,
            form:   form
        };
    }

    // Construct any authorisation help to include in the schema
    getSchemaAuthorisation() {
        if (this.authorisation === true) {

            // Authorisation complete
            return;

        } else if (this.authorisation) {

            // Authorisation is required via the provided URI
            return {
                type:       'help',
                helpvalue:  '<em class="primary-text">AUTHORISATION REQUIRED</em><br>To authorise this plugin to access your Home Connect appliances please visit:<div align=center><a href="' + this.authorisation + '">' + this.authorisation + '</a></div>'
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
    getSchemaAppliance(appliance, keyPrefix) {
        let schema = {};
        let form = [{
            type:       'help',
            helpvalue:  appliance.brand + ' ' + appliance.type
                        + ' (E-Nr: ' + appliance.enumber + ')'
        }];
        let code = '';

        // Add any programs supported by the appliance
        let programs = appliance.programs;
        if (programs.length) {
            let keyArrayPrefix = keyPrefix + '.programs[]';
            let keyConditionPrefix =
                'model["' + keyPrefix
                + '"].programs[arrayIndices[arrayIndices.length-1]]';

            // Values that are common to all programs
            let programForm = [{
                key:            keyArrayPrefix + '.name',
                title:          'HomeKit Name',
                placeholder:    'e.g. My ' + appliance.type + ' Program'
            }, {
                // (a valid array-element key is required for some reason)
                key:            keyArrayPrefix + '.key',
                type:           'flex',
                'flex-flow':    'row',
                notitle:        true,
                items: [{
                    key:            keyArrayPrefix + '.selectonly',
                    title:          'Action',
                    type:           'select',
                    titleMap: {
                        false:      'Start program',
                        true:       'Select program'
                    }
                }, {
                    key:            keyArrayPrefix + '.key',
                    title:          'Appliance Program'
                }]
            }];

            // Add the superset of all program options to the schema
            let optionsSchema = {};
            for (let program of programs) {
                for (let option of program.options || []) {
                    let optionSchema = optionsSchema[option.key];
                    if (!optionSchema) {
                        optionSchema = optionsSchema[option.key] = {
                            type:   option.type
                        };
                    }

                    // Range limit for numeric types
                    if ('minimum' in option) {
                        let min = [option.minimum];
                        if ('minimum' in optionSchema)
                            min.push(optionSchema.minimum);
                        optionSchema.minimum = Math.min(...min);
                    }
                    if ('maximum' in option) {
                        let max = [option.maximum];
                        if ('maximum' in optionSchema)
                            max.push(optionSchema.maximum);
                        optionSchema.maximum = Math.max(...max);
                    }

                    // Step size for numeric types
                    if (option.multipleOf) {
                        const gcd = (x, y) => y ? gcd(y, x % y) : x;
                        optionSchema.multipleOf =
                            optionSchema.multipleOf
                            ? gcd(optionSchema.multipleOf, option.multipleOf)
                            : option.multipleOf;
                    }

                    // Allowed values for enum types
                    if (option.values) {
                        let keys = optionSchema.enum || [];
                        for (let mapping of option.values) {
                            if (!keys.includes(mapping.key))
                                keys.push(mapping.key);
                        }
                        optionSchema.enum = keys;
                    }
                }
            }

            // Add per-program options to the form
            for (let program of programs) {
                let programCondition = keyConditionPrefix
                                       + '.key == "' + program.key + '"';

                // Add form items to customise the schema for this program
                for (let option of program.options || []) {
                    let schemaKey =
                        keyArrayPrefix + ".options.['" + option.key + "']";
                    let formOption = {
                        key:        schemaKey,
                        title:      option.name,
                        condition:  {
                            functionBody: 'try { return ' + programCondition
                                          + '; } catch (err) { return false; }'
                        }
                    };

                    // Treat restricted numeric types as enum types
                    if ('minimum' in option && 'maximum' in option
                        && option.multipleOf
                        && (option.maximum - option.minimum)
                           / option.multipleOf <= MAX_ENUM_STEPS) {
                        let suffix = option.suffix ? ' ' + option.suffix : '';
                        let mappings = [];
                        for (let i = option.minimum; i <= option.maximum;
                            i += option.multipleOf) {
                            mappings.push({ name: i + suffix, key: i });
                        }
                        option = { values: mappings };
                    }

                    // Range limit and units for numeric types
                    for (let key of ['minimum', 'maximum', 'multipleOf']) {
                        if (option[key]) {
                            formOption[key] = option[key];
                            if (option.type !== 'string') {
                                // Don't set this for relative time options
                                formOption.type = 'number';
                            }
                        }
                    }
                    if (option.suffix) {
                        formOption.fieldAddonRight = '&nbsp;' + option.suffix;
                    }
                    if ('minimum' in option && 'maximum' in option) {
                        let suffix = option.suffix ? ' ' + option.suffix : '';
                        formOption.description =
                            'Supported range: '
                            + option.minimum + ' to ' + option.maximum + suffix;
                        if (option.multipleOf)
                            formOption.description +=
                                ', in steps of ' + option.multipleOf + suffix;
                    }

                    // Allowed values for enum types
                    if (option.values) {
                        formOption.titleMap = {};
                        for (let mapping of option.values) {
                            formOption.titleMap[mapping.key] = mapping.name;
                        }
                    }

                    // If there is a default then add it as placeholder text
                    if ('default' in option) {
                        let value = option.default;
                        if (formOption.titleMap && value in formOption.titleMap)
                            value = formOption.titleMap[value];
                        formOption.placeholder = 'e.g. ' + value;
                    }
                    programForm.push(formOption);
                }

                // Add form items to remove options unsupported by this program
                let supported = (program.options || [])
                    .map(option => option.key);
                let unsupported = Object.keys(optionsSchema)
                    .filter(key => !supported.includes(key));
                if (unsupported.length) {
                    programForm.push({
                        key:        keyArrayPrefix + ".options.['"
                                    + unsupported[0] + "']",
                        condition: {
                            functionBody: 'try { if (' + programCondition + ') { let options = ' + keyConditionPrefix + '.options;' + unsupported.map(key => ' delete options["' + key + '"];').join('') + ' } } catch (err) {} return false;'
                        }
                    });
                }
            }

            // Hide most of the options if Control scope has not been authorised
            if (appliance.hasControl === false) {
                programForm = [programForm[0], programForm[1].items[1]];
            }

            // Add a choice of how to handle programs to the schema
            schema.addprograms = {
                type:       'string',
                oneOf: [{
                    title:  'No individual program switches',
                    const:  'none'
                }, {
                    title:  'A switch to start each ' + appliance.name
                            + ' program',
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
            let modelPrefix = 'model["' + keyPrefix + '"]';
            let programListCondition = {
                functionBody: 'try { return ' + modelPrefix + '.addprograms == "custom"; } catch (err) { return true; }'
            };
            form.push({
                key:            keyPrefix + '.addprograms',
                title:          'Program Switches',
                description:    'A separate Switch service can be created for individual appliance programs. These indicate which program is running, and (if authorised) can be used to select options and start a specific program.'
            }, {
                type:           'help',
                helpvalue:      '<p>Specify a unique HomeKit Name for each program (preferably short and without punctuation).</p><p>The same Appliance Program may be used multiple times with different options.</p>',
                condition:      programListCondition
            }, {
                key:            keyPrefix + '.programs',
                notitle:        true,
                startEmpty:     true,
                items:          programForm,
                condition:      programListCondition
            });

            // Delete the programs member or set an empty array if appropriate
            // (workaround homebridge-config-ui-x / angular6-json-schema-form)
            code += 'switch (' + modelPrefix + '.addprograms) {'
                + 'case "none": ' + modelPrefix + '.programs = [];   break;'
                + 'case "auto": delete ' + modelPrefix + '.programs; break;'
                + '}';
        } else {
            // This appliance does not support any programs
            form.push({
                type:       'help',
                helpvalue:  'This appliance does not support any programs.'
            });
        }

        // Return the schema for this appliance
        return {
            schema: {
                type:       'object',
                properties: schema
            },
            form:   form,
            code:   code
        };
    }

    // Construct the complete configuration schema
    getSchema() {
        let schema = {
            type:       'object',
            properties: {}
        };
        let form = [];

        // Add the Home Connect Client
        let clientSchema = this.getSchemaClient();
        Object.assign(schema.properties, clientSchema.schema);
        form.push({
            type:         'fieldset',
            title:        'Home Connect Client',
            expandable:   false,
            items:        clientSchema.form
        });

        // Add any Home Connect authorisation
        let authForm = this.getSchemaAuthorisation();
        if (authForm) clientSchema.form.push(authForm);

        // Per-appliance configuration
        let appliances = Object.values(this.appliances).sort(
            (a, b) => a.name.localeCompare(b.name));
        for (let appliance of appliances) {
            let keyPrefix = appliance.haId;
            let appSchema = this.getSchemaAppliance(appliance, keyPrefix);
            schema.properties[appliance.haId] = appSchema.schema;
            form.push({
                type:         'fieldset',
                title:        appliance.name,
                expandable:   true,
                expanded:     false,
                items:        appSchema.form,
                condition: {
                    functionBody: 'try { ' + appSchema.code + ' } catch (err) {} return true;'
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
    async readSchema() {
        // First read any persistent data
        if (this.persist) {
            try {
                let persist = await this.persist.getItem('config.schema.json');
                if (persist) Object.assign(this, persist);
            } catch (err) {
                this.log('Failed to read configuration schema cache: '
                         + err.message);
            }
        }

        // Then try reading a schema file (does not exist initially)
        try {
            let data = await promises.readFile(this.schemaFile, 'utf8');
            this.oldSchema = data;
        } catch (err) {
            this.debug('Failed to read the current configuration schema: '
                       + err.message);
        }
    }

    // Schedule writing a new schema file, if changed
    writeSchema() {
        // Perform the write
        let doWrite = async () => {
            let writePromises = this.writePending;
            delete this.writePending;

            // Write the schema and resolve all pending promises
            await this.writeSchemaDeferred();
            for (let promise of writePromises) promise.resolve();

            // Schedule another write if required
            if (this.writePending) {
                this.debug('Scheduling overlapping configuration schema write');
                this.writeScheduled = setTimeout(doWrite, WRITE_DELAY);
            } else {
                this.debug('Scheduled configuration schema write complete');
                delete this.writeScheduled;
            }
        };
        if (!this.writePending) {
            this.writePending = [];
            if (!this.writeScheduled) {
                this.debug('Scheduling configuration schema write');
                this.writeScheduled = setTimeout(doWrite, WRITE_DELAY);
            }
        }

        // Create and return a promise for this request
        return new Promise((resolve, reject) => {
            this.writePending.push({resolve: resolve, reject: reject});
        });
    }

    // Write a new schema file, if changed
    async writeSchemaDeferred() {
        await this.ready;

        // First write persistent data
        if (this.persist) {
            try {
                await this.persist.setItem('config.schema.json', {
                    authorisation:  this.authorisation,
                    appliances:     this.appliances
                });
            } catch (err) {
                this.log('Failed to write configuration schema cache: '
                         + err.message);
            }
        }

        // Construct the new schema
        let schema = this.getSchema();
        let data = JSON.stringify(schema, null, 4);

        // No action required unless the schema has changed
        if (data === this.oldSchema) return;

        // Attempt to write the new schema
        try {
            await promises.writeFile(this.schemaFile, data, 'utf8');
            this.oldSchema = data;
            this.log('Configuration schema file updated: ' + this.schemaFile);
        } catch (err) {
            this.warn('Failed to write a new configuration schema: '
                      + err.message);
        }
    }

    // Logging
    error(msg)  { this.logRaw ? this.logRaw.error(msg) : console.error(msg); }
    warn(msg)   { this.logRaw ? this.logRaw.warn(msg)  : console.warn(msg);  }
    log(msg)    { this.logRaw ? this.logRaw.info(msg)  : console.log(msg);   }
    debug(msg)  { this.logRaw ? this.logRaw.debug(msg) : console.debug(msg); }
}

// If this script is being run interactively then generate the default schema
if (require.main === module) {
    let schema = new ConfigSchema;
    schema.writeSchema();
}
