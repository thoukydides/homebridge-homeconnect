// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2020 Alexander Thoukydides

'use strict';

let Service, Characteristic;

// Add program support to an accessory
module.exports = {
    name: 'HasPrograms',

    // Initialise the mixin
    init() {
        // Shortcuts to useful HAP objects
        Service = this.homebridge.hap.Service;
        Characteristic = this.homebridge.hap.Characteristic;

        // Enable polling of selected/active programs when connected
        this.device.pollPrograms();

        // Use the identify request to log details of all available programs
        // (the callback is called by the base class, so no need to do so here)
        this.accessory.on('identify', () => this.logPrograms());

        // Add services to monitor or control programs
        this.addProgramsIfSupported();

        // Add pause and resume if supported by the appliance
        this.addPauseResumeIfSupported();
    },

    // Read and log details of all available programs
    async logPrograms() {
        try {
            // Read details of the available programs
            let allPrograms = await this.device.getAllPrograms();
            let programs = await this.device.getAvailablePrograms();

            // Update the configuration schema
            this.setSchemaPrograms(allPrograms);
            for (let program of programs) this.setSchemaProgramOptions(program);

            // Convert an option into a form that can be used in config.json
            function optionValue(option) {
                // If the option has an actual or default value then use that
                let value = null;
                if ('value' in option) value = option.value;

                // Use any additional information to generate a helpful comment
                let comment;
                if (option.constraints) {
                    if (value === null && 'default' in option.constraints) {
                        value = option.constraints.default;
                    }
                    if (option.constraints.allowedvalues) {
                        let {allowedvalues} = option.constraints;
                        if (value === null) value = allowedvalues[0];
                        if (1 < allowedvalues.length) comment = allowedvalues;
                    } else if ('min' in option.constraints
                               && 'max' in option.constraints) {
                        let {type, unit} = option;
                        let {min, max, stepsize} = option.constraints;
                        if (value === null) value = min;
                        let commentParts = [];
                        if (type) commentParts.push(type);
                        commentParts.push('[' + min, '..', max + ']');
                        if (stepsize) commentParts.push('step ' + stepsize);
                        if (unit) commentParts.push(unit);
                        comment = commentParts.join(' ');
                    }
                }

                // Special handling of boolean types
                if (option.type == 'Boolean') {
                    if (value === null) value = 'false';
                    if (!comment) comment = [true, false];
                }

                // Return the value and comment
                return [value, comment];
            }

            // Log details of each program
            let json = {
                [this.device.haId]: {
                    programs:       programs.map(program => {
                        let config = {
                            name:   this.simpleName(program.name, program.key),
                            key:    program.key
                        };
                        if (this.device.hasScope('Control')) {
                            config.options = {};
                            for (let option of program.options) {
                                let [value, comment] = optionValue(option);
                                config.options[option.key] = value;
                                if (comment)
                                    config.options['_' + option.key] = comment;
                            }
                        }
                        return config;
                    })
                }
            };
            this.log(programs.length + ' of ' + allPrograms.length
                     + ' programs available\n' + JSON.stringify(json, null, 4));
            let missing = allPrograms.length - programs.length;
            if (0 < missing)
                this.warn(missing + ' programs not currently available');
        } catch (err) {
            this.reportError(err, 'Identify programs');
        }
    },

    // Add services to monitor or control programs
    async addProgramsIfSupported() {
        // Obtain a list of all programs
        let allPrograms = await this.getCached(
            'programs', () => this.device.getAllPrograms());
        if (!allPrograms || !allPrograms.length) {
            this.warn('Does not support any programs');
            allPrograms = [];
        }

        // Update the configuration schema
        this.setSchemaPrograms(allPrograms);

        // Add the appropriate services
        let config = this.config.programs;
        if (config && Array.isArray(config)) {
            // Add the programs specified in the configuration file
            this.addConfiguredPrograms(allPrograms, config);
        } else {
            // Convert to the configuration format
            let config = allPrograms.map(program => ({
                name:   this.simpleName(program.name, program.key),
                key:    program.key
            }));

            // Add a service for each supported program
            this.addPrograms(config);
        }
    },

    // Add the programs specified in the configuration file
    async addConfiguredPrograms(allPrograms, config) {
        // Treat a single invalid entry as being an empty array
        // (workaround for homebridge-config-ui-x / angular6-json-schema-form)
        if (config.length == 1 && !config[0].name && !config[0].key) {
            this.warn('Invalid programs array, written by homebridge-config-ui-x; treating as empty');
            config = [];
        }

        // Perform some validation of the configuration
        let names = [];
        config = config.filter(program => {
            try {
                // Check that a name and program key have both been provided
                if (!('name' in program))
                    throw new Error("No 'name' field provided for program");
                if (!('key' in program))
                    throw new Error("No 'key' field provided for program");

                // Check that the name is unique
                if (names.includes(program.name))
                    throw new Error("Program name '" + program.name
                                    + "' is not unique");
                names.push(program.name);

                // Check that the program key is supported by the appliance
                if (!allPrograms.some(all => all.key == program.key))
                    throw new Error("Program key '" + program.key
                                    + "' is not supported by the appliance");

                // Clean options, ignoring keys starting with underscore
                let cleanOptions = {};
                for (let key of Object.keys(program.options || {})) {
                    if (!key.startsWith('_')) {
                        let value = program.options[key];
                        cleanOptions[key] = value;
                    }
                }

                // It appears to be a valid configuration
                program.options = cleanOptions;
                return true;
            } catch (err) {
                this.error('Invalid program configuration ignored: '
                           + err.message + '\n'
                           + JSON.stringify(program, null, 4));
                return false;
            }
        });

        // Add a service for each configured program
        this.addPrograms(config);
    },

    // Add a list of programs
    addPrograms(programs) {
        // Cache of previously added program services
        let saved = this.accessory.context.programServices;
        if (!saved) saved = this.accessory.context.programServices = {};
        for (let subtype of Object.keys(saved)) saved[subtype] = null;

        // Add a service for each program
        this.log('Adding services for ' + programs.length + ' programs');
        let services = [];
        let prevService;
        for (let program of programs) {
            // Log information about this program
            this.log("    '" + program.name + "' (" + program.key + ')'
                     + (program.selectonly ? ', select only' : ''));
            let options = program.options || {};
            for (let key of Object.keys(options))
                this.log('        ' + key + '=' + options[key]);

            // Add the service for this program
            let service = this.addProgram(program);
            services.push(service);
            saved[service.subtype] = program.name;

            // Link the program services
            this.activeService.addLinkedService(service);
            if (prevService) prevService.addLinkedService(service);
            prevService = service;
        }

        // Delete any services that are no longer required
        let obsolete = Object.keys(saved).filter(subtype => !saved[subtype]);
        this.log('Removing services for ' + obsolete.length + ' programs');
        for (let subtype of obsolete) {
            let service = this.accessory.getServiceByUUIDAndSubType(
                Service.Switch, subtype);
            if (service) this.accessory.removeService(service);
        }

        // Make the services read-only when programs cannot be controlled
        let allowWrite = write => {
            let perms = [Characteristic.Perms.READ,
                         Characteristic.Perms.NOTIFY];
            if (write) perms.push(Characteristic.Perms.WRITE);
            for (let service of services) {
                service.getCharacteristic(Characteristic.On)
                    .setProps(perms);
            }
        };
        if (programs.length && !this.device.hasScope('Control')) {
            // Control of this appliance has not been authorised
            this.warn('Programs cannot be controlled without Control scope');
            allowWrite(false);
        } else {
            allowWrite(true);
        }
    },

    // Add a single program
    addProgram({name, key, selectonly, options}) {
        // Add a switch service for this program
        let subtype = 'program v2 ' + name;
        let service =
            this.accessory.getServiceByUUIDAndSubType(Service.Switch, subtype)
            || this.accessory.addService(Service.Switch, name, subtype);

        // Either select the program, or start/stop the active program
        service.getCharacteristic(Characteristic.On)
            .on('set', this.callbackify(async value => {
                if (selectonly) {
                    // Select this program and its options
                    if (value) {
                        this.log("SELECT Program '" + name + "' (" + key + ')');
                        await this.device.setSelectedProgram(key, options);
                        setTimeout(() => {
                            service.updateCharacteristic(Characteristic.On,
                                                         false);
                        }, 0);
                    }
                } else {
                    // Attempt to start or stop the program
                    if (value) {
                        this.log("START Program '" + name + "' (" + key + ')');
                        await this.device.startProgram(key, options);
                    } else {
                        this.log("STOP Program '" + name + "' (" + key + ')');
                        await this.device.stopProgram();
                    }
                }
            }));

        // Update the status
        this.device.on('BSH.Common.Root.ActiveProgram', item => {
            let active = item.value == key;
            this.log("Program '" + name + "' (" + key + ') '
                     + (active ? 'active' : 'inactive'));
            service.updateCharacteristic(Characteristic.On, active);
        });
        this.device.on('BSH.Common.Status.OperationState', item => {
            const inactiveStates = [
                'BSH.Common.EnumType.OperationState.Inactive',
                'BSH.Common.EnumType.OperationState.Ready',
                'BSH.Common.EnumType.OperationState.Finished'
            ];
            if (inactiveStates.includes(item.value)) {
                this.log("Program '" + name + "' (" + key + ') inactive');
                service.updateCharacteristic(Characteristic.On, false);
            }
        });

        // Return the service
        return service;
    },

    // Check whether the appliance supports pause and resume
    async addPauseResumeIfSupported() {
        // Check whether control of the appliance has been authorised
        if (!this.device.hasScope('Control')) return;

        // Read the list of supported commands
        let commands = await this.getCached('commands',
                                            () => this.device.getCommands());
        if (!commands.length) return this.log('No commands supported');
        this.logIssue(8, commands);

        // Add pause and resume support
        this.addPauseResume();
    },

    // Add the ability to pause and resume programs
    addPauseResume() {
        // Make the (Operation State) active On characteristic writable
        this.activeService.getCharacteristic(Characteristic.On)
            .setProps({perms: [Characteristic.Perms.READ,
                               Characteristic.Perms.WRITE,
                               Characteristic.Perms.NOTIFY]})
            .on('set', this.callbackify(async value => {
                this.log((value ? 'RESUME' : 'PAUSE') + ' Program');
                await this.device.pauseProgram(!value);
            }));

        // Status update is performed by the normal Operation State handler
    },

    // Update the configuration schema with the latest program list
    setSchemaPrograms(allPrograms) {
        this.schema.setPrograms(allPrograms.map(program => ({
            name:   this.makeName(program.name, program.key),
            key:    program.key
        })));
    },

    // Update the configuration schema with the options for a single program
    setSchemaProgramOptions(program) {
        this.schema.setProgramOptions(
            program.key, program.options.map(option => {
                // Common mappings from Home Connect to JSON schema
                let schema = {
                    key:    option.key,
                    name:   this.makeName(option.name, option.key)
                };
                let constraints = option.constraints || {};
                if ('min' in constraints) schema.minimum = constraints.min;
                if ('max' in constraints) schema.maximum = constraints.max;
                if (constraints.stepsize) {
                    schema.multipleOf = constraints.stepsize;
                }
                if (option.unit && option.unit != 'enum') {
                    schema.suffix = option.unit;
                }
                if ('default' in constraints) {
                    schema['default'] = constraints['default'];
                }

                // Type-specific mappings
                schema.type = {
                    Double:     'number',
                    Int:        'integer',
                    Boolean:    'boolean'
                }[option.type];
                if (!schema.type) schema.type = 'string';

                // Construct a mapping for enum and boolean types
                if (constraints.allowedvalues) {
                    let keys = constraints.allowedvalues;
                    let names = constraints.displayvalues || [];
                    schema.values = keys.map((key, i) => ({
                        key:    key,
                        name:   this.makeName(names[i], key)
                    }));
                }

                // Return the mapped option
                return schema;
            }));
    },

    // Select a name for a program or an option
    makeName(name, key) {
        // Use any existing name unchanged
        if (name) return name;

        // Remove any enum prefix and insert spaces to convert from PascalCase
        return key.replace(/^.*\./g, '')
                  .replace(/(?=\p{Lu}\p{Ll})|(?<=\p{Ll})(?=\p{Lu})/gu, ' ');
    },

    // HomeKit restricts the characters allowed in names
    simpleName(name, key) {
        return this.makeName(name, key)
                   .replace(/[^\p{L}\p{N}.' -]/ug, '')
                   .replace(/^[^\p{L}\p{N}]*/u, '')
                   .replace(/[^\p{L}\p{N}]*$/u, '');
    }
}
