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
    
    // Update cached values and notify listeners
    update(items) {
        // Update cached state for all items before notifying any listeners
        items.forEach(item => {
            this.items[item.key] = item;
        });

        // Notify listeners for each item
        items.forEach(item => {
            this.log(item.key + '=' + item.value
                     + (item.unit ? ' ' + item.unit : '')
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
            
        } catch (err) {
            this.error('Connected update', err);
        } finally {
            this.onConnectedBusy = false;
        }
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
