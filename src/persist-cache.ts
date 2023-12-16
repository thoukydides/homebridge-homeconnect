// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2023 Alexander Thoukydides

import { Logger } from 'homebridge';

import { LocalStorage } from 'node-persist';
import { setImmediate as setImmediateP } from 'timers/promises';

import { MS, formatMilliseconds, logError } from './utils';

// An individual cache entry
interface CacheItem {
    value:      unknown;
    preferred:  string;
    updated:    number;
}

// A simple persistent cache, with soft expiry
export class PersistCache {

    // Key used to store/retrieve the cache from persistent storage
    private readonly cacheName:     string;

    // Wait for cache to be read from persistent storage
    private readonly initialised:   Promise<void>;

    // Saving the cache to persistent storage
    private saving?:                Promise<void>;
    private pendingSave?:           Promise<void>;

    // Local copy of the cache
    private cache: Record<string, CacheItem> = {};

    // Length of time before values in the cache expire
    private readonly ttl = 24 * 60 * 60 * MS; // (24 hours in milliseconds)

    // Initialise a cache
    constructor(
        public readonly log:        Logger,
        public readonly persist:    LocalStorage,
        name:                       string,
        public readonly preferred:  string
    ) {
        this.cacheName = `${name} cache`;
        this.initialised = this.load();
    }

    // Retrieve an item from the cache
    async get<Type>(key: string): Promise<Type | undefined> {
        await this.initialised;
        const item = this.cache[key];
        if (!item) return;
        return item.value as Type;
    }

    // Retrieve an item, if it exists checking that is has not expired
    async getWithExpiry<Type>(key: string): Promise<{ value: Type; valid: boolean } | undefined> {
        await this.initialised;
        const item = this.cache[key];
        let description = `Cache "${key}"`;
        let expired: string | undefined;
        if (!item) {
            expired = ' does not exist in cache';
        } else {
            const age = Date.now() - item.updated;
            description += ` [${item.preferred}, updated ${formatMilliseconds(age)} ago]`;
            if (item.preferred !== this.preferred) {
                expired = ` does not match preference ${this.preferred}`;
            } else if (this.ttl < age) {
                expired = ' is too old';
            }
        }
        this.log.debug(description + (expired ?? ''));
        return item && { value: item.value as Type, valid: expired === undefined };
    }

    // Write an item to the cache
    async set(key: string, value: unknown): Promise<void> {
        await this.initialised;
        this.cache[key] = {
            value:      value,
            preferred:  this.preferred,
            updated:    Date.now()
        };
        this.log.debug(`"${key}" written to cache`);
        await this.save();
    }

    // Load the cache
    async load(): Promise<void> {
        try {
            const cache = await this.persist.getItem(this.cacheName);
            if (cache) {
                this.cache = cache;
                const entries = Object.keys(this.cache).length;
                this.log.debug(`Cache loaded (${entries} entries)`);
            } else {
                this.log.debug('No cache found');
            }
        } catch (err) {
            logError(this.log, 'Cache read', err);
        }
    }

    // Schedule saving the cache
    save(): Promise<void> {
        if (!this.pendingSave) {
            const doSave = async () => {
                if (this.saving) await this.saving;
                await setImmediateP();
                this.saving = this.pendingSave;
                this.pendingSave = undefined;
                await this.saveDeferred();
                this.saving = undefined;
            };
            this.pendingSave = doSave();
        }
        return this.pendingSave;
    }

    // Save the cache
    async saveDeferred(): Promise<void> {
        try {
            await this.initialised;
            await this.persist.setItem(this.cacheName, this.cache);
            const entries = Object.keys(this.cache).length;
            this.log.debug(`Cache saved (${entries} entries)`);
        } catch (err) {
            logError(this.log, 'Cache write', err);
        }
    }
}
