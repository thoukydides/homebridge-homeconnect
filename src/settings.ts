// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2023 Alexander Thoukydides

import { ConfigPlugin } from './config-types.js';

import PACKAGE from '../package.json' assert { type: 'json' };

// Platform identifiers
export const ENGINES: Record<string, string>    = PACKAGE.engines;
export const PLUGIN_NAME    :string = PACKAGE.name;
export const PLATFORM_NAME  :string = PACKAGE.displayName;
export const PLUGIN_VERSION :string = PACKAGE.version;

// Required Homebridge API version
export const REQUIRED_HOMEBRIDGE_API = '^2.7';

// Required Homebridge Accessory Protocol version
export const REQUIRED_HOMEBRIDGE_HAP = '>=0.9.0';

// Default configuration options
export const DEFAULT_CONFIG: Partial<ConfigPlugin> = {
    language:                   { api: 'en-GB' },
    debug:                      []
};
export const DEFAULT_CLIENTID = (simulator?: boolean): string | undefined =>
    process.env[simulator ? 'HOMECONNECT_CLIENT_SIMULATOR' : 'HOMECONNECT_CLIENT_PHYSICAL'];

// API scopes to request (additional Partner Agreement is required for 'FridgeFreezer-Images')
export const API_SCOPES = ['IdentifyAppliance', 'Monitor', 'Settings', 'Control'];