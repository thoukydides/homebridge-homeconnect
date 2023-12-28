// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2023 Alexander Thoukydides

import { API, DynamicPlatformPlugin, Logger, LogLevel, PlatformAccessory,
         PlatformConfig } from 'homebridge';

import NodePersist from 'node-persist';
import { join } from 'path';
import { setTimeout as setTimeoutP } from 'timers/promises';
import { CheckerT, createCheckers, IErrorDetail } from 'ts-interface-checker';

import { CloudAPI, HomeConnectAPI } from './api';
import { HomeConnectDevice } from './homeconnect-device';
import { ApplianceBase } from './appliance-generic';
import { ApplianceCleaningRobot, ApplianceDishwasher, ApplianceDryer,
         ApplianceWasher, ApplianceWasherDryer } from './appliance-cleaning';
import { ApplianceCoffeeMaker, ApplianceCookProcessor, ApplianceHob,
         ApplianceHood, ApplianceOven, ApplianceWarmingDrawer } from './appliance-cooking';
import { ApplianceFreezer, ApplianceFridgeFreezer, ApplianceRefrigerator,
         ApplianceWineCooler } from './appliance-cooling';
import { ConfigSchemaData } from './homebridge-ui/schema-data';
import { PLUGIN_NAME, PLATFORM_NAME, DEFAULT_CONFIG, DEFAULT_CLIENTID } from './settings';
import { PrefixLogger } from './logger';
import { assertIsDefined, deepMerge, getValidationTree, keyofChecker, MS } from './utils';
import { logError } from './log-error';
import { ConfigAppliances, ConfigPlugin } from './config-types';
import { checkDependencyVersions } from './check-versions';
import { HOMEBRIDGE_LANGUAGES } from './api-languages';
import { HomeAppliance } from './api-types';
import { MockAPI } from './mock-api';
import configTI from './ti/config-types-ti';

// Checkers for config.json configuration
const checkers = createCheckers(configTI) as {
    ConfigPlugin:       CheckerT<ConfigPlugin>;
    ConfigAppliances:   CheckerT<ConfigAppliances>;
};

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
    readonly makeUUID;

    // Custom logger
    readonly log: PrefixLogger;

    // Plugin configuration with defaults applied
    configPlugin!:    ConfigPlugin;
    configAppliances: ConfigAppliances = {};

    // Mapping from UUID to accessories and their implementations
    readonly accessories: Record<string, AccessoryLinkage> = {};

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
        this.accessories[accessory.UUID] = { accessory };
    }

    // Update list of Home Connect appliances after cache has been restored
    async finishedLaunching(): Promise<void> {
        try {
            const restored = Object.keys(this.accessories).length;
            if (restored) this.log.info(`Restored ${restored} cached accessories`);

            // Only initialise the plugin if it has been configured
            if (this.platformConfig) {
                // Check that the dependencies and configuration
                checkDependencyVersions(this.log, this.hb);
                [this.configPlugin, this.configAppliances] = this.checkConfig();

                // Prepare other resources required by this plugin
                this.persist = await this.preparePersistentStorage();
                this.schema = new ConfigSchemaData(this.log, this.persist);
                this.schema.setConfig(this.platformConfig);

                // Connect to the Home Connect cloud
                const api = this.configPlugin.debug.includes('Mock Appliances') ? MockAPI : CloudAPI;
                this.homeconnect = new api(this.log, this.configPlugin, this.persist);

                // Start polling the list of Home Connect appliances
                this.updateAppliances();
            } else {
                if (restored) this.log.info('Plugin configuration missing; removing all cached accessories');
                await this.addRemoveAccessories([]);
            }
        } catch (err) {
            logError(this.log, 'Plugin initialisation', err);
        }
    }

    // Check the user's configuration
    checkConfig(): [ConfigPlugin, ConfigAppliances] {
        // Split the configuration into plugin and appliance properties
        const keyofConfigPlugin = keyofChecker(configTI, configTI.ConfigPlugin);
        const select = (predicate: ([key, value]: [string, unknown]) => boolean) =>
            Object.fromEntries(Object.entries(this.platformConfig).filter(predicate));
        const configPluginPre  = select(([key]) =>  keyofConfigPlugin.includes(key));
        const configAppliances = select(([key]) => !keyofConfigPlugin.includes(key));

        // Apply default values
        const configPlugin = deepMerge(DEFAULT_CONFIG, configPluginPre) as PlatformConfig;
        const defaultClientid = DEFAULT_CLIENTID(configPlugin['simulator']);
        if (!configPlugin['clientid'] && defaultClientid) configPlugin['clientid'] = defaultClientid;
        if (!configPlugin['clientid'] && configPlugin.debug.includes('Mock Appliances')) configPlugin['clientid'] = '';

        // Ensure that all required fields are provided and are of suitable types
        checkers.ConfigPlugin.setReportedPath('<PLATFORM_CONFIG>');
        checkers.ConfigAppliances.setReportedPath('<PLATFORM_CONFIG>');
        const strictValidation = [...checkers.ConfigPlugin.strictValidate(configPlugin) || [],
                                  ...checkers.ConfigAppliances.strictValidate(configAppliances) || []];
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
            this.log.info(`Supported language tags are: ${languageTags.join(', ')}`);
            this.logCheckerValidation(LogLevel.ERROR);
            throw new Error('Invalid plugin configuration');
        }

        // Use the validated configuration
        if (configPlugin.debug.includes('Log Debug as Info')) this.log.logDebugAsInfo();
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
        const uuidMap = Object.fromEntries(enabledAppliances.map(ha => [this.makeUUID(ha.haId), ha]));

        // Add a Homebridge accessory for each new appliance
        const newAccessories: PlatformAccessory[] = [];
        for (const [uuid, ha] of Object.entries(uuidMap)) {
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
                continue;
            }

            // Convert the Home Connect haId into a Homebridge UUID
            let linkage = this.accessories[uuid];
            if (linkage) {
                // A HomeKit accessory already exists for this appliance
                if (linkage.implementation) continue;
                this.log.debug(`Connecting accessory '${ha.name}'`);
            } else {
                // New appliance, so create a matching HomeKit accessory
                this.log.info(`Adding new accessory '${ha.name}'`);
                const accessory = new this.hb.platformAccessory(ha.name, uuid);
                this.accessories[uuid] = linkage = { accessory };
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
        }
        this.hb.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, newAccessories);

        // Delete accessories for which there is no matching appliance
        const oldAccessories: PlatformAccessory[] = [];
        for (const [uuid, { accessory, implementation }] of Object.entries(this.accessories)) {
            if (!uuidMap[uuid]) {
                this.log.info(`Removing accessory '${accessory.displayName}'`);
                implementation?.unregister();
                oldAccessories.push(accessory);
                delete this.accessories[uuid];
            }
        }
        this.hb.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, oldAccessories);

        // Log a summary
        this.log.info(`Found ${appliances.length} appliance${appliances.length === 1 ? '' : 's'}`
                    + ` (${newAccessories.length} added, ${oldAccessories.length} removed)`);
    }
}
