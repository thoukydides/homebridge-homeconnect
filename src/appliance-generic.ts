// Homebridge plugin for Home Connect home appliances
// Copyright © 2023 Alexander Thoukydides

import { CharacteristicSetHandler, CharacteristicValue, HAPStatus,
         Logger, Perms, PlatformAccessory, Service } from 'homebridge';

import { setImmediate as setImmediateP } from 'timers/promises';

import { HasPower } from './has-power';
import { PersistCache } from './persist-cache';
import { MS, assertIsBoolean, assertIsDefined, assertIsNumber, columns,
         formatMilliseconds, logError } from './utils';
import { ApplianceConfig } from './config-types';
import { HomeConnectDevice } from './homeconnect-device';
import { Serialised, SerialisedOperation, SerialisedOptions, SerialisedValue } from './serialised';
import { HomeConnectPlatform } from './platform';
import { ConfigSchema, SchemaOptionalFeature, SchemaOptionalFeatures } from './config-schema';

// A HAP Service constructor
type ServiceConstructor = typeof Service & {
    new (displayName?: string, subtype?: string): Service;
    UUID: string;
};

// A typed accessory onSet() handler
export type OnSetHandler<Type> = (value: Type) => Promise<unknown> | unknown;

// An optional feature

// Initialisation timeout
const INITIALISATION_WARN_INTERVAL = 10 * MS;

// A Homebridge accessory for a generic Home Connect home appliance
export class ApplianceBase {

    // Shortcuts to Homebridge API
    readonly Service;
    readonly Characteristic;

    // Appliance name
    readonly name: string;

    // Configuration for this appliance
    readonly config: ApplianceConfig;
    readonly schema: ConfigSchema;
    readonly optionalFeatures: SchemaOptionalFeatures = [];

    // Persistent cache
    readonly cache: PersistCache;

    // Asynchronous initialisation tasks
    readonly asyncInitTasks: { name: string; promise: Promise<void> }[] = [];

    // Accessory services
    readonly accessoryInformationService: Service;
    readonly obsoleteServices; // (removed after async initialisation)

    // Initialise an appliance
    constructor(
        readonly log:           Logger,
        readonly platform:      HomeConnectPlatform,
        readonly device:        HomeConnectDevice,
        readonly accessory:     PlatformAccessory) {
        this.name           = accessory.displayName;
        this.Service        = platform.hb.hap.Service;
        this.Characteristic = platform.hb.hap.Characteristic;

        // Log some basic information about this appliance
        this.log.info(`${device.ha.brand} ${device.ha.type} (E-Nr: ${device.ha.enumber})`);

        // Configuration for this appliance
        assertIsDefined(this.platform.schema);
        this.schema = this.platform.schema;
        this.config = platform.configAppliances[device.ha.haId] || {};

        // Initialise the cache for this appliance
        assertIsDefined(platform.persist);
        this.cache = new PersistCache(log, platform.persist, device.ha.haId, platform.configPlugin.language.api);

        // Remove anything created by old plugin versions that is no longer required
        this.cleanupOldVersions();

        // List of restored services to remove if not explicitly added
        this.obsoleteServices = [...accessory.services];

        // Handle the identify request
        accessory.on('identify', () => this.trap('Identify', this.identify()));

        // Set the Accessory Information service characteristics
        this.accessoryInformationService = this.makeService(this.Service.AccessoryInformation);
        this.accessoryInformationService
            .setCharacteristic(this.Characteristic.Manufacturer,     device.ha.brand)
            .setCharacteristic(this.Characteristic.Model,            device.ha.enumber)
            .setCharacteristic(this.Characteristic.SerialNumber,     device.ha.haId)
            .setCharacteristic(this.Characteristic.FirmwareRevision, '0');

        // Log connection status changes
        device.on('connected', connected => {
            this.log.info(connected ? 'Connected' : 'Disconnected');
        });

        // Wait for asynchronous initialisation to complete
        this.waitAsyncInitialisation();
    }

    // Add an asynchronous initialisation task
    asyncInitialise(name: string, promise: Promise<void>): void {
        this.asyncInitTasks.push({ name, promise });
    }

