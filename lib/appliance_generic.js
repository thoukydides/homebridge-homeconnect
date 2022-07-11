// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2022 Alexander Thoukydides

'use strict';

const HasPower = require('./has_power.js');
const PersistCache = require('./persist_cache.js');

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

        // Initialise the cache for this appliance
        let lang = this.device.getLanguage();
        this.cache = new PersistCache(msg => this.debug(msg),
                                      persist, device.haId, lang);

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
            || this.accessory.addService(Service.Switch, 'Power', subtype);
        
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

        // Versions before 0.4.0 had a single Switch without subtype
        let switchService = this.accessory.getService(Service.Switch);
        if (switchService && !switchService.subtype) {
            this.warn('Replacing HomeKit Switch service');
            this.accessory.removeService(switchService);
        }

        // Extra characteristics have previously been on the 'power' Switch
        let powerService =
            this.accessory.getServiceByUUIDAndSubType(Service.Switch, 'power');
        if (powerService) {
            const obsoleteCharacteristics = [
                // Moved to the 'active' Switch in version 0.14.0
                Characteristic.Active,
                Characteristic.StatusActive,
                Characteristic.StatusFault,
                Characteristic.RemainingDuration,
                // Moved to a new Door service in version 0.25.0
                Characteristic.CurrentDoorState,
                Characteristic.LockCurrentState
            ];
            let removeCharacteristics = obsoleteCharacteristics
                .filter(c => powerService.testCharacteristic(c))
                .map(c => powerService.getCharacteristic(c));
            if (removeCharacteristics.length) {
                this.warn('Removing ' + removeCharacteristics.length
                          + ' characteristics from HomeKit Switch');
                for (let characteristic of removeCharacteristics)
                    powerService.removeCharacteristic(characteristic);
            }
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
        // Use cached result if possible
        let cacheKey = 'Appliance ' + key;
        if (!await this.cache.hasExpired(cacheKey)) {
            return await this.cache.get(cacheKey);
        }

        try {
            // Wait for the appliance to connect and then attempt the operation
            await this.device.waitConnected(true);
            let value = await operation();

            // Success, so cache and return the result
            await this.cache.set(cacheKey, value);
            return value;
        } catch (err) {
            let value = await this.cache.get(cacheKey);
            if (value !== undefined) {
                // Operation failed, so use the (expired) cache entry
                this.warn('Using expired cache result: ' + err.message);
                return value;
            } else {
                this.reportError(err, "Cached operation '" + key + "'");
                throw(err);
            }
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

        // Schedule the operation
        let doOperation = async (op) => {
            try {
                // Make this operation active (so more can be queued)
                op.active = op.pending;
                delete op.pending;

                // Perform the operation and resolve all queued promises
                this.debug('Performing serialised request');
                let result = await op.active.operation(op.active.options);
                for (let resolve of op.active.resolve) resolve(result);
            } catch (err) {
                // Reject all queued promises
                for (let reject of op.active.reject) reject(err);
            } finally {
                // Trigger another operation if pending
                delete op.active;
                if (op.pending) {
                    op.pending.scheduled = setTimeout(() => doOperation(op));
                }
            }
        };
        if (!op.pending.scheduled && !op.active) {
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

    // Format a duration
    prettySeconds(seconds) {
        // Split the time into components
        let minutes = Math.floor(seconds / 60);
        seconds -= minutes * 60;
        let hours = Math.floor(minutes / 60);
        minutes -= hours * 60;

        // Format the individual components
        let prettyHours   = hours   + (hours   == 1 ? ' hour'   : ' hours');
        let prettyMinutes = minutes + (minutes == 1 ? ' minute' : ' minutes');
        let prettySeconds = seconds + (seconds == 1 ? ' second' : ' seconds');

        // Combine the components appropriately
        if (hours) {
            return prettyHours   + (minutes ? ' ' + prettyMinutes : '');
        } else if (minutes) {
            return prettyMinutes + (seconds ? ' ' + prettySeconds : '');
        } else {
            return prettySeconds;
        }
    }

    // Import additional methods
    mixin(obj, ...args) {
        // Copy properties, excluding any "init" method or "name" string
        for (let key of Object.keys(obj)) {
            const excludeKeys = ['init', 'name'];
            if (!excludeKeys.includes(key)) {
                if (key in this) this.warn("Mixin overwriting '" + key + "'");
                this[key] = obj[key];
            }
        }

        // Call any initialisation function
        if (obj.init) {
            let doInit = async () => {
                try {
                    await obj.init.bind(this)(...args);
                } catch (err) {
                    let name = obj.name || 'anonymous';
                    this.reportError(err, "Initialising mixin '" + name + "'");
                }
            }
            doInit();
        }
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
            if (err.name == 'StatusCodeError')
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
