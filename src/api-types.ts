// Homebridge plugin for Home Connect home appliances
// Copyright © 2023 Alexander Thoukydides

// Most options, settings, events, etc, can be of any type
export type Value = string | number | boolean;
export type Constraints = ConstraintsString | ConstraintsNumber | ConstraintsBoolean;
export interface ConstraintsString extends ConstraintsCommon {
    default?:                   string;
    allowedvalues?:             Array<string>;
    displayvalues?:             Array<string>;
}
export interface ConstraintsNumber extends ConstraintsCommon {
    default?:                   number;
    min?:                       number;
    max?:                       number;
    stepsize?:                  number;
}
export interface ConstraintsBoolean extends ConstraintsCommon {
    default?:                   boolean;
}
export interface ConstraintsCommon {
    access?:                    Access;
}

// Access rights for settings and status
type Access = 'read' | 'readWrite';

// Commands
export interface ExecuteCommandWrapper {
    data:                       ExecuteCommand;
}
export interface ExecuteCommand {
    key:                        string;
    value:                      true;
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
    data?:                      '' | EventData;
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
    value:                      Value | null;
    displayvalue?:              string;
    unit?:                      string;
    haId?:                      string;
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
    previewimagekey:            string;
    timestamp:                  number;
    quality:                    ImageQuality;
}
export type ImageQuality = 'good' | 'bad';

// Programs (list)
export interface ProgramsWrapper {
    data:                       Programs;
}
export interface Programs {
    programs:                   ProgramList[];
    selected?:                  ProgramPartial;
    active?:                    ProgramPartial;
}
export interface ProgramList {
    key:                        string;
    name?:                      string;
    constraints?:               ProgramConstraints;
}
export interface ProgramConstraints {
    available?:                 boolean;
    execution?:                 ProgramExecution;
    access?:                    Access;
}
type ProgramExecution = 'none' | 'selectonly' | 'startonly' | 'selectandstart';

// Program (selected/active)
export interface ProgramWrapper {
    data:                       Program;
}
export interface Program extends ProgramPartial {
    key:                        string;
}
export interface ProgramPartial {
    key?:                       string;
    name?:                      string;
    options?:                   Option[];
    constraints?:               ProgramConstraints;
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
export type OptionDefinition = OptionDefinitionString | OptionDefinitionNumber | OptionDefinitionBoolean;
export interface OptionDefinitionString extends OptionDefinitionCommon {
    type:                       'String' | string;
    constraints?:               OptionConstraintsCommon & ConstraintsString;
}
export interface OptionDefinitionNumber extends OptionDefinitionCommon {
    type:                       'Double' | 'Int';
    constraints?:               OptionConstraintsCommon & ConstraintsNumber;
}
export interface OptionDefinitionBoolean extends OptionDefinitionCommon {
    type:                       'Boolean';
    constraints?:               OptionConstraintsCommon & ConstraintsBoolean;
}
export interface OptionDefinitionCommon {
    key:                        string;
    name?:                      string;
    unit?:                      string;
}
export interface OptionConstraintsCommon {
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
    displayvalue?:              string;
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
export type Setting = SettingString | SettingNumber | SettingBoolean;
export interface SettingString extends SettingCommon {
    value:                      string;
    constraints?:               ConstraintsString;
}
export interface SettingNumber extends SettingCommon {
    value:                      number;
    constraints?:               ConstraintsNumber;
}
export interface SettingBoolean extends SettingCommon {
    value:                      boolean;
    constraints?:               ConstraintsBoolean;
}
export interface SettingCommon {
    key:                        string;
    name?:                      string;
    type?:                      string;
    displayvalue?:              string;
    unit?:                      string;
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
export type Status = StatusString | StatusNumber | StatusBoolean;
export interface StatusString extends StatusCommon {
    value:                      string;
    constraints?:               ConstraintsString;
}
export interface StatusNumber extends StatusCommon {
    value:                      number;
    constraints?:               ConstraintsNumber;
}
export interface StatusBoolean extends StatusCommon {
    value:                      boolean;
    constraints?:               ConstraintsBoolean;
}
export interface StatusCommon {
    key:                        string;
    name?:                      string;
    displayvalue?:              string;
    unit?:                      string;
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