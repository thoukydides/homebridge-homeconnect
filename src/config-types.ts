// Homebridge plugin for Home Connect home appliances
// Copyright © 2023 Alexander Thoukydides

// Global (not per-appliance) configuration options
export interface ConfigPlugin {
    // Fields required by Homebridge
    platform:               string;
    name?:                  string;
    // Fields used by this plugin
    clientid:               string;
    clientsecret?:          string;
    simulator?:             boolean;
    language:               { api: string };
    debug?:                 DebugFeatures[];
}

// Debugging features
export type DebugFeatures = 'Log API Headers' | 'Log API Bodies' | 'Log Debug as Info' | 'Mock Appliances';

// Appliance configurations indexed by haId
export interface ConfigAppliances {
    [haId: string]:         ApplianceConfig;
}

// Configuration for a single appliance
export type AddProgramsConfig = 'none' | 'auto' | 'custom';
export interface ApplianceConfig {
    enabled?:               boolean;
    names?:                 { prefix: ApplianceNamesPrefix };
    features?:              ApplianceFeatures;
    addprograms?:           AddProgramsConfig;
    programs?:              ApplianceProgramConfig[];
}

// Configuration of service names
export interface ApplianceNamesPrefix {
    programs?:              boolean;
    other?:                 boolean;
}

// Enable or disable optional features
export interface ApplianceFeatures {
    [feature: string]:      boolean;
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