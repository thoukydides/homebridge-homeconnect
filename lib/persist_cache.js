// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2020 Alexander Thoukydides

'use strict';

// Length of time before values in the cache expire
const CACHE_TTL = 24 * 60 * 60 * 1000; // (24 hours in milliseconds)

// A simple persistent cache, with soft expiry
module.exports = class PeristCache {

    // Initialise a cache
    constructor(log, persist, name, preferred) {
        this.log = log;
        this.persist = persist;
        this.name = name;
        this.preferred = preferred;
    }

    // Retrieve an item from the cache
    async get(key) {
        await this.init();
        let item = this.cache[key];
        if (!item) return;
        return item.value;
    }

    // Check whether an item in the cache has expired (or is missing)
    async hasExpired(key) {
        await this.init();
        let item = this.cache[key];
        let expired;
        if (!item) {
            expired = 'does not exist in cache';
        } else if (item.preferred != this.preferred) {
            expired = "is cached for '" + item.preferred
                      + "' (prefer '" + this.preferred + "')";
        } else if (item.updated + CACHE_TTL < Date.now()) {
            expired = 'has expired in cache';
        }
        this.log("'" + key + "' " + (expired || 'found in cache'));
        return !!expired;
    }

    // Write an item to the cache
    async set(key, value) {
        await this.init();
        this.cache[key] = {
            value:      value,
            preferred:  this.preferred,
            updated:    Date.now()
        }
        this.log("'" + key + "' written to cache");
        await this.save();
    }

    // Initialise the cache on first use
    init() {
        if (!this.ready) this.ready = this.load();
        return this.ready;
    }

    // Load the cache
    async load() {
        this.cache = await this.persist.getItem(this.name + ' cache');
        if (this.cache) {
            let entries = Object.keys(this.cache).length;
            this.log('Cache loaded (' + entries + ' entries)');
        } else {
            this.log('No cache found');
            this.cache = {};
        }
    }

    // Schedule saving the cache
    save() {
        // Perform the save
        let doSave = async () => {
            let promises = this.savePending;
            delete this.savePending;

            // Save the cache and resolve all pending promises
            await this.saveDeferred();
            for (let promise of promises) promise.resolve();

            // Schedule another save if required
            if (this.savePending) this.saveScheduled = setTimeout(doSave);
            else delete this.saveScheduled;
        }
        if (!this.savePending) {
            this.savePending = [];
            if (!this.saveScheduled) this.saveScheduled = setTimeout(doSave);
        }

        // Create and return a promise for this request
        return new Promise((resolve, reject) => {
            this.savePending.push({resolve: resolve, reject: reject});
        });
    }

    // Save the cache
    async saveDeferred() {
        await this.init();
        await this.persist.setItem(this.name + ' cache', this.cache);
        let entries = Object.keys(this.cache).length;
        this.log('Cache saved (' + entries + ' entries)');
    }
}
