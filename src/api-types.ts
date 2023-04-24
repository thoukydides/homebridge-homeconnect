// Homebridge plugin for Home Connect home appliances
// Copyright © 2023 Alexander Thoukydides

// Most options, settings, events, etc, can be any of any type
export type Value = string | number | boolean | null;
export interface Constraints {
    min?:                       number;
    max?:                       number;
    stepsize?:                  number;
    allowedvalues?:             Array<string>;
    displayvalues?:             Array<string>;
    access?:                    Access;
    default?:                   Value;
}

// Access rights for settings and status
type Access = 'read' | 'readWrite';

// Commands
export interface ExecuteCommandWrapper {
    data:                       ExecuteCommand;
}
export interface ExecuteCommand {
    key:                        string;
    value:                      Value;
}
export interface CommandsWrapper {
    data: {
        commands:               Command[];
    };
}
export interface Command {
    key:                        string;
    name?:                      string;
    description?:               string;
}

// Events
export type Event = EventKeepAlive | EventApplianceConnection | EventApplianceData;
export interface EventKeepAlive {
    event:                      'KEEP-ALIVE';
    data?:                      '';
}
export interface EventApplianceConnection {
    event:                      'CONNECTED' | 'DISCONNECTED' | 'PAIRED' | 'DEPAIRED';
    id:                         string;
    data?:                      '';
}
export interface EventApplianceData {
    event:                      'STATUS' | 'EVENT' | 'NOTIFY';
    id:                         string;
    data: {
        items:                  EventData[];
        haId?:                  string;
    };
}
export interface EventData {
    key:                        string;
    name?:                      string;
    uri?:                       string;
    timestamp:                  number | null;
    level:                      EventLevel;
    handling:                   EventHandling;
    value:                      Value;
    displayvalue?:              string;
    unit?:                      string;
}
type EventLevel = 'critical' | 'alert' | 'warning' | 'hint' | 'info';
type EventHandling = 'none' | 'acknowledge' | 'decision';

// Home appliances
export interface HomeAppliancesWrapper {
    data: {
        homeappliances:         HomeAppliance[];
    };
}
export interface HomeApplianceWrapper {
    data:                       HomeAppliance;
}
export interface HomeAppliance {
    haId:                       string;
    name:                       string;
    type:                       string;
    brand:                      string;
    vib:                        string;
    enumber:                    string;
    connected:                  boolean;
}

// Images
export interface ImagesWrapper {
    data: {
        images:                 Image[];
    };
}
export interface Image {
    key:                        string;
    name?:                      string;
    imagekey:                   string;
    previewimagekey:             string;
    timestamp:                  number;
    quality:                    ImageQuality;
}
export type ImageQuality = 'good' | 'bad';

// Programs (list)
export interface ProgramsWrapper {
    data: {
        programs:               ProgramList[];
    };
}
export interface ProgramList {
    key:                        string;
    name?:                      string;
    constraints?:               ProgramConstraints;
}
export interface ProgramConstraints {
    available?:                 boolean;
    execution?:                 ProgramExecution;
}
type ProgramExecution = 'none' | 'selectonly' | 'startonly' | 'selectandstart';

// Program (selected/active)
export interface ProgramWrapper {
    data:                       Program;
}
export interface Program {
    key:                        string;
    name?:                      string;
    options?:                   Option[];
}

// Program definition
export interface ProgramDefinitionWrapper {
    data:                       ProgramDefinition;
}
export interface ProgramDefinition {
    key:                        string;
    name?:                      string;
    options?:                   OptionDefinition[];
}
export interface OptionDefinition {
    key:                        string;
    name?:                      string;
    type:                       string;
    unit?:                      string;
    constraints?:               OptionConstraints;
}
export interface OptionConstraints extends Constraints {
    default?:                   Value;
    liveupdate?:                boolean;
}

// Options
export interface OptionsWrapper {
    data: {
        options:                Option[];
    };
}
export interface OptionWrapper {
    data:                       Option;
}
export interface Option {
    key:                        string;
    name?:                      string;
    value:                      Value;
    unit?:                      string;
}

// Settings
export interface SettingsWrapper {
    data: {
        settings:               Setting[];
    };
}
export interface SettingWrapper {
    data:                       Setting;
}
export interface Setting {
    key:                        string;
    name?:                      string;
    type?:                      string;
    value:                      Value;
    displayvalue?:              string;
    unit?:                      string;
    constraints?:               Constraints;
}

// Status
export interface StatusesWrapper {
    data: {
        status:                 Status[];
    };
}
export interface StatusWrapper {
    data:                       Status;
}
export interface Status {
    key:                        string;
    name?:                      string;
    value:                      Value;
    displayvalue?:              string;
    unit?:                      string;
    constraints?:               Constraints;
}

// API errors (excluding authorisation)
export interface ErrorResponse {
    error: {
        key:                    string;
        description?:           string;
        // Undocumented fields included in some responses
        developerMessage?:      string;
        value?:                 string;
    };
}