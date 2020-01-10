// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2020 Alexander Thoukydides

'use strict';

const HomeConnectAPI = require('./homeconnect_api.js');
const HomeConnectDevice = require('./homeconnect_device.js');
const ApplianceGeneric = require('./appliance_generic.js');
const ApplianceCleaning = require('./appliance_cleaning.js');
const ApplianceCooking = require('./appliance_cooking.js');
const ApplianceCooling = require('./appliance_cooling.js');
const NodePersist = require('node-persist');
const Path = require('path');
const fsPromises = require('fs').promises;

let UUID;

// Platform identifiers
const PLUGIN_NAME = 'homebridge-homeconnect';
const PLATFORM_NAME = 'HomeConnect';

// Interval between updating the list of appliances
// (only 1000 API calls allowed per day, so only check once an hour)
const UPDATE_APPLIANCES_DELAY = 60 * 60 * 1000; // (milliseconds)

// Register as a dynamic platform
module.exports = homebridge => {
    homebridge.registerPlatform(PLUGIN_NAME, PLATFORM_NAME,
                                HomeConnectPlatform, true);
}

// A Homebridge HomeConnect platform
class HomeConnectPlatform {

    // Create a new HomeConnect platform object
    constructor(log, config, homebridge) {
        log('new HomeConnectPlatform');
        this.log = log;
        this.config = config;
        this.homebridge = homebridge;
        this.accessories = {};

        // Shortcuts to useful HAP objects
        UUID = homebridge.hap.uuid;

        // Wait for Homebridge to restore cached accessories
        this.homebridge.on('didFinishLaunching',
                           () => this.finishedLaunching());
    }

    // Restore a cached accessory
    configureAccessory(accessory) {
        accessory.reachable = false;
        this.accessories[accessory.UUID] = accessory;
    }

    // Update list of Home Connect appliances after cache has been restored
    async finishedLaunching() {
        let restored = Object.keys(this.accessories).length;
        if (restored) {
            this.log('Restored ' + Object.keys(this.accessories).length
                     + ' cached accessories');
        }

        // Check that essential configuration has been provided
        if (!this.config) {
            if (restored) this.log('Plugin configuration missing;'
                                   + ' removing all cached accessories');
            return this.addRemoveAccessories([]);
        }
        if (!this.config['clientid']) {
            return this.log.error('Platform ' + PLATFORM_NAME + ' config.json'
                                  + " is missing 'clientid' property");
        }

        // Create persistent storage for this plugin
        let persistDir = Path.join(this.homebridge.user.storagePath(),
                                   PLUGIN_NAME, 'persist');
        this.persist = NodePersist.create({ dir: persistDir });
        await this.persist.init();

        // Retrieve any saved authorisation token
        let savedToken = await this.persist.getItem('token');
        if (!savedToken) {
            try {
                // Attempt to load any old auth data saved by node-persist 0.0.8
                let tokenFile = Path.join(this.homebridge.user.storagePath(),
                                          PLUGIN_NAME, 'token');
                let data = await fsPromises.readFile(tokenFile);
                savedToken = JSON.parse(data);
                this.log.warn('Old format authorsation data retrieved');
            } catch (err) {}
            if (!savedToken) this.log.warn('No saved authorisation data found');
        }

        // Connect to the Home Connect cloud
        this.homeconnect = new HomeConnectAPI({
            log:        msg => this.log.debug(msg),
            // User options from config.json
            clientID:   this.config.clientid,
            simulator:  this.config.simulator,
            language:   (this.config.language || {}).api,
            // Saved access and refresh tokens
            savedAuth:  savedToken
        }).on('auth_save', async token => {
            await this.persist.setItem('token', token);
            this.log('Home Connect authorisation token saved');
        }).on('auth_uri', msg => {
            this.log.error('Home Connect authorisation required: ' + msg);
        });

        // Obtain a list of Home Connect home appliances
        this.updateAppliances();
    };

    // Periodically update a list of Home Connect home appliances
    async updateAppliances() {
        while (true) {
            try {
                await this.homeconnect.waitUntilAuthorised();
                let appliances = await this.homeconnect.getAppliances();
                this.log.debug('Found ' + appliances.length + ' appliances');
                this.addRemoveAccessories(appliances);
            } catch (err) {
                this.log.error('Failed to read list of'
                               + ' home appliances: ' + err);
            }
            await this.homeconnect.sleep(UPDATE_APPLIANCES_DELAY);
        }
    }

    // Add or remove accessories to match the available appliances
    addRemoveAccessories(appliances) {
        // Add a Homebridge accessory for each new appliance
        let newAccessories = [];
        appliances.forEach(ha => {
            // Select a constructor for this appliance
            let applianceConstructor = {
                // Cooking appliances
                CoffeeMaker:    ApplianceCooking.CoffeeMaker,
                CookProcessor:  ApplianceCooking.CookProcessor,
                Hob:            ApplianceCooking.Hob,
                Hood:           ApplianceCooking.Hood,
                Oven:           ApplianceCooking.Oven,
                // Cleaning appliances
                CleaningRobot:  ApplianceCleaning.CleaningRobot,
                Dishwasher:     ApplianceCleaning.Dishwasher,
                Dryer:          ApplianceCleaning.Dryer,
                Washer:         ApplianceCleaning.Washer,
                WasherDryer:    ApplianceCleaning.WasherDryer,
                // Cooling appliances
                Freezer:        ApplianceCooling.Freezer,
                FridgeFreezer:  ApplianceCooling.FridgeFreezer,
                Refrigerator:   ApplianceCooling.Refrigerator,
                WineCooler:     ApplianceCooling.WineCooler
            }[ha.type];
            if (!applianceConstructor)
                return this.log.warn("Appliance type '" + ha.type
                                     + "' not currently supported");
            
            // Convert the Home Connect haId into a Homebridge UUID
            ha.uuid = UUID.generate(ha.haId);
            let accessory = this.accessories[ha.uuid];
            if (accessory) {
                // An accessory already exists for this appliance
                if (accessory.appliance) return;
                this.log.debug("Connecting accessory '" + ha.name + "'");
            } else {
                // New appliance, so create a matching accessory
                this.log("Adding new accessory '" + ha.name + "'");
                accessory = new this.homebridge.platformAccessory(ha.name,
                                                                  ha.uuid);
                this.accessories[ha.uuid] = accessory;
                newAccessories.push(accessory);
            }
            
            // Construct an instance of the appliance
            let device = new HomeConnectDevice(
                msg => this.log.debug(msg), this.homeconnect, ha);
            let deviceConfig = this.config[ha.haId] || {};
            accessory.appliance =
                new applianceConstructor(this.log, this.homebridge,
                                         device, accessory, deviceConfig);
        });
        this.homebridge.registerPlatformAccessories(
            PLUGIN_NAME, PLATFORM_NAME, newAccessories);
        
        // Delete accessories for which there is no matching appliance
        let oldAccessories = [];
        Object.keys(this.accessories).forEach(uuid => {
            let accessory = this.accessories[uuid];
            if (!appliances.some(ha => { return ha.uuid == uuid })) {
                this.log("Removing accessory '"
                         + accessory.displayName + "'");
                if (accessory.appliance) accessory.appliance.unregister();
                oldAccessories.push(accessory);
                delete this.accessories[uuid];
            }
        });
        this.homebridge.unregisterPlatformAccessories(
            PLUGIN_NAME, PLATFORM_NAME, oldAccessories);
    }
}
