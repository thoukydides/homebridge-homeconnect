// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2020 Alexander Thoukydides

'use strict';

let Service, Characteristic;

// Add program support to an accessory
module.exports = {
    name: 'HasPrograms',

    // Initialise the mixin
    async init() {
        // Shortcuts to useful HAP objects
        Service = this.homebridge.hap.Service;
        Characteristic = this.homebridge.hap.Characteristic;

        // Enable polling of selected/active programs when connected
        this.device.pollPrograms();

        // Use the identify request to log details of all available programs
        // (the callback is called by the base class, so no need to do so here)
        this.accessory.on('identify', () => this.logPrograms());

        // Update the cache of programs supported by this appliance
        await this.updatePrograms();
        this.device.on('BSH.Common.Root.SelectedProgram',
                       item => this.updateSelectedProgram(item.value));

        // Add the appropriate services depending on the configuration
        let config = this.config.programs;
        if (config && Array.isArray(config)) {
            this.addConfiguredPrograms(config);
        } else {
            this.addAllPrograms();
        }

        // Add start, stop, pause, and resume if supported by the appliance
        if (this.device.hasScope('Control')) {
            // Read the list of supported commands
            let commands = await this.getCached(
                'commands', () => this.device.getCommands());
            let supportsPauseResume = 0 < commands.length;
            if (supportsPauseResume) this.logIssue(8, commands);

            // Add start, stop, pause, and resume support as appropriate
            this.addActiveProgramControl();
        }
    },

    // Update a cache of the programs supported by the appliance
    async updatePrograms() {
        // Retrieve any previously cached details
        if (!this.programs) {
            this.programs = await this.cache.get('Program details') || [];
            let count = Object.keys(this.programs).length;
            if (count) this.debug('Restored details of ' + count + ' programs');
        }

        // Read the list of all programs supported by the appliance
        let all = await this.getCached('programs',
                                       () => this.device.getAllPrograms());
        if (!all.length) this.warn('Does not support any programs');

        // Merge with any previous list of supported programs
        this.programs = all.map(newProgram => {
            let oldProgram = this.programs.find(p => p.key == newProgram.key);
            return Object.assign({}, oldProgram, newProgram);
        });

        // If possible, read the options supported by each program
        try {
            // Read list of currently available programs (cannot cache this)
            let available = await this.device.getAvailablePrograms();

            // Read the options for each available program
            for (let key of available.map(p => p.key)) {
                let details = await this.getCached('program ' + key,
                                    () => this.device.getAvailableProgram(key));
                let program = this.programs.find(p => p.key == key);
                if (details.options.length) Object.assign(program, details);
            }
        } catch (err) {
            this.reportError(err, 'Reading available program options');
        }

        // Check whether all program options have been read
        let missing = this.programs.filter(p => !p.options).length;
        if (missing) this.warn('Missing details of ' + missing + ' programs');

        // Update the configuration schema
        this.schema.setHasControl(this.device.hasScope('Control'));
        this.setSchemaPrograms(this.programs);
        for (let p of this.programs) this.setSchemaProgramOptions(p);

        // Cache the results
        await this.cache.set('Program details', this.programs);
    },

    // Some appliances change their supported options when a program is selected
    async updateSelectedProgram(key) {
        try {
            let program = this.programs.find(p => p.key == key);
            if (!program) {
                return this.warn('Selected program ' + key
                                 + ' is not supported by the Home Connect API');
            }

            // Read the options for this program
            let details = await this.getCached('program selected ' + key,
                                    () => this.device.getAvailableProgram(key));
            Object.assign(program, details);

            // Update the configuration schema and cache the results
            this.setSchemaProgramOptions(program);
            await this.cache.set('Program details', this.programs);
        } catch (err) {
            this.reportError(err, 'Reading selected program options');
        }
    },

    // Add all supported programs
    addAllPrograms() {
        // Convert the API response to the configuration format
        let config = this.programs.map(program => ({
            name:   this.simpleName(program.name, program.key),
            key:    program.key
        }));

        // Add a service for each supported program
        this.addPrograms(config);
    },

    // Add the programs specified in the configuration file
    addConfiguredPrograms(config) {
        // Treat a single invalid entry as being an empty array
        // (workaround for homebridge-config-ui-x / angular6-json-schema-form)
        if (config.length == 1 && !config[0].name && !config[0].key) {
            this.warn('Treating Invalid programs array as empty'
                      + ' (presumably written by homebridge-config-ui-x');
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
                if (!this.programs.some(all => all.key == program.key))
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

    // Add the ability to pause and resume programs
    addActiveProgramControl(supportsPauseResume = false) {
        // Make the (Operation State) active On characteristic writable
        // (status update is performed by the normal Operation State handler)
        this.activeService.getCharacteristic(Characteristic.On)
            .setProps({perms: [Characteristic.Perms.READ,
                               Characteristic.Perms.WRITE,
                               Characteristic.Perms.NOTIFY]})
            .on('set', this.callbackify(async value => {
                // Use pause and resume if supported in the current state
                let state = this.device.getItem('BSH.Common.Status.OperationState');
                const pauseResumeStates = [
                    'BSH.Common.EnumType.OperationState.DelayedStart',
                    'BSH.Common.EnumType.OperationState.Run',
                    'BSH.Common.EnumType.OperationState.Pause',
                    'BSH.Common.EnumType.OperationState.ActionRequired'
                ];
                if (supportsPauseResume && pauseResumeStates.includes(state)) {
                    this.log((value ? 'RESUME' : 'PAUSE') + ' Program');
                    await this.device.pauseProgram(!value);
                } else {
                    this.log((value ? 'START' : 'STOP') + ' Program');
                    if (value) await this.device.startProgram();
                    else await this.device.stopProgram();
                }
            }));
    },

    // Read and log details of all available programs
    async logPrograms() {
        try {
            // Update the cache of programs supported by this appliance
            await this.updatePrograms();

            // Log details of each program
            let json = {
                [this.device.haId]: {
                    programs:       this.programs.map(program => {
                        let config = {
                            name:   this.simpleName(program.name, program.key),
                            key:    program.key
                        };
                        if (this.device.hasScope('Control')) {
                            config.options = {};
                            for (let option of program.options) {
                                Object.assign(config.options,
                                              this.makeConfigOption(option));
                            }
                        }
                        return config;
                    })
                }
            };
            this.log(this.programs.length + ' programs supported\n'
                     + JSON.stringify(json, null, 4));
        } catch (err) {
            this.reportError(err, 'Identify programs');
        }
    },

    // Convert a program option into the configuration file format
    makeConfigOption(option) {
        // Pick a default value for this option
        let {type, unit} = option;
        let constraints = option.constraints || {};
        let {allowedvalues} = constraints;
        let value = 'value' in option             ? option.value
                    : ('default' in constraints   ? constraints.default
                       : ('min' in constraints    ? constraints.min
                          : (allowedvalues        ? allowedvalues[0]
                             : (type == 'Boolean' ? false : null))));

        // Construct a comment describing the allowed values
        let comment = null;
        if (allowedvalues) {
            comment = allowedvalues;
        } else if ('min' in constraints && 'max' in constraints) {
            let {min, max, stepsize} = option.constraints;
            let commentParts = [];
            if (type) commentParts.push(type);
            commentParts.push('[' + min, '..', max + ']');
            if (stepsize) commentParts.push('step ' + stepsize);
            if (unit) commentParts.push(unit);
            comment = commentParts.join(' ');
        } else if (type == 'Boolean') {
            comment = [true, false];
        }

        // Return the value and comment
        return {
            [option.key]:       value,
            ['_' + option.key]: comment
        };
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
        let options = program.options
                      ? program.options.map(o => this.makeSchemaOption(o)) : [];
        this.schema.setProgramOptions(program.key, options);
    },

    // Convert program options into the configuration schema format
    makeSchemaOption(option) {
        // Common mappings from Home Connect to JSON schema
        let schema = {
            key:    option.key,
            name:   this.makeName(option.name, option.key)
        };
        let constraints = option.constraints || {};
        if ('min' in constraints) schema.minimum = constraints.min;
        if ('max' in constraints) schema.maximum = constraints.max;
        if (constraints.stepsize) schema.multipleOf = constraints.stepsize;
        if (option.unit && option.unit != 'enum') schema.suffix = option.unit;
        if ('default' in constraints) schema.default = constraints.default;

        // Map the type itself
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
