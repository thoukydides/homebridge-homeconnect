// Homebridge plugin for Home Connect home appliances
// Copyright © 2023 Alexander Thoukydides

// Global (not per-appliance) configuration options
export interface ConfigPlugin {
    // Fields required by Homebridge
    platform:               string;
    // Fields used by this plugin
    clientid:               string;
    clientsecret?:          string;
    simulator?:             boolean;
    language:               { api: string };
    debug:                  DebugFeatures[];
}

// Debugging features
export type DebugFeatures = 'Log API Headers' | 'Log API Bodies' | 'Log Debug as Info';

// Appliance configurations indexed by haId
export interface ConfigAppliances {
    [index: string]:        ApplianceConfig;
}

// Configuration for a single appliance
export type AddProgramsConfig = 'none' | 'auto' | 'custom';
export interface ApplianceConfig {
    addprograms?:           AddProgramsConfig;
    programs?:              ApplianceProgramConfig[];
}

// Configuration for a single appliance program
export interface ApplianceProgramConfig {
    name:                   string;
    key:                    string;
    selectonly?:            boolean;
    options?:               ApplianceProgramOptions;
}
export interface ApplianceProgramOptions {
    [index: string]:        string | number | boolean;
}