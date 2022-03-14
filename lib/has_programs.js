// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2022 Alexander Thoukydides

'use strict';

let Service, Characteristic;

const MS = 1000;

// Maximum time to wait for an appliance to be ready after being switched on
const READY_TIMEOUT = 2 * 60 * MS;

// Delays when selecting programs to read their options
const READY_DELAY = 1 * MS;

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
        await this.initPrograms();
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
            let supports = key => commands.some(command => command.key == key);
            let supportsPause  = supports('BSH.Common.Command.PauseProgram');
            let supportsResume = supports('BSH.Common.Command.ResumeProgram');
            if (supportsPause && supportsResume) {
                this.log('Can pause and resume programs');
            } else if (supportsPause) {
                this.log('Can pause (but not resume) programs');
            } else if (supportsResume) {
                this.log('Can resume (but not pause) programs');
            }

            // Add start, stop, pause, and resume support as appropriate
            this.addActiveProgramControl(supportsPause, supportsResume);
        }
    },

    // Restore and populate a cache of the programs supported by the appliance
    async initPrograms() {
        // Retrieve any previously cached program details
        this.programs = await this.cache.get('Program details') || [];
        let count = Object.keys(this.programs).length;
        if (count) this.debug('Restored details of ' + count + ' programs');

        // Attempt to update the list of programs
        await this.device.waitConnected(true);
        await this.refreshPrograms(false);
    },

    // Refresh details of all programs
    async refreshPrograms(active = false) {
        try {
            // Read the list of all supported programs
            let all = await this.getCached('programs',
                                           () => this.device.getAllPrograms());
            if (!all.length) this.warn('Does not support any programs');

            // Merge any previous program details with the current list
            this.programs = all.map(newProgram => Object.assign({}, this.programs.find(p => p.key == newProgram.key), newProgram));

            // Read the list of currently available programs (not cached)
            let available = await this.device.getAvailablePrograms();
            let availableKeys = available.map(p => p.key);
            let unavailable = this.programs.length - available.length;
            if (unavailable)
                this.warn(unavailable + ' of ' + this.programs.length
                          + ' programs are currently unavailable');

            // First read programs passively (less likely to generate errors)
            let passiveKeys = availableKeys.filter(key => {
                let program = this.programs.find(p => p.key == key);
                return program && !program.selected;
            });
            if (passiveKeys.length) {
                // Update details of the selected programs
                this.log('Passively reading options for '
                         + passiveKeys.length + ' programs');
                await this.updateProgramsWithoutSelecting(passiveKeys);
            }

            // Check whether any programs should be actively read
            let activeKeys = availableKeys.filter(key => {
                // Only read missing programs unless an active refresh
                let program = this.programs.find(p => p.key == key);
                return program && this.device.hasScope('Control')
                       && (active || !program.selected);
            });
            if (activeKeys.length) {
                // Check whether the appliance is in a suitable state
                let problems = [];
                const inactiveStates = [
                    'BSH.Common.EnumType.OperationState.Inactive',
                    'BSH.Common.EnumType.OperationState.Ready'
                ];
                if (!inactiveStates.includes(this.device.getItem('BSH.Common.Status.OperationState')))
                    problems.push('there is an active program');

                if (this.device.getItem('BSH.Common.Status.LocalControlActive'))
                    problems.push('appliance is being controlled locally');
                if (this.device.getItem('BSH.Common.Status.RemoteControlActive')
                    === false)
                    problems.push('remote control is not enabled');
                if (problems.length) {
                    this.warn('Unable to actively read options for '
                              + activeKeys.length + ' programs ('
                              + problems.join(', ') + ')');
                } else {
                    // Update details of the selected programs
                    this.log('Actively reading options for '
                             + activeKeys.length + ' programs');
                    await this.updateProgramsSelectFirst(activeKeys);
                }
            }
        } catch (err) {
            this.reportError(err, 'Reading available programs and options');
        } finally {
            // Regardless of what happened save the results and updated schema
            await this.savePrograms();

            // Summarise the results
            let missing = this.programs.filter(p => !p.options).length;
            let unselected = this.device.hasScope('Control')
                             && this.programs.filter(p => !p.selected).length;
            if (missing || unselected) {
                if (missing) {
                    this.warn('Missing options for ' + missing + ' programs');
                } else {
                    this.warn('Possible missing options for ' + unselected
                              + ' programs');
                }
                this.warn('To update the program options for this appliance:');
                if (this.device.hasScope('Control')) {
                    this.warn('  - Enable remote control on the appliance');
                    this.warn('  - Avoid operating the appliance locally');
                }
                this.warn('  - Ensure that no program is active');
                this.warn('  - Fill any consumables that may be required');
                this.warn('  - Either restart Homebridge'
                          + " or invoke the appliance's Identify routine");
            } else {
                this.log('Finished reading available program options');
            }
        }
    },

    // Update the details of specified programs without selecting them first
    async updateProgramsWithoutSelecting(programKeys) {
        for (let programKey of programKeys) {
            let details = await this.getCached('program ' + programKey,
                             () => this.device.getAvailableProgram(programKey));
            this.updateCachedProgram(details, false);
        }
    },

    // Update the details of specified programs by selecting them first
    async updateProgramsSelectFirst(programKeys) {
        // Remember the original appliance state
        let initialPowerState =
            this.device.getItem('BSH.Common.Setting.PowerState');
        let initialSelectedProgram =
            this.device.getItem('BSH.Common.Root.SelectedProgram');

        // Ignore notifications about programs being selected
        this.autoSelectingPrograms = true;

        // Select each program in turn and read its details
        try {
            for (let programKey of programKeys) {
                let details =
                    await this.getCached('program select ' + programKey,
                           () => this.selectAndGetAvailableProgram(programKey));
                this.updateCachedProgram(details, true);
            }
        } finally {
            // Best-effort attempt to restore the originally selected program
            if (initialSelectedProgram
                && this.device.getItem('BSH.Common.Root.SelectedProgram')
                   != initialSelectedProgram) {
                try { await this.device.setSelectedProgram(initialSelectedProgram); } catch (err) {}
            }

            // Best-effort attempt to restore the original power state
            if (this.device.getItem('BSH.Common.Setting.PowerState')
                != initialPowerState) {
                try { await this.device.setSetting('BSH.Common.Setting.PowerState', initialPowerState); } catch (err) {}
            }

            // Re-enable monitoring of the selected program
            delete this.autoSelectingPrograms;
        }
    },

    // Update the cached details of a single program
    updateCachedProgram(details, selected) {
        // Find the cached details for this program
        let program = this.programs.find(p => p.key == details.key);
        if (!program) throw new Error('Attempted to update unknown program');
        if (program.selected && !selected)
            throw new Error('Attempted to overwrite selected program details');

        // Update the cache for this program
        if (selected || !program.options || details.options.length) {
            Object.assign(program, details);
            if (selected) program.selected = true;
        }
    },

    // Select a program and read its details
    async selectAndGetAvailableProgram(programKey) {
        // Switch the appliance on, if necessary
        let powerState = this.device.getItem('BSH.Common.Setting.PowerState');
        if (powerState && powerState != 'BSH.Common.EnumType.PowerState.On') {
            this.warn('Switching appliance on to read program options');
            await this.device.setSetting('BSH.Common.Setting.PowerState',
                                         'BSH.Common.EnumType.PowerState.On');
            await this.device.api.sleep(READY_DELAY);
            await this.device.waitOperationState(
                ['BSH.Common.EnumType.OperationState.Ready'], READY_TIMEOUT);
            await this.device.api.sleep(READY_DELAY);
        }

        // Select the program, if necessary
        if (this.device.getItem('BSH.Common.Root.SelectedProgram')
            != programKey) {
            this.warn('Temporarily selecting program ' + programKey
                      + ' to read its options');
            await this.device.setSelectedProgram(programKey);
        }

        // Read the program's options
        return this.getAvailableProgram(programKey);
    },

    // Read the details of the currently selected program
    async getAvailableProgram(programKey) {
        // Read the program's options
        this.requireProgramReady(programKey);
        let details = await this.device.getAvailableProgram(programKey);
        this.requireProgramReady(programKey);

        // Return the program details
        return details;
    },

    // Ensure that the required program is selected and ready
    requireProgramReady(programKey) {
        // The appliance needs to be ready to read the program details reliably
        if (this.device.getItem('BSH.Common.Status.OperationState')
            != 'BSH.Common.EnumType.OperationState.Ready')
            throw new Error('Appliance is not ready'
                            + ' (switched on without an active program)');

        // The program must be currently selected
        if (this.device.getItem('BSH.Common.Root.SelectedProgram')
            != programKey)
            throw new Error('Program ' + programKey + ' is not selected');
    },

    // Update the configuration schema after updating the cached programs
    async savePrograms() {
        // Programs can only be selected or started with Control scope
        this.schema.setHasControl(this.device.hasScope('Control'));

        // Update the list of programs and their options in the schema
        this.setSchemaPrograms(this.programs);
        for (let p of this.programs) this.setSchemaProgramOptions(p);

        // Cache the results
        await this.cache.set('Program details', this.programs);
    },

    // Some appliances change their supported options when a program is selected
    async updateSelectedProgram(programKey) {
        try {
            // Ignore if this plugin selected the program automatically
            if (this.autoSelectingPrograms) return;

            // Check that there is actually a program selected
            if (!programKey) return this.log('No program selected');

            // Check that the program is actually supported
            let program = this.programs.find(p => p.key == programKey);
            if (!program) {
                return this.warn('Selected program ' + programKey
                                 + ' is not supported by the Home Connect API');
            }

            // Read and save the options for this program
            await this.device.api.sleep(READY_DELAY);
            let details = await this.getCached('program select ' + programKey,
                                    () => this.getAvailableProgram(programKey));
            this.updateCachedProgram(details, true);
            await this.savePrograms();
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
            this.warn('Programs cannot be controlled without Control scope; re-authorise with the Home Connect API to add the missing scope');
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
                // Convert any absolute times to relative times in seconds
                let fixedOptions = Object.assign({}, options);
                Object.keys(fixedOptions).forEach(key => {
                    if (!this.isOptionRelative(key)) return;
                    fixedOptions[key] = this.timeToSeconds(fixedOptions[key]);
                });

                // Select or start/stop the program as appropriate
                if (selectonly) {
                    // Select this program and its options
                    if (value) {
                        this.log("SELECT Program '" + name + "' (" + key + ')');
                        await this.device.setSelectedProgram(key, fixedOptions);
                        setTimeout(() => {
                            service.updateCharacteristic(Characteristic.On,
                                                         false);
                        }, 0);
                    }
                } else {
                    // Attempt to start or stop the program
                    if (value) {
                        this.log("START Program '" + name + "' (" + key + ')');
                        await this.device.startProgram(key, fixedOptions);
                    } else {
                        this.log("STOP Program '" + name + "' (" + key + ')');
                        await this.device.stopProgram();
                    }
                }
            }));

        // Update the status
        let scheduled;
        let update = active => {
            clearTimeout(scheduled);
            scheduled = setTimeout(() => {
                let prevActive =
                    service.getCharacteristic(Characteristic.On).value;
                if (active != prevActive) {
                    this.log("Program '" + name + "' (" + key + ') '
                             + (active ? 'active' : 'inactive'));
                    service.updateCharacteristic(Characteristic.On, active);
                }
            });
        };
        this.device.on('BSH.Common.Root.ActiveProgram',
                       item => update(item.value == key));
        this.device.on('BSH.Common.Status.OperationState', item => {
            const inactiveStates = [
                'BSH.Common.EnumType.OperationState.Inactive',
                'BSH.Common.EnumType.OperationState.Ready',
                'BSH.Common.EnumType.OperationState.Finished'
            ];
            if (inactiveStates.includes(item.value)) update(false);
        });

        // Return the service
        return service;
    },

    // Add the ability to pause and resume programs
    addActiveProgramControl(supportsPause = false, supportsResume = false) {
        // Make the (Operation State) active On characteristic writable
        // (status update is performed by the normal Operation State handler)
        this.activeService.getCharacteristic(Characteristic.On)
            .setProps({perms: [Characteristic.Perms.READ,
                               Characteristic.Perms.WRITE,
                               Characteristic.Perms.NOTIFY]})
            .on('set', this.callbackify(async value => {
                // Use pause and resume if supported in the current state
                let state = this.device.getItem('BSH.Common.Status.OperationState');
                const pauseStates = [
                    'BSH.Common.EnumType.OperationState.DelayedStart',
                    'BSH.Common.EnumType.OperationState.Run',
                    'BSH.Common.EnumType.OperationState.ActionRequired'
                ];
                const resumeStates = [
                    'BSH.Common.EnumType.OperationState.Pause'
                ];
                if (!value && supportsPause && pauseStates.includes(state)) {
                    this.log('PAUSE Program');
                    await this.device.pauseProgram(true);
                } else if (value && supportsResume
                           && resumeStates.includes(state)) {
                    this.log('RESUME Program');
                    await this.device.pauseProgram(false);
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
            // Read the supported programs and their options
            await this.refreshPrograms(true);

            // Log details of each program
            let json = {
                [this.device.haId]: {
                    programs:       this.programs.map(program => {
                        let config = {
                            name:   this.simpleName(program.name, program.key),
                            key:    program.key
                        };
                        if (this.device.hasScope('Control')
                            && program.options) {
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

        // Alternative absolute format for relative times
        if (this.isOptionRelative(option.key)) {
            comment += ' OR Time HH:MM';
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

        // Allow an absolute time to be specified for relative times
        if (this.isOptionRelative(option.key)) {
            schema.type = 'string';
            schema.suffix += ' (or HH:MM absolute time)';
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
    },

    // Check if an option key is a relative time
    isOptionRelative(key) {
        // BSH.Common.Option.StartInRelative
        // or BSH.Common.Option.FinishInRelative
        return /InRelative$/.test(key);
    },

    // Convert an absolute time (HH:MM) to the nubmer of seconds in the future
    timeToSeconds(value) {
        // Assume that simple integers are already relative times in seconds
        if (/^\d+$/.test(value)) return parseInt(value, 10);

        // Otherwise attempt to parse the value as a time
        let parsed = value.match(/^(\d\d):(\d\d)$/);
        if (!parsed) {
            throw new Error("Time '" + value + "' is not in 'HH:MM' format");
        }
        let [hours, minutes] = parsed.slice(1, 3).map(d => parseInt(d, 10));

        // Convert to seconds in the future
        let now = new Date();
        let then = new Date(now.getFullYear(), now.getMonth(), now.getDate(),
                            hours, minutes);
        let seconds = Math.floor((then - now) / 1000);
        if (seconds < 0) seconds += 24 * 60 * 60;
        this.debug('Converted time ' + value + ' to ' + seconds + ' seconds');
        return seconds;
    }
}