    // Wait for asynchronous initialisation to complete
    async waitAsyncInitialisation(): Promise<void> {
        // Wait for synchronous initialisation (subclass constructors) to finish
        await setImmediateP();

        // Summarise the initialisation tasks
        const startTime = Date.now();
        let pendingTasks = this.asyncInitTasks.length;
        this.log.debug(`Initialising ${pendingTasks} features: `
                       + this.asyncInitTasks.map(task => task.name).join(', '));

        // Log any initialisation errors as they occur
        const failedNames: string[] = [];
        const promises = this.asyncInitTasks.map(async task => {
            try {
                await task.promise;
                --pendingTasks;
                this.log.debug(`${task.name} ready +${Date.now() - startTime}ms`);
            } catch (err) {
                logError(this.log, `Initialising feature ${task.name}`, err);
                failedNames.push(task.name);
            }
        });

        // Wait for asynchronous initialisation to complete
        const scheduled = setInterval(() => {
            this.log.warn(`Waiting for ${pendingTasks} feature${pendingTasks === 1 ? '' : 's'} to finish initialising...`);
        }, INITIALISATION_WARN_INTERVAL);
        await Promise.allSettled(promises);
        clearInterval(scheduled);

        // Summarise the initialisation result
        const initDuration = formatMilliseconds(Date.now() - startTime);
        if (failedNames.length) {
            this.log.error(`Initialisation failed for ${failedNames.length}`
                         + ` of ${this.asyncInitTasks.length} features (${initDuration}): `
                         + failedNames.join(', '));
        } else {
            this.log.info(`All features successfully initialised in ${initDuration}`);
        }

        // Delete any obsolete services
        this.cleanupServices();

        // Update the configuration schema with any optional features
        this.setOptionalFeatures();
    }

    // Get or add a service
    makeService(serviceConstructor: ServiceConstructor, displayName = '', subtype?: string): Service {
        // Check whether the service already exists
        let service = subtype
                      ? this.accessory.getServiceById(serviceConstructor, subtype)
                      : this.accessory.getService(serviceConstructor);
        if (service) {
            // Remove from the list of obsolete services
            const serviceIndex = this.obsoleteServices.indexOf(service);
            if (serviceIndex !== -1) this.obsoleteServices.splice(serviceIndex, 1);
        } else {
            // Create a new service
            this.log.debug(`Adding new service "${displayName}"`);
            service = this.accessory.addService(serviceConstructor, displayName, subtype);
        }

        // Add a Configured Name characteristic if a custom name was supplied
        if (displayName.length) this.addServiceName(service, displayName);

        // Return the service
        return service;
    }

    // Add a read-only Configured Name characteristic
    addServiceName(service: Service, displayName: string): void {
        if (!service.testCharacteristic(this.Characteristic.ConfiguredName)) {
            service.addOptionalCharacteristic(this.Characteristic.ConfiguredName);
        }
        service.getCharacteristic(this.Characteristic.ConfiguredName)
            .updateValue(displayName)
            .setProps({ perms: [Perms.NOTIFY, Perms.PAIRED_READ] });
    }

    // Check and tidy services after the accessory has been configured
    cleanupServices(): void {
        // Remove any services that were restored from cache but no longer required
        for (const service of this.obsoleteServices) {
            this.log.info(`Removing obsolete service "${service.displayName}"`);
            this.accessory.removeService(service);
        }
    }

    // Tidy-up after earlier versions of this plugin
    cleanupOldVersions(): void {
        // Response cache has been moved from the accessory to node-persist
        delete this.accessory.context.cache;

        // Extra characteristics have previously been on the 'power' Switch
        const powerService =
            this.accessory.getServiceById(this.Service.Switch, 'power');
        if (powerService) {
            const obsoleteCharacteristics = [
                // Moved to the 'active' Switch in version 0.14.0
                this.Characteristic.Active,
                this.Characteristic.StatusActive,
                this.Characteristic.StatusFault,
                this.Characteristic.RemainingDuration,
                // Moved to a new Door service in version 0.25.0
                this.Characteristic.CurrentDoorState,
                this.Characteristic.LockCurrentState
            ];
            const removeCharacteristics = obsoleteCharacteristics
                .filter(c => powerService.testCharacteristic(c))
                .map(c => powerService.getCharacteristic(c));
            if (removeCharacteristics.length) {
                this.log.warn(`Removing ${removeCharacteristics.length} characteristics from HomeKit Switch`);
                for (const characteristic of removeCharacteristics)
                    powerService.removeCharacteristic(characteristic);
            }
        }
    }

    // The appliance no longer exists so stop updating it
    unregister(): void {
        this.device.stop();
        this.device.removeAllListeners();
    }

    // Identify this appliance
    async identify(): Promise<void> {
        // Log the current status of this appliance
        this.log.info('Identify: ' + this.device.ha.haId);
        const itemDesceiptions = Object.values(this.device.items).map(item => this.device.describe(item));
        for (const item of itemDesceiptions.sort()) this.log.info(item);
    }

