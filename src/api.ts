// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2023 Alexander Thoukydides

import { Logger } from 'homebridge';

import { on } from 'events';
import { LocalStorage } from 'node-persist';
import { createCheckers } from 'ts-interface-checker';

import { ConfigPlugin } from './config-types';
import { CommandsWrapper, ExecuteCommandWrapper, ProgramDefinitionWrapper,
         HomeAppliance, HomeApplianceWrapper, HomeAppliancesWrapper,
         OptionWrapper, OptionsWrapper, ProgramsWrapper, ProgramWrapper,
         SettingWrapper, SettingsWrapper, StatusWrapper, StatusesWrapper } from './api-types';
import { APIAuthoriseUserAgent, AuthorisationURI } from './api-ua-auth';
import { APIEvent, APIEventStream } from './api-events';
import { APICheckValues, CommandKey, CommandKV, EventKV, OptionKey,
         OptionKV, ProgramDefinitionKV, ProgramKV,
         ProgramsKV, SettingKey,  SettingKV,
         SettingValue,
         StatusKey, StatusKV, OptionValue } from './api-value';
import { ProgramKey } from './api-value-types';
import apiTI from './ti/api-types-ti';

// Checkers for API responses
const checkers = createCheckers(apiTI);

// Low-level access to the Home Connect API
export class HomeConnectAPI {

    // User agent used for all requests
    private readonly ua: APIAuthoriseUserAgent;

    // Home Connect event stream
    private readonly events: APIEventStream;

    // Checking of key-value types
    private readonly checkValues: APICheckValues;

    // Create a new API object
    constructor(
        readonly log:       Logger,
        readonly config:    ConfigPlugin,
        readonly persist:   LocalStorage
    ) {
        this.ua = new APIAuthoriseUserAgent(log, config, persist, config.language.api);
        this.events = new APIEventStream(log, this.ua);
        this.checkValues = new APICheckValues(log);
    }

    // Check whether a particular scope has been authorised
    hasScope(scope: string): boolean {
        // Check for the specific scope requested
        if (this.ua.scopes.includes(scope)) return true;

        // Check for row or column scopes that include the requested scope
        const parsedScope = scope.match(/^([^-]+)-([^-]+)$/);
        if (parsedScope) {
            const [, row, column] = parsedScope;
            if (this.ua.scopes.includes(row))    return true;
            if (this.ua.scopes.includes(column)) return true;
        }

        // Scope has not been authorised
        return false;
    }

    // Get a list of paired home appliances
    async getAppliances(): Promise<HomeAppliance[]> {
        const response = await this.ua.get<HomeAppliancesWrapper>(
            checkers.HomeAppliancesWrapper, '/api/homeappliances');
        return response.data.homeappliances;
    }

    // Get details of a specific paired home appliances
    async getAppliance(haid: string): Promise<HomeAppliance> {
        const response = await this.ua.get<HomeApplianceWrapper>(
            checkers.HomeApplianceWrapper, `/api/homeappliances/${haid}`);
        return response.data;
    }

    // Get all programs
    async getPrograms(haid: string): Promise<ProgramsKV> {
        const response = await this.ua.get<ProgramsWrapper>(
            checkers.ProgramsWrapper, `/api/homeappliances/${haid}/programs`);
        return this.checkValues.programs(response.data);
    }

    // Get a list of the available programs
    async getAvailablePrograms(haid: string): Promise<ProgramsKV> {
        const response = await this.ua.get<ProgramsWrapper>(
            checkers.ProgramsWrapper, `/api/homeappliances/${haid}/programs/available`);
        return this.checkValues.programs(response.data);
    }

    // Get the details of a specific available programs
    async getAvailableProgram<PKey extends ProgramKey>(haid: string, key: PKey): Promise<ProgramDefinitionKV<PKey>> {
        const response = await this.ua.get<ProgramDefinitionWrapper>(
            checkers.ProgramDefinitionWrapper,
            `/api/homeappliances/${haid}/programs/available/${key}`);
        return this.checkValues.programDefinition<PKey>(response.data);
    }

    // Get the program which is currently being executed
    async getActiveProgram(haid: string): Promise<ProgramKV> {
        const response = await this.ua.get<ProgramWrapper>(
            checkers.ProgramWrapper, `/api/homeappliances/${haid}/programs/active`);
        return this.checkValues.program(response.data);
    }

    // Start a specified program
    setActiveProgram(haid: string, key: ProgramKey, options: OptionKV[] = []): Promise<void> {
        const putBody: ProgramWrapper = { data: { key, options} };
        return this.ua.put(`/api/homeappliances/${haid}/programs/active`, putBody);
    }

    // Stop the active program
    stopActiveProgram(haid: string): Promise<void> {
        return this.ua.delete(`/api/homeappliances/${haid}/programs/active`);
    }

    // Get all options of the active program
    async getActiveProgramOptions(haid: string): Promise<OptionKV[]> {
        const response = await this.ua.get<OptionsWrapper>(
            checkers.OptionsWrapper, `/api/homeappliances/${haid}/programs/active/options`);
        return this.checkValues.options(response.data.options);
    }

    // Set all options of the active program
    setActiveProgramOptions(haid: string, options: OptionKV[]): Promise<void> {
        const putBody: OptionsWrapper = { data: { options } };
        return this.ua.put(`/api/homeappliances/${haid}/programs/active/options`, putBody);
    }

