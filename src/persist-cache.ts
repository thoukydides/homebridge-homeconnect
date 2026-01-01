// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2026 Alexander Thoukydides

import { Logger } from 'homebridge';

import { LocalStorage } from 'node-persist';
import { setImmediate as setImmediateP } from 'timers/promises';
import semver from 'semver';

import { MS, formatList, formatMilliseconds } from './utils.js';
import { logError } from './log-error.js';
import { PLUGIN_VERSION } from './settings.js';

// An individual cache entry
interface CacheItem {
    value:      unknown;
    preferred:  string;
    updated:    number;
    version?:   string;
}

// The representation of the cache in persistent storage
type PersistData =  Record<string, CacheItem>;

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
    private cache = new Map<string, CacheItem>();

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
        const item = this.cache.get(key);
        if (!item) return;
        return item.value as Type;
    }

    // Retrieve an item, if it exists checking that is has not expired
    async getWithExpiry<Type>(key: string): Promise<{ value: Type; valid: boolean } | undefined> {
        await this.initialised;
        const item = this.cache.get(key);
        let description = `"${key}"`;
        const expired: string[] = [];
        if (!item) {
            expired.push('does not exist in cache');
        } else {
            const age = Date.now() - item.updated;
            description += ` [${item.preferred}, v${item.version ?? '?'}, updated ${formatMilliseconds(age)} ago]`;
            if (!semver.satisfies(PLUGIN_VERSION, `^${item.version}`)) expired.push(`not written by v${PLUGIN_VERSION}`);
            if (item.preferred !== this.preferred) expired.push(`does not match preference ${this.preferred}`);
            if (this.ttl < age) expired.push('is too old');
        }
        this.log.debug(expired.length ? `Expired cache ${description} ${formatList(expired)}` : `Cache ${description}`);
        return item && { value: item.value as Type, valid: !expired.length };
    }

    // Write an item to the cache
    async set(key: string, value: unknown): Promise<void> {
        await this.initialised;
        this.cache.set(key, {
            value:      value,
            preferred:  this.preferred,
            updated:    Date.now(),
            version:    PLUGIN_VERSION
        });
        this.log.debug(`"${key}" written to cache`);
        await this.save();
    }

    // Load the cache
    async load(): Promise<void> {
        try {
            const cache: unknown = await this.persist.getItem(this.cacheName) as PersistData | undefined;
            if (cache) {
                this.cache = new Map<string, CacheItem>(Object.entries(cache));
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
            const doSave = async (): Promise<void> => {
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
            const cache: PersistData = Object.fromEntries(this.cache);
            await this.persist.setItem(this.cacheName, cache);
            const entries = Object.keys(this.cache).length;
            this.log.debug(`Cache saved (${entries} entries)`);
        } catch (err) {
            logError(this.log, 'Cache write', err);
        }
    }
}