    // Check whether an optional feature should be enabled
    hasOptionalFeature(service: string, name: string, group: string = '', enableByDefault: boolean = true): boolean {
        // Add to the list of optional features
        this.optionalFeatures.push({ service, name, group, enableByDefault });

        // Return whether the feature should be enabled
        const enableByConfig = this.config.features?.[name];
        const enabled = enableByConfig ?? enableByDefault;
        this.log.info(`Optional ${group ? `${group} ` : ''}(${service} service) feature "${name}"`
                      + ` ${enabled ? 'enabled' : 'disabled'} by ${enableByConfig === undefined ? 'default' : 'configuration'}`);
        return enabled;
    }

    // Update the configuration schema with any optional features
    setOptionalFeatures(): void {
        // Log a summary of optional features
        const list = (description: string, predicate: (feature: SchemaOptionalFeature) => boolean): void => {
            const matched = this.optionalFeatures.filter(predicate);
            if (matched.length) {
                this.log.info(`${matched.length} optional feature${matched.length === 1 ? '' : 's'} ${description}:`);
                const sortBy = (feature: SchemaOptionalFeature) => `${feature.group} - ${feature.name}`;
                const fields = matched.sort((a, b) => sortBy(a).localeCompare(sortBy(b)))
                    .map(feature => [feature.name, feature.group, `(${feature.service} service)`]);
                for (const line of columns(fields)) this.log.info(`    ${line}`);
            }
        };
        const configured = (feature: SchemaOptionalFeature): boolean | undefined => this.config.features?.[feature.name];
        list('disabled by configuration',          feature => configured(feature) === false);
        list('enabled by configuration',           feature => configured(feature) === true);
        list('disabled by default (unconfigured)', feature => configured(feature) === undefined && !feature.enableByDefault);
        list('enabled by default (unconfigured)',  feature => configured(feature) === undefined &&  feature.enableByDefault);

        // Update the configuration schema
        this.schema.setOptionalFeatures(this.device.ha.haId, this.optionalFeatures);
    }

    // Query the appliance when connected and cache the result
    async getCached<Type>(key: string, operation: () => Promise<Type>): Promise<Type> {
        // Use cached result if possible
        const cacheKey = `Appliance ${key}`;
        const cacheItem = await this.cache.getWithExpiry<Type>(cacheKey);
        if (cacheItem?.valid) return cacheItem.value;

        try {
            // Wait for the appliance to connect and then attempt the operation
            await this.device.waitConnected(true);
            const value = await operation();

            // Success, so cache and return the result
            await this.cache.set(cacheKey, value);
            return value;
        } catch (err) {
            if (cacheItem) {
                // Operation failed, so use the (expired) cache entry
                this.log.warn(`Using expired cache result: ${err}`);
                return cacheItem.value;
            } else {
                logError(this.log, `Cached operation '${key}'`, err);
                throw(err);
            }
        }
    }

    // Coalesce and serialise operations triggered by multiple characteristics
    makeSerialised<Value extends SerialisedValue, Returns = void>
    (operation: SerialisedOperation<Value, Returns>, defaultValue: Value = undefined as Value):
    (value?: Value) => Promise<Returns> {
        const serialised = new Serialised<Value, Returns>(this.log, operation, defaultValue);
        return (value?: Value) => serialised.trigger(value);
    }

    makeSerialisedObject<Value extends object, Returns = void>
    (operation: SerialisedOperation<Value, Returns>):
    (value?: Value) => Promise<Returns> {
        const options: SerialisedOptions = { reset: true };
        const serialised = new Serialised<Value, Returns>(this.log, operation, {} as Value, options);
        return (value?: Value) => serialised.trigger(value);
    }

    // Wrap a Homebridge Characteristic.onSet handler
    onSet<Type>(handler: OnSetHandler<Type>, assertIsType: (value: unknown) => asserts value is Type): CharacteristicSetHandler {
        return async (value: CharacteristicValue) => {
            try {
                assertIsType(value);
                await handler(value);
            } catch (err) {
                logError(this.log, `onSet(${value})`, err);
                throw new this.platform.hb.hap.HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE);
            }
        };
    }

    onSetBoolean(handler: OnSetHandler<boolean>): CharacteristicSetHandler { return this.onSet(handler, assertIsBoolean); }
    onSetNumber (handler: OnSetHandler<number>):  CharacteristicSetHandler { return this.onSet(handler, assertIsNumber); }

    // Wrap an operation with an error trap
    async trap<Type>(when: string, promise: Promise<Type> | Type, canThrow?: boolean): Promise<Type | undefined> {
        try {
            return await promise;
        } catch (err) {
            logError(this.log, when, err);
            if (canThrow) throw err;
        }
    }
}

// All Homebridge applianceshave power state
export const ApplianceGeneric = HasPower(ApplianceBase);
