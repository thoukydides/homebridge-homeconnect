// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2023 Alexander Thoukydides

// eslint-disable-next-line @typescript-eslint/no-var-requires
export const PACKAGE = require('../package.json');

// Platform identifiers
export const PLUGIN_NAME    :string = PACKAGE.name;
export const PLATFORM_NAME  :string = PACKAGE.displayName;
export const PLUGIN_VERSION :string = PACKAGE.version;

// Required Homebridge API version
export const REQUIRED_HOMEBRIDGE_API = '^2.7';