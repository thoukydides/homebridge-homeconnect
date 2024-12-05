// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2023 Alexander Thoukydides

import { API, DynamicPlatformPlugin, Logger, LogLevel, PlatformAccessory,
         PlatformConfig } from 'homebridge';

import NodePersist from 'node-persist';
import { join } from 'path';
import { setTimeout as setTimeoutP } from 'timers/promises';
import { IErrorDetail } from 'ts-interface-checker';

import { CloudAPI, HomeConnectAPI } from './api.js';
import { HomeConnectDevice } from './homeconnect-device.js';
import { ApplianceBase } from './appliance-generic.js';
import { ApplianceCleaningRobot, ApplianceDishwasher, ApplianceDryer,
         ApplianceWasher, ApplianceWasherDryer } from './appliance-cleaning.js';
import { ApplianceCoffeeMaker, ApplianceCookProcessor, ApplianceHob,
         ApplianceHood, ApplianceOven, ApplianceWarmingDrawer } from './appliance-cooking.js';
import { ApplianceFreezer, ApplianceFridgeFreezer, ApplianceRefrigerator,
         ApplianceWineCooler } from './appliance-cooling.js';
import { ConfigSchemaData } from './homebridge-ui/schema-data.js';
import { PLUGIN_NAME, PLATFORM_NAME, DEFAULT_CONFIG, DEFAULT_CLIENTID } from './settings.js';
import { PrefixLogger } from './logger.js';
import { assertIsDefined, deepMerge, formatList, getValidationTree,
         keyofChecker, MS, plural } from './utils.js';
import { logError } from './log-error.js';
import { ConfigAppliances, ConfigPlugin } from './config-types.js';
import { checkDependencyVersions } from './check-versions.js';
import { HOMEBRIDGE_LANGUAGES } from './api-languages.js';
import { HomeAppliance } from './api-types.js';
import { MockAPI } from './mock/index.js';
import { typeSuite, checkers } from './ti/config-types.js';

// Interval between updating the list of appliances
// (only 1000 API calls allowed per day, so only check once an hour)
const UPDATE_APPLIANCES_DELAY = 60 * 60 * MS;

// Accessory information
interface AccessoryLinkage {
    accessory:          PlatformAccessory;
    implementation?:    ApplianceBase;
}

// A Homebridge HomeConnect platform
export class HomeConnectPlatform implements DynamicPlatformPlugin {
    readonly makeUUID: (data: string) => string;

    // Custom logger
    readonly log: PrefixLogger;

    // Plugin configuration with defaults applied
    configPlugin!:    ConfigPlugin;
    configAppliances: ConfigAppliances = {};

    // Mapping from UUID to accessories and their implementations
    readonly accessories = new Map<string, AccessoryLinkage>();

    // Persistent storage in the Homebridge storage directory
    persist?: NodePersist.LocalStorage;

    // Data required to generate the configuration schema
    schema?: ConfigSchemaData;

    // Home Connect API
    homeconnect?: HomeConnectAPI;

    // Create a new HomeConnect platform object
    constructor(
        log:                        Logger,
        readonly platformConfig:    PlatformConfig,
        readonly hb:                API
    ) {
        this.makeUUID = hb.hap.uuid.generate;

        // Use a custom logger to filter-out sensitive information
        this.log = new PrefixLogger(log);

        // Wait for Homebridge to restore cached accessories
        this.hb.on('didFinishLaunching', () => this.finishedLaunching());
    }

    // Restore a cached accessory
    configureAccessory(accessory: PlatformAccessory): void {
        this.accessories.set(accessory.UUID, { accessory });
    }

