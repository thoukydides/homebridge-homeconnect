// Homebridge plugin for Home Connect home appliances
// Copyright © 2019 Alexander Thoukydides

'use strict';

const EventEmitter = require('events');

// Delay after appliance connects befoer reading all of its details
const CONNECTED_READ_DELAY = 5 * 1000; // (milliseconds)

// Low-level access to the Home Connect API
module.exports = class HomeConnectDevice extends EventEmitter {

    // Create a new API object
    constructor(log, api, ha) {
        super();
        this.log = msg => log('[' + ha.name + '] ' + msg);
        this.api = api;
        Object.assign(this, ha);

        // Initial device state (generating an initial event asynchronously)
        this.items = {};
        setTimeout(() => {
            this.update([{ key: 'connected', value: this.connected }]);
        });

        // Read information from this appliance when it connects
        this.on('connected', item => { if (item.value) this.onConnected(); });
        
        // Start streaming events
        this.getEvents();
    }

    // Stop event stream (and any other autonomous activity)
    stop() {
        this.stopped = true;
        this.stopEvents();
    }

    // Describe an item
    describe(item) {
        let description = item.key;
        if ('value' in item) {
            description += '=' + item.value;
        }
        let constraints = item.constraints || {};
        if ('min' in constraints && 'max' in constraints) {
            description += '=[' + constraints.min + '..' + constraints.max;
            if (constraints.step) description += '/' + constraints.step;
            description += ']';
        }
        if (constraints.allowedvalues) {
            description += '=' + constraints.allowedvalues.join('|');
        }
        if (item.unit && item.unit != 'enum') {
            description += ' ' + item.unit;
        }
        return description;
    }
    
    // Update cached values and notify listeners
    update(items) {
        // Update cached state for all items before notifying any listeners
        items.forEach(item => {
            this.items[item.key] = item;
        });

        // Notify listeners for each item
        items.forEach(item => {
            this.log(this.describe(item)
                     + ' (' + this.listenerCount(item.key) + ' listeners)');
            this.emit(item.key, item);
        });
    }
    
    // Read current status
    async getStatus() {
        try {
            let status = await this.api.getStatus(this.haId);
            this.update(status);
            return status;
        } catch (err) {
            throw this.error('GET status', err);
        }
    }

    // Read current settings
    async getSettings() {
        try {
            let settings = await this.api.getSettings(this.haId);
            this.update(settings);
            return settings;
        } catch (err) {
            throw this.error('GET settings', err);
        }
    }

    // Read a single setting
    async getSetting(settingKey) {
        try {
            let item = await this.api.getSetting(this.haId, settingKey);
            this.update([item]);
            return item.value;
        } catch (err) {
            throw this.error('GET ' + settingKey, err);
        }
    }

    // Write a single setting
    async setSetting(settingKey, value) {
        try {
            await this.api.setSetting(this.haId, settingKey, value);
            this.update([{ key: settingKey, value: value }]);
        } catch (err) {
            throw this.error('SET ' + settingKey + '=' + value, err);
        }
    }

    // Read the list of all available programs and their options
    async getAvailablePrograms() {
        try {
            let programs = await this.api.getAvailablePrograms(this.haId);
            for (let program of programs) {
                let key = program.key;
                let detail = await this.api.getAvailableProgram(this.haId, key);
                Object.assign(program, detail);

                // Ensure that the program has a name
                if (!program.name) {
                    let result = /[^\.]*$/.exec(program.key);
                    program.name = result ? result[0] : program.key;
                }
            }
            return programs;
        } catch (err) {
            throw this.error('GET available programs', err);
        }
    }

    // Read the currently selected program
    async getSelectedProgram() {
        try {
            let program = await this.api.getSelectedProgram(this.haId);
            this.update([{ key:   'BSH.Common.Root.SelectedProgram',
                           value: program.key }]);
            // (program.options may be out of date when a program is active)
            return program;
        } catch (err) {
            if ((((err.response || {}).body || {}).error || {}).key
                == 'SDK.Error.NoProgramSelected') {
                // Suppress error when there is no selected program
                return null;
            }
            throw this.error('GET selected program', err);
        }
    }

    // Read the currently active program (if any)
    async getActiveProgram() {
        try {
            let program = await this.api.getActiveProgram(this.haId);
            this.update([{ key:   'BSH.Common.Root.ActiveProgram',
                           value: program.key }]);
            this.update(program.options);
            return program;
        } catch (err) {
            if ((((err.response || {}).body || {}).error || {}).key
                == 'SDK.Error.NoProgramActive') {
                // Suppress error when there is no active program
                return null;
            }
            throw this.error('GET active program', err);
        }
    }

    // Start a program
    async startProgram(programKey, options = {}) {
        try {
            let programOptions = [];
            for (let key of Object.keys(options)) {
                programOptions.push({
                    key:   key,
                    value: options[key]
                });
            }
            await this.api.setActiveProgram(this.haId, programKey,
                                            programOptions);
            this.update([{ key:   'BSH.Common.Root.ActiveProgram',
                           value: programKey }]);
            this.update(programOptions);
        } catch (err) {
            throw this.error('START active program ' + programKey, err);
        }
    }

    // Stop a program
    async stopProgram() {
        try {
            await this.api.stopActiveProgram(this.haId);
        } catch (err) {
            throw this.error('STOP active program', err);
        }
    }

    // Pause or resume program
    async pauseProgram(pause = true) {
        let command = pause ? 'BSH.Common.Command.PauseProgram'
                            : 'BSH.Common.Command.ResumeProgram';
        try {
            return await this.api.setCommand(this.haId, command);
        } catch (err) {
            throw this.error('COMMAND ' + command, err);
        }
    }

    // Set a specific option of the active program
    async setActiveProgramOption(optionKey, value) {
        try {
            await this.api.setActiveProgramOption(this.haId, optionKey, value);
            this.update([{ key: optionKey, value: value }]);
        } catch (err) {
            throw this.error('SET ' + optionKey + '=' + value, err);
        }
    }

    // Wait for the appliance to enter specific states
    waitOperationState(states, milliseconds) {
        // Check whether the appliance is already in the target state
        if (states.includes(this.items['BSH.Common.Status.OperationState']))
            return Promise.resolve();

        // Otherwise wait
        let listener;
        return new Promise((resolve, reject) => {
            // Listen for updates to the operation state
            listener = item => {
                if (states.includes(item.value)) resolve();
            };
            this.on('BSH.Common.Status.OperationState', listener);

            // Wait for the specified timeout, if any
            if (milliseconds !== undefined)
                setTimeout(() => {
                    reject(new Error('Timeout waiting for OperationState'));
                }, milliseconds);
        }).finally(() => {
            // Remove the update listener
            this.off('BSH.Common.Status.OperationState', listener);
        });
    }

    // Refresh appliance information when it reconnects
    async onConnected() {
        try {
            
            // Ignore if still dealing with a previous connected event
            if (this.onConnectedBusy) return;
            this.onConnectedBusy = true;

            // Read the current status and settings
            this.log('Connected, so reading appliance state...');
            await this.getStatus();
            await this.getSettings();

            // Read the selected and active program
            if (this.hasPrograms()) {
                await this.getSelectedProgram();
                await this.getActiveProgram();
            }
            
        } catch (err) {
            this.error('Connected update', err);
        } finally {
            this.onConnectedBusy = false;
        }
    }

    // Does this type of device support programs
    hasPrograms() {
        return /^(CleaningRobot|CoffeeMaching|Dishwasher|Dryer|Hob|Hood|Oven|Washer|WasherDryer)$/.test(this.type);
    }
    
    // Start streaming events
    async getEvents() {
        // Receive events
        let listener = event => {
            // Received an event
            let itemCount = event.data ? event.data.items.length : 0;
            this.log('Event ' + event.event + ' (' + itemCount
                     + (itemCount == 1 ? ' item)' : ' items)'));
            switch (event.event) {
            case 'KEEP-ALIVE':
                // Ignore keep-alive events
                break;
            case 'CONNECTED':
                this.update([{ key: 'connected', value: true }]);
                break;
            case 'DISCONNECTED':
                this.update([{ key: 'connected', value: false }]);
                break;
            case 'STATUS':
            case 'EVENT':
            case 'NOTIFY':
                this.update(event.data.items);
                break;
            default:
                this.error('Unsupported event type: ' + event.event);
                break;
            }
        };
        this.api.on(this.haId, listener);
        
        // Keep restarting the stream while this device has not been stopped
        while (!this.stopped) {
            try {
                await this.api.getEvents(this.haId);
            } catch (err) {
                this.error('STREAM', err);
            }
        }

        // Remove the event listener
        this.api.off(this.haId, listener);
    }

    // Stop streaming events
    stopEvents() {
        try {
            this.api.stopEvents(this.haId);
        } catch (err) {
            this.error('STREAM stop', err);
        }
    }

    // Report an error
    error(msg, err) {
        this.emit('error', 'Error ' + msg + (err ? ': ' + err.message : ''));
        return err;
    }
}
