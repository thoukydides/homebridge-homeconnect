// Homebridge plugin for Home Connect home appliances
// Copyright © 2019 Alexander Thoukydides

'use strict';

const HasPower = require('./has_power.js');

let Service, Characteristic;

// A Homebridge accessory for a generic Home Connect home appliance
module.exports = class ApplianceGeneric {

    // Initialise an appliance
    constructor(log, homebridge, device, accessory, config) {
        this.logRaw       = log;
        this.homebridge   = homebridge;
        this.device       = device;
        this.accessory    = accessory;
        this.name         = accessory.displayName;
        this.config       = config;

        // Log some basic information about this appliance
        this.log(device.brand + ' ' + device.type
                 + ' (E-Nr: ' + device.enumber + ')');

        // Shortcuts to useful HAP objects
        Service = homebridge.hap.Service;
        Characteristic = homebridge.hap.Characteristic;

        // Log errors from the Home Connect API as warnings
        device.on('error', err => this.warn(err));

        // Handle the identify request
        accessory.on('identify', this.callbackify(this.identify));
        
        // Set the Accessory Information service characteristics
        this.informationService =
            accessory.getService(Service.AccessoryInformation);
        this.informationService
            .setCharacteristic(Characteristic.Manufacturer, device.brand)
            .setCharacteristic(Characteristic.Model,        device.enumber)
            .setCharacteristic(Characteristic.SerialNumber, device.haId)
            .setCharacteristic(Characteristic.FirmwareRevision, '0');

        // Add a Home Appliance service
        this.haService =
            accessory.getService(Service.HomeAppliance)
            || accessory.addService(Service.HomeAppliance, this.name);
        
        // Update reachability when connection status changes
        device.on('connected', item => {
            this.log(item.value ? 'Connected' : 'Disconnected');
            this.accessory.updateReachability(item.value);
        });

        // All appliances have power state
        this.mixin(HasPower);
    }

    // The appliance no longer exists so stop updating it
    unregister() {
        this.device.stop();
        this.device.removeAllListeners();
    }

    // Identify this appliance
    identify(paired) {
        // Log the current status of this appliance
        this.log('Identify: ' + this.device.haId);
        for (let key of Object.keys(this.device.items).sort()) {
            this.log(this.device.describe(this.device.items[key]));
        }
    }

    // Query the appliance when connected and cache the result
    async getCached(key, operation) {
        // Use a cached result if possible
        let cache = this.accessory.context.cache;
        if (!cache) cache = this.accessory.context.cache = {};
        if (key in cache) return cache[key];

        // Perform the operation and cache the result
        cache[key] = await this.getUncached(operation);
        return cache[key];
    }

    // Query the appliance when connected
    async getUncached(operation) {
        // Wait until connected before attempting the operation
        await this.device.waitConnected(true);

        // Repeat the operation until it succeeds
        while (true) {

            // Attempt the query
            try {

                return await operation();

            } catch (err) {

                // Whitelist some errors returned by the server
                const whitelist = [
                    'BSH.Common.Error.InvalidUIDValue',
                    'SDK.Error.UnsupportedSetting',
                    'SDK.Simulator.InternalError'
                ];
                let key = ((((err.response || {}).body || {}).error) || {}).key;
                if (whitelist.includes(key)) {
                    this.warn('Ignoring ' + key + ' error');
                    return null;
                }

                // Otherwise ignore the error and try again
                this.warn('Will retry when next connected: ' + err.message);
            }

            // Wait for the device to reconnect before trying again
            await this.device.waitConnected(false);
        }
    }

    // Coalesce and serialise operations triggered by multiple characteristics
    serialise(operation, options) {
        // Find any existing operations for this function
        if (!this.serialiseOps) this.serialiseOps = [];
        let op = this.serialiseOps.find(op => op.operation === operation);
        if (!op) {
            op = { operation: operation };
            this.serialiseOps.push(op);
        }

        // Update or create a pending request
        if (op.pending) {
            this.debug('Coalescing serialised request ('
                       + (op.pending.resolve.length + 1) + ' pending)');
            Object.assign(op.pending.options, options);
        } else {
            this.debug('Creating new serialised request');
            op.pending = {
                operation:  operation,
                options:    options,
                resolve:    [],
                reject:     []
            };
        }
        this.debug(JSON.stringify(op.pending.options));

        // Schedule the operation
        let doOperation = async (op) => {
            try {
                // Make this operation active (so more can be queued)
                op.active = op.pending;
                delete op.pending;

                // Perform the operation
                this.debug('Performing serialised request');
                let result = await op.active.operation(op.active.options);

                // Resolve all queued promises
                this.debug('Serialised request successful');
                for (let resolve of op.active.resolve) resolve(result);
            } catch (err) {
                // Reject all queued promises
                this.debug('Serialised request failed: ' + err.message);
                for (let reject of op.active.reject) reject(err);
            } finally {
                // Trigger another operation if pending
                delete op.active;
                if (op.pending) {
                    this.debug('Scheduling overlapping serialised request');
                    op.pending.scheduled = setTimeout(() => doOperation(op));
                }
            }
        };
        if (!op.pending.scheduled && !op.active) {
            this.debug('Scheduling serialised request');
            op.pending.scheduled = setTimeout(() => doOperation(op));
        }

        // Create and return a promise for this request
        return new Promise((resolve, reject) => {
            op.pending.resolve.push(resolve);
            op.pending.reject.push(reject);
        });
    }

    // Convert an async function into one that takes a callback
    // (cannot use util.callbackify because homebridge adds exra parameters)
    callbackify(fn) {
        return async (value, callback) => {
            try {
                let data = await fn.bind(this)(value);
                callback(null, data);
            } catch (err) {
                this.error(err.message);
                callback(err);
            }
        };
    }

    // Import additional methods
    mixin(obj, ...args) {
        // Copy properties, excluding any "init" method
        for (let key of Object.keys(obj)) {
            if (key != 'init') {
                if (key in this) this.warn("Mixin overwriting '" + key + "'");
                this[key] = obj[key];
            }
        }

        // Call any initialisation function
        if (obj.init) obj.init.bind(this)(...args);
    }

    // Log information for an issue
    logIssue(issue, data) {
        const url = 'https://github.com/thoukydides/homebridge-homeconnect/issues/' + issue;
        this.warn('Please copy the following to ' + url + '\n'
                  + this.device.brand + ' ' + this.device.type
                  + ' (E-Nr: ' + this.device.enumber + ')\n'
                  + JSON.stringify(data, null, 4));
    }

    // Logging
    logPrefix() { return '[' + this.name + '] '; }
    error(msg)  { this.logRaw.error(this.logPrefix() + msg); }
    warn(msg)   { this.logRaw.warn (this.logPrefix() + msg); }
    log(msg)    { this.logRaw.info (this.logPrefix() + msg); }
    debug(msg)  { this.logRaw.debug(this.logPrefix() + msg); }
}