    // Update list of Home Connect appliances after cache has been restored
    async finishedLaunching(): Promise<void> {
        try {
            const restored = this.accessories.size;
            if (restored) this.log.info(`Restored ${restored} cached accessories`);

            // Check that the dependencies and configuration
            checkDependencyVersions(this.log, this.hb);
            [this.configPlugin, this.configAppliances] = this.checkConfig();

            // Prepare other resources required by this plugin
            this.persist = await this.preparePersistentStorage();
            this.schema = new ConfigSchemaData(this.log, this.persist);
            this.schema.setConfig(this.platformConfig);

            // Connect to the Home Connect cloud
            const api = this.configPlugin.debug?.includes('Mock Appliances') ? MockAPI : CloudAPI;
            this.homeconnect = new api(this.log, this.configPlugin, this.persist);

            // Start polling the list of Home Connect appliances
            this.updateAppliances();
        } catch (err) {
            logError(this.log, 'Plugin initialisation', err);
        }
    }

    // Check the user's configuration
    checkConfig(): [ConfigPlugin, ConfigAppliances] {
        // Split the configuration into plugin and appliance properties
        const keyofConfigPlugin = keyofChecker(typeSuite, typeSuite.ConfigPlugin);
        const select = (predicate: ([key, value]: [string, unknown]) => boolean): Record<string, unknown> =>
            Object.fromEntries(Object.entries(this.platformConfig).filter(predicate));
        const configPluginPre  = select(([key]) =>  keyofConfigPlugin.includes(key));
        const configAppliances = select(([key]) => !keyofConfigPlugin.includes(key));

        // Apply default values
        const configPlugin = deepMerge(DEFAULT_CONFIG, configPluginPre);
        const defaultClientid = DEFAULT_CLIENTID(configPlugin.simulator);
        if (!configPlugin.clientid && defaultClientid) configPlugin.clientid = defaultClientid;
        if (!configPlugin.clientid && configPlugin.debug?.includes('Mock Appliances')) configPlugin.clientid = '';

        // Ensure that all required fields are provided and are of suitable types
        checkers.ConfigPlugin.setReportedPath('<PLATFORM_CONFIG>');
        checkers.ConfigAppliances.setReportedPath('<PLATFORM_CONFIG>');
        const strictValidation = [...checkers.ConfigPlugin.strictValidate(configPlugin) ?? [],
                                  ...checkers.ConfigAppliances.strictValidate(configAppliances) ?? []];
        if (!checkers.ConfigPlugin.test(configPlugin)
            || !checkers.ConfigAppliances.test(configAppliances)) {
            this.log.error('Plugin unable to start due to configuration errors:');
            this.logCheckerValidation(LogLevel.ERROR, strictValidation);
            throw new Error('Invalid plugin configuration');
        }

        // Warn of extraneous fields in the configuration
        if (strictValidation.length) {
            this.log.warn('Unsupported fields in plugin configuration will be ignored:');
            this.logCheckerValidation(LogLevel.WARN, strictValidation);
        }

        // Check that the configured language is supported by the Home Connect API
        const languageTags = Object.values(HOMEBRIDGE_LANGUAGES).flatMap(country => Object.values(country));
        if (!languageTags.includes(configPlugin.language.api)) {
            this.log.error('Plugin configuration specifies an unsupported API language');
            this.log.info(`Supported language tags are: ${formatList(languageTags)}`);
            this.logCheckerValidation(LogLevel.ERROR);
            throw new Error('Invalid plugin configuration');
        }

        // Use the validated configuration
        if (configPlugin.debug?.includes('Log Debug as Info')) this.log.logDebugAsInfo();
        PrefixLogger.logApplianceIds = configPlugin.debug?.includes('Log Appliance IDs') ?? false;
        return [configPlugin, configAppliances];
    }

    // Log configuration checker validation errors
    logCheckerValidation(level: LogLevel, errors?: IErrorDetail[] | null): void {
        const errorLines = errors ? getValidationTree(errors) : [];
        for (const line of errorLines) this.log.log(level, line);
        this.log.info(`${this.hb.user.configPath()}:`);
        const configLines = JSON.stringify(this.platformConfig, null, 4).split('\n');
        for (const line of configLines) this.log.info(`    ${line}`);
    }

    // Prepare the persistent storage
    async preparePersistentStorage(): Promise<NodePersist.LocalStorage> {
        const persistDir = join(this.hb.user.storagePath(), PLUGIN_NAME, 'persist');
        const persist = NodePersist.create({ dir: persistDir });
        await persist.init();
        return persist;
    }

