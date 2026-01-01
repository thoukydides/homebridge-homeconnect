// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2026 Alexander Thoukydides

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { ConfigPlugin } from './config-types.js';

// Read the package.json file
interface PackageJson {
    engines:        Record<string, string>;
    name:           string;
    displayName:    string;
    version:        string;
}
const PACKAGE_JSON = join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json');
const PACKAGE = JSON.parse(readFileSync(PACKAGE_JSON, 'utf-8')) as PackageJson;

// Platform identifiers
export const ENGINES        = PACKAGE.engines;
export const PLUGIN_NAME    = PACKAGE.name;
export const PLATFORM_NAME  = PACKAGE.displayName;
export const PLUGIN_VERSION = PACKAGE.version;

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