    // Get a specific option of the active program
    async getActiveProgramOption<Key extends OptionKey>(haid: string, key: Key): Promise<OptionKV<Key>> {
        const response = await this.ua.get<OptionWrapper>(
            checkers.OptionWrapper, `/api/homeappliances/${haid}/programs/active/options/${key}`);
        return this.checkValues.option<Key>(response.data);
    }

    // Set a specific option of the active program
    setActiveProgramOption<Key extends OptionKey>(haid: string, key: Key, value: OptionValue<Key>): Promise<void> {
        const putBody: OptionWrapper = { data: { key, value } };
        return this.ua.put(`/api/homeappliances/${haid}/programs/active/options/${key}`, putBody);
    }

    // Get the program which is currently selected
    async getSelectedProgram(haid: string): Promise<ProgramKV> {
        const response = await this.ua.get<ProgramWrapper>(
            checkers.ProgramWrapper, `/api/homeappliances/${haid}/programs/selected`);
        return this.checkValues.program(response.data);
    }

    // Select a program
    setSelectedProgram(haid: string, key: ProgramKey, options: OptionKV[]): Promise<void> {
        const putBody: ProgramWrapper = { data: { key, options } };
        return this.ua.put(`/api/homeappliances/${haid}/programs/selected`, putBody);
    }

    // Get all options of the selected program
    async getSelectedProgramOptions(haid: string): Promise<OptionKV[]> {
        const response = await this.ua.get<OptionsWrapper>(
            checkers.OptionsWrapper, `/api/homeappliances/${haid}/programs/selected/options`);
        return this.checkValues.options(response.data.options);
    }

    // Set all options of the selected program
    setSelectedProgramOptions(haid: string, options: OptionKV[]): Promise<void> {
        const putBody: OptionsWrapper = { data: { options } };
        return this.ua.put(`/api/homeappliances/${haid}/programs/selected/options`, putBody);
    }

    // Get a specific option of the selected program
    async getSelectedProgramOption(haid: string, key: OptionKey): Promise<OptionKV> {
        const response = await this.ua.get<OptionWrapper>(
            checkers.OptionWrapper, `/api/homeappliances/${haid}/programs/selected/options/${key}`);
        return this.checkValues.option(response.data);
    }

    // Set a specific option of the selected program
    setSelectedProgramOption<Key extends OptionKey>(haid: string, key: Key, value: OptionValue<Key>): Promise<void> {
        const putBody: OptionWrapper = { data: { key, value } };
        return this.ua.put(`/api/homeappliances/${haid}/programs/selected/options/${key}`, putBody);
    }

    // Get the current status
    async getStatus(haid: string): Promise<StatusKV[]> {
        const response = await this.ua.get<StatusesWrapper>(
            checkers.StatusesWrapper, `/api/homeappliances/${haid}/status`);
        return this.checkValues.statuses(response.data.status);
    }

    // Get a specific status
    async getStatusSpecific<Key extends StatusKey>(haid: string, key: Key): Promise<StatusKV<Key>> {
        const response = await this.ua.get<StatusWrapper>(
            checkers.StatusWrapper, `/api/homeappliances/${haid}/status/${key}`);
        return this.checkValues.status<Key>(response.data);
    }

    // Get all settings
    async getSettings(haid: string): Promise<SettingKV[]> {
        const response = await this.ua.get<SettingsWrapper>(
            checkers.SettingsWrapper, `/api/homeappliances/${haid}/settings`);
        return this.checkValues.settings(response.data.settings);
    }

    // Get a specific setting
    async getSetting<Key extends SettingKey>(haid: string, key: Key): Promise<SettingKV<Key>> {
        const response = await this.ua.get<SettingWrapper>(
            checkers.SettingWrapper, `/api/homeappliances/${haid}/settings/${key}`);
        return this.checkValues.setting<Key>(response.data);
    }

    // Set a specific setting
    setSetting<Key extends SettingKey>(haid: string, key: Key, value: SettingValue<Key>): Promise<void> {
        const putBody: SettingWrapper = { data: { key, value } };
        return this.ua.put(`/api/homeappliances/${haid}/settings/${key}`, putBody);
    }

    // Get a list of supported commands
    async getCommands(haid: string): Promise<CommandKV[]> {
        const response = await this.ua.get<CommandsWrapper>(
            checkers.CommandsWrapper, `/api/homeappliances/${haid}/commands`);
        return this.checkValues.commands(response.data.commands);
    }

    // Issue a command
    setCommand(haid: string, key: CommandKey): Promise<void> {
        const putBody: ExecuteCommandWrapper = { data: { key, value: true } };
        return this.ua.put(`/api/homeappliances/${haid}/commands/${key}`, putBody);
    }

    // Get events for a single appliance or all appliances
    async* getEvents(haid?: string): AsyncGenerator<EventKV, void, void> {
        const events: AsyncIterableIterator<[APIEvent]> = on(this.events, 'event');
        for await (const [event] of events) {
            if (event.event !== 'KEEP-ALIVE'
                && (haid === undefined || !('id' in event) || event.id === haid)) {
                yield this.checkValues.event(event);
            }
        }
    }

    // Obtain the URL that the user should use to authorise this client
    getAuthorisationURI(): Promise<AuthorisationURI | null> {
        return this.ua.getAuthorisationURI();
    }
}