    // Periodically update a list of Home Connect home appliances
    async updateAppliances(): Promise<never> {
        for (;;) {
            try {
                assertIsDefined(this.homeconnect);
                const appliances = await this.homeconnect.getAppliances();
                await this.addRemoveAccessories(appliances);
            } catch (err) {
                logError(this.log, 'Reading list of home appliances', err);
            }
            await setTimeoutP(UPDATE_APPLIANCES_DELAY);
        }
    }

    // Add or remove accessories to match the available appliances
    async addRemoveAccessories(appliances: HomeAppliance[]): Promise<void> {
        // Update the configuration schema (if initialised)
        await this.schema?.setAppliances(appliances);

        // Remove any appliances that have been disabled in the configuration
        const enabledAppliances = appliances.filter(ha => this.configAppliances[ha.haId]?.enabled ?? true);

        // Map the appliance haId identifiers to accessory UUIDs
        const uuidMap = new Map(enabledAppliances.map(ha => [this.makeUUID(ha.haId), ha]));

        // Add a Homebridge accessory for each new appliance
        const newAccessories: PlatformAccessory[] = [];
        uuidMap.forEach((ha, uuid) => {
            // Select a constructor for this appliance
            const applianceConstructor = {
                // Cooking appliances
                CoffeeMaker:    ApplianceCoffeeMaker,
                CookProcessor:  ApplianceCookProcessor,
                Hob:            ApplianceHob,
                Hood:           ApplianceHood,
                Oven:           ApplianceOven,
                WarmingDrawer:  ApplianceWarmingDrawer,
                // Cleaning appliances
                CleaningRobot:  ApplianceCleaningRobot,
                Dishwasher:     ApplianceDishwasher,
                Dryer:          ApplianceDryer,
                Washer:         ApplianceWasher,
                WasherDryer:    ApplianceWasherDryer,
                // Cooling appliances
                Freezer:        ApplianceFreezer,
                FridgeFreezer:  ApplianceFridgeFreezer,
                Refrigerator:   ApplianceRefrigerator,
                WineCooler:     ApplianceWineCooler
            }[ha.type];
            if (!applianceConstructor) {
                this.log.warn(`Appliance type '${ha.type}' not currently supported`);
                return;
            }

            // Convert the Home Connect haId into a Homebridge UUID
            let linkage = this.accessories.get(uuid);
            if (linkage) {
                // A HomeKit accessory already exists for this appliance
                if (linkage.implementation) return;
                this.log.debug(`Connecting accessory '${ha.name}'`);
            } else {
                // New appliance, so create a matching HomeKit accessory
                this.log.info(`Adding new accessory '${ha.name}'`);
                const accessory = new this.hb.platformAccessory(ha.name, uuid);
                linkage = { accessory };
                this.accessories.set(uuid, linkage);
                newAccessories.push(accessory);
            }

            // Construct an instance of the appliance
            assertIsDefined(this.homeconnect);
            const deviceLog = new PrefixLogger(this.log, ha.name);
            const device = new HomeConnectDevice(deviceLog, this.homeconnect, ha);
            try {
                linkage.implementation = new applianceConstructor(deviceLog, this, device, linkage.accessory);
            } catch (err) {
                logError(this.log, 'initialising accessory', err);
            }
        });
        this.hb.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, newAccessories);

        // Delete accessories for which there is no matching appliance
        const oldAccessories: PlatformAccessory[] = [];
        this.accessories.forEach(({ accessory, implementation }, uuid) => {
            if (!uuidMap.has(uuid)) {
                this.log.info(`Removing accessory '${accessory.displayName}'`);
                implementation?.unregister();
                oldAccessories.push(accessory);
                this.accessories.delete(uuid);
            }
        });
        this.hb.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, oldAccessories);

        // Log a summary
        this.log.info(`Found ${plural(appliances.length, 'appliance')}`
                    + ` (${newAccessories.length} added, ${oldAccessories.length} removed)`);
    }
}
