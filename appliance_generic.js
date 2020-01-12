// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2020 Alexander Thoukydides

'use strict';

const requestErrors = require('request-promise-native/errors');
const HasPower = require('./has_power.js');

let Service, Characteristic, UUID;

// Length of time to cache API responses
const CACHE_TTL = 24 * 60 * 60 * 1000; // (24 hours in milliseconds)

// A Homebridge accessory for a generic Home Connect home appliance
module.exports = class ApplianceGeneric {

    // Initialise an appliance
    constructor(log, homebridge, persist, schema, device, accessory, config) {
        this.logRaw       = log;
        this.homebridge   = homebridge;
        this.persist      = persist;
        this.schema       = schema;
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
        UUID = homebridge.hap.uuid;

        // Remove any services or characteristics that are no longer required
        this.cleanup();

        // Log errors from the Home Connect API as warnings
        device.on('error', (...args) => this.reportError(...args));

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

        // Add power Switch service to host the appliance's main characteristics
        let subtype = 'power';
        this.powerService =
            this.accessory.getServiceByUUIDAndSubType(Service.Switch, subtype)
            || this.accessory.addService(Service.Switch, this.name, subtype);
        
        // Update reachability when connection status changes
        device.on('connected', item => {
            this.log(item.value ? 'Connected' : 'Disconnected');
            this.accessory.updateReachability(item.value);
        });

        // All appliances have power state
        this.mixin(HasPower);
    }

    // Tidy-up after earlier versions of this plugin
    cleanup() {
        // Response cache has been moved from the accessory to node-persist
        delete this.accessory.context.cache;

        // The original implementation only had a single Switch without subtype
        let switchService = this.accessory.getService(Service.Switch);
        if (switchService && !switchService.subtype) {
            this.warn('Replacing HomeKit Switch service');
            this.accessory.removeService(switchService);
        }

        // A non-standard Home Appliance was used for extra characteristics;
        // these are now added to the power Switch service instead
        class HomeAppliance {};
        HomeAppliance.UUID =
            UUID.generate('homebridge-homeconnect:Service:HomeAppliance');
        let homeApplianceService = this.accessory.getService(HomeAppliance);
        if (homeApplianceService) {
            this.warn('Removing HomeKit Home Appliance service');
            this.accessory.removeService(homeApplianceService);
        }
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
        let persistKey = this.device.haId + ' cache ' + key
        let value = await this.persist.getItem(persistKey);
        if (value !== undefined) return value;

        // Perform the operation and cache the result
        value = await this.getUncached(operation);
        await this.persist.setItem(persistKey, value, { ttl: CACHE_TTL });
        return value;
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
                this.reportError(err);
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

    // Report an error
    reportError(err, op) {
        // Suppress duplicate reports
        if (this.lastError !== err) {
            this.lastError = err;

            // Log this error with some context
            this.error(err.message);
            if (op) this.error(op);
            if (err instanceof requestErrors.StatusCodeError)
                this.error(err.options.method + ' ' + err.options.url);

            // Log any stack backtrace at lower priority
            if (err.stack) this.debug(err.stack);
        }
        return err;
    }

    // Logging
    logPrefix() { return '[' + this.name + '] '; }
    error(msg)  { this.logRaw.error(this.logPrefix() + msg); }
    warn(msg)   { this.logRaw.warn (this.logPrefix() + msg); }
    log(msg)    { this.logRaw.info (this.logPrefix() + msg); }
    debug(msg)  { this.logRaw.debug(this.logPrefix() + msg); }
}
