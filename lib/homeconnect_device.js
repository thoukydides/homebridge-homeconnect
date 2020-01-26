// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2020 Alexander Thoukydides

'use strict';

const EventEmitter = require('events');

// Delay before retrying a failed read of appliance state when connected
const CONNECTED_RETRY_MIN_DELAY = 5;        // (seconds)
const CONNECTED_RETRY_MAX_DELAY = 10 * 60;  // (seconds)
const CONNECTED_RETRY_FACTOR = 2;           // (double delay on each retry)

const MS = 1000;

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

        // Disable warning for more than 10 listeners on an event
        this.setMaxListeners(0);

        // Read information from this appliance when it connects
        this.on('connected', item => { if (item.value) this.onConnected(); });
        
        // Start streaming events
        this.listener = event => this.eventListener(event);
        this.api.on(this.haId, this.listener);
    }

    // Stop event stream (and any other autonomous activity)
    stop() {
        this.api.off(this.haId, this.listener);
    }

    // Describe an item
    describe(item) {
        let description = item.key;
        if ('value' in item) {
            description += '=' + item.value;
        } else if ('default' in (item.constraints || {})) {
            description += '=' + item.constraints.default;
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
            let description = this.describe(item);
            this.log(description
                     + ' (' + this.listenerCount(item.key) + ' listeners)');
            try {
                this.emit(item.key, item);
            } catch (err) {
                this.reportError(err, 'Update emit ' + description);
            }
        });
    }

    // Get a cached item's value
    getItem(key) {
        let item = this.items[key] || {};
        return item.value;
    }

    // Read details about this appliance (especially its connection status)
    async getAppliance() {
        try {
            this.requireIdentify();
            let appliance = await this.api.getAppliance(this.haId);
            if (appliance === undefined) throw new Error('Empty response');
            this.update([{ key: 'connected', value: appliance.connected }]);
            return appliance;
        } catch (err) {
            throw this.reportError(err, 'GET appliance (connected?)');
        }
    }
    
    // Read current status
    async getStatus() {
        try {
            this.requireMonitor();
            let status = await this.api.getStatus(this.haId);
            if (status === undefined) throw new Error('Empty response');
            this.update(status);
            return status;
        } catch (err) {
            throw this.reportError(err, 'GET status');
        }
    }

    // Read current settings
    async getSettings() {
        try {
            this.requireSettings();
            let settings = await this.api.getSettings(this.haId);
            if (settings === undefined) throw new Error('Empty response');
            this.update(settings);
            return settings;
        } catch (err) {
            throw this.reportError(err, 'GET settings');
        }
    }

    // Read a single setting
    async getSetting(settingKey) {
        try {
            this.requireSettings();
            let item = await this.api.getSetting(this.haId, settingKey);
            if (item === undefined) throw new Error('Empty response');
            this.update([item]);
            return item;
        } catch (err) {
            let key = (((err.response || {}).body || {}).error || {}).key;
            if (key == 'SDK.Error.UnsupportedSetting'
                || key == 'SDK.Simulator.InternalError') {
                // Suppress error when the setting is unsupported
                return null;
            }
            throw this.reportError(err, 'GET ' + settingKey);
        }
    }

    // Write a single setting
    async setSetting(settingKey, value) {
        try {
            this.requireSettings();
            await this.api.setSetting(this.haId, settingKey, value);
            this.update([{ key: settingKey, value: value }]);
        } catch (err) {
            throw this.reportError(err, 'SET ' + settingKey + '=' + value);
        }
    }

    // Read the list of all programs
    async getAllPrograms() {
        try {
            this.requireMonitor();
            let programs = await this.api.getPrograms(this.haId);
            if (programs === undefined) throw new Error('Empty response');
            return programs;
        } catch (err) {
            throw this.reportError(err, 'GET programs');
        }
    }

    // Read the list of currently available programs
    async getAvailablePrograms() {
        try {
            this.requireMonitor();
            let programs = await this.api.getAvailablePrograms(this.haId);
            if (programs === undefined) throw new Error('Empty response');
            return programs;
        } catch (err) {
            throw this.reportError(err, 'GET available programs');
        }
    }

    // Read the options for a currently available program
    async getAvailableProgram(programKey) {
        try {
            this.requireMonitor();
            let program = await this.api.getAvailableProgram(this.haId,
                                                             programKey);
            if (program === undefined) throw new Error('Empty response');
            return program;
        } catch (err) {
            throw this.reportError(err, 'GET available program ' + programKey);
        }
    }

    // Read the currently selected program
    async getSelectedProgram() {
        try {
            this.requireMonitor();
            let program = await this.api.getSelectedProgram(this.haId);
            if (program === undefined) throw new Error('Empty response');
            this.update([{ key:   'BSH.Common.Root.SelectedProgram',
                           value: program.key }]);
            if (this.getItem('BSH.Common.Status.OperationState')
                == 'BSH.Common.EnumType.OperationState.Ready') {
                // Only update options when no program is active
                this.update(program.options);
            }
            return program;
        } catch (err) {
            if ((((err.response || {}).body || {}).error || {}).key
                == 'SDK.Error.NoProgramSelected') {
                // Suppress error when there is no selected program
                return null;
            }
            throw this.reportError(err, 'GET selected program');
        }
    }

    // Select a program
    async setSelectedProgram(programKey, options = {}) {
        try {
            this.requireRemoteControl();
            let programOptions = [];
            for (let key of Object.keys(options)) {
                programOptions.push({
                    key:   key,
                    value: options[key]
                });
            }
            await this.api.setSelectedProgram(this.haId, programKey,
                                              programOptions);
            this.update([{ key:   'BSH.Common.Root.SelectedProgram',
                           value: programKey }]);
            this.update(programOptions);
        } catch (err) {
            throw this.reportError(err, 'SET selected program ' + programKey);
        }
    }

    // Read the currently active program (if any)
    async getActiveProgram() {
        try {
            // Only request the active program if one might be active
            let inactiveStates = [
                'BSH.Common.EnumType.OperationState.Inactive',
                'BSH.Common.EnumType.OperationState.Ready'
            ];
            let operationState =
                this.getItem('BSH.Common.Status.OperationState');
            if (!inactiveStates.includes(operationState)) {
                this.requireMonitor();
                let program = await this.api.getActiveProgram(this.haId);
                if (program === undefined) throw new Error('Empty response');
                this.update([{ key:   'BSH.Common.Root.ActiveProgram',
                               value: program.key }]);
                this.update(program.options);
                return program;
            } else {
                this.log('Ignoring GET active program in '
                         + operationState);
                return null;
            }
        } catch (err) {
            if ((((err.response || {}).body || {}).error || {}).key
                == 'SDK.Error.NoProgramActive') {
                // Suppress error when there is no active program
                return null;
            }
            throw this.reportError(err, 'GET active program');
        }
    }

    // Start a program
    async startProgram(programKey, options = {}) {
        try {
            this.requireRemoteStart();
            if (!programKey)
                programKey = this.getItem('BSH.Common.Root.SelectedProgram');
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
            throw this.reportError(err, 'START active program ' + programKey);
        }
    }

    // Stop a program
    async stopProgram() {
        try {
            // No action required unless a program is active
            let activeStates = [
                'BSH.Common.EnumType.OperationState.DelayedStart',
                'BSH.Common.EnumType.OperationState.Run',
                'BSH.Common.EnumType.OperationState.Pause',
                'BSH.Common.EnumType.OperationState.ActionRequired'
            ];
            let operationState =
                this.getItem('BSH.Common.Status.OperationState');
            if (activeStates.includes(operationState)) {
                this.requireRemoteControl();
                await this.api.stopActiveProgram(this.haId);
            } else {
                this.log('Ignoring STOP active program in '
                         + operationState);
            }
        } catch (err) {
            throw this.reportError(err, 'STOP active program');
        }
    }

    // Get a list of supported commands
    async getCommands() {
        try {
            this.requireControl();
            let commands = await this.api.getCommands(this.haId);
            if (commands === undefined) throw new Error('Empty response');
            return commands;
        } catch (err) {
            if ((((err.response || {}).body || {}).error || {}).key == '404') {
                // Suppress error when the API is not supported
                return [];
            }
            throw this.reportError(err, 'GET commands');
        }
    }

    // Pause or resume program
    async pauseProgram(pause = true) {
        let command = pause ? 'BSH.Common.Command.PauseProgram'
                            : 'BSH.Common.Command.ResumeProgram';
        try {
            this.requireRemoteControl();
            return await this.api.setCommand(this.haId, command);
        } catch (err) {
            throw this.reportError(err, 'COMMAND ' + command);
        }
    }

    // Set a specific option of the active program
    async setActiveProgramOption(optionKey, value) {
        try {
            this.requireRemoteControl();
            await this.api.setActiveProgramOption(this.haId, optionKey, value);
            this.update([{ key: optionKey, value: value }]);
        } catch (err) {
            throw this.reportError(err, 'SET ' + optionKey + '=' + value);
        }
    }

    // Wait for the appliance to be connected
    waitConnected(immediate = false) {
        // Check whether the appliance is already connected
        if (immediate && this.getItem('connected'))
            return Promise.resolve();

        // Otherwise wait
        return new Promise((resolve, reject) => {
            // Listen for updates to the operation state
            let listener = item => {
                if (item.value) {
                    this.off('connected', listener);
                    resolve();
                }
            };
            this.on('connected', listener);
        });
    }

    // Wait for the appliance to enter specific states
    waitOperationState(states, milliseconds) {
        // Check whether the appliance is already in the target state
        if (states.includes(this.getItem('BSH.Common.Status.OperationState')))
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

        // Reset the list of pending appliance state to read
        let outstanding = (this.connectedActions || []).length;
        this.connectedActions = [
            () => this.getStatus(),
            () => this.getSettings()
        ];
        if (this.hasPrograms) this.connectedActions.push(
            () => this.getSelectedProgram(),
            () => this.getActiveProgram()
        );

        // Performs the pending reads
        let retryDelay = CONNECTED_RETRY_MIN_DELAY;
        let doPending = async () => {
            try {

                // Attempt all pending reads
                while (this.connectedActions.length) {
                    // Careful to avoid losing action if error or array replaced
                    let connectedActions = this.connectedActions;
                    await connectedActions[0]();
                    connectedActions.shift();
                }

                // Successfully finished all pending reads
                delete this.connectedScheduled;
                this.log('Finished reading appliance state');

            } catch (err) {

                // Attempt to recover after an error
                if (this.getItem('connected')) {
                    this.reportError(err, 'Connected read (will retry)');
                    this.log('Still connected, so trying again in '
                             + retryDelay + ' seconds...');
                    this.connectedScheduled =
                        setTimeout(doPending, retryDelay * MS);
                    retryDelay = Math.min(retryDelay * CONNECTED_RETRY_FACTOR,
                                          CONNECTED_RETRY_MAX_DELAY);
                } else {
                    this.reportError(err, 'Connected read (connection lost)');
                    this.log('Lost connection, so will try later...');
                    delete this.connectedScheduled;
                }
            }
        };

        // Schedule the pending reads
        if (!this.connectedScheduled) {
            this.log('Connected, so reading appliance state...');
            this.connectedScheduled = setTimeout(doPending);
        } else {
            this.log('Connected again, so restarting read of appliance state ('
                     + outstanding + ' operations were still pending)...');
        }
    }

    // Ensure that the appliance is connected
    requireConnected() {
        if (!this.getItem('connected'))
            throw new Error('The appliance is offline');
    }

    // Ensure that IdentifyAppliance scope has been authorised
    requireIdentify() {
        if (!this.api.hasScope('IdentifyAppliance'))
            throw new Error('IdentifyAppliance scope has not been authorised');
    }

    // Ensure that Monitor scope has been authorised
    requireMonitor() {
        if (!this.hasScope('Monitor'))
            throw new Error('Monitor scope has not been authorised');
        this.requireConnected();
    }

    // Ensure that Settings scope has been authorised
    requireSettings() {
        if (!this.hasScope('Settings'))
            throw new Error('Settings scope has not been authorised');
        this.requireConnected();
    }

    // Ensure that Control scope has been authorised
    requireControl() {
        if (!this.hasScope('Control'))
            throw new Error('Control scope has not been authorised');
        this.requireConnected();
    }

    // Ensure that remote control is currently allowed
    requireRemoteControl() {
        this.requireControl();
        if (this.getItem('BSH.Common.Status.LocalControlActive'))
            throw new Error('Appliance is being manually controlled locally');
        if (this.getItem('BSH.Common.Status.RemoteControlActive') === false)
            throw new Error('Remote control not enabled on the appliance');
    }

    // Ensure that remote start is currently allowed
    requireRemoteStart() {
        this.requireRemoteControl();
        if (this.getItem('BSH.Common.Status.RemoteControlStartAllowed')
            === false)
            throw new Error('Remote start not enabled on the appliance');
    }

    // Check whether a particular scope has been authorised
    hasScope(scope) {
        return this.api.hasScope(scope)
            || this.api.hasScope(this.type + '-' + scope);
    }

    // Enable polling of selected/active programs when connected
    pollPrograms(enable = true) {
        this.hasPrograms = enable;
    }

    // Process received events
    async eventListener(event) {
        let itemCount = event.data ? event.data.items.length : 0;
        this.log('Event ' + event.event + ' (' + itemCount
                 + (itemCount == 1 ? ' item)' : ' items)'));
        switch (event.event) {
        case 'START':
            try { await this.getAppliance(); } catch (err) {}
            break;
        case 'STOP':
            this.update([{ key: 'connected', value: false }]);
            break;
        case 'PAIRED':
        case 'DEPAIRED':
            // These should be handled by adding/removing the acccessory
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
            this.reportError(new Error('Unsupported type: ' + event.event),
                             'Event stream');
            break;
        }
    }

    // Query the currently selected API language
    getLanguage() {
        return this.api.language;
    }

    // Report an error
    reportError(err, op) {
        this.emit('error', err, op);
        return err;
    }
}
