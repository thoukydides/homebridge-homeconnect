// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2023 Alexander Thoukydides

import { Logger } from 'homebridge';

import { on } from 'events';
import { LocalStorage } from 'node-persist';
import { createCheckers } from 'ts-interface-checker';

import { Config } from './config-types';
import { Command, CommandsWrapper, ExecuteCommandWrapper, ProgramDefinition,
         ProgramDefinitionWrapper, HomeAppliance, HomeApplianceWrapper,
         HomeAppliancesWrapper, Option, OptionWrapper, OptionsWrapper,
         Programs, ProgramsWrapper, ProgramWrapper, Setting,
         SettingWrapper, SettingsWrapper, Status, StatusWrapper,
         StatusesWrapper, Value, Program } from './api-types';
import { APIAuthoriseUserAgent, AuthorisationURI } from './api-ua-auth';
import { APIEvent, APIEventStream } from './api-events';
import apiTI from './ti/api-types-ti';

// Checkers for API responses
const checkers = createCheckers(apiTI);

// Low-level access to the Home Connect API
export class HomeConnectAPI {

    // Language used for human-readable names and values
    readonly language = this.config.language?.api ?? 'en-GB';

    // User agent used for all requests
    private readonly ua: APIAuthoriseUserAgent;

    // Home Connect event stream
    private readonly events: APIEventStream;

    // Create a new API object
    constructor(
        readonly log:       Logger,
        readonly config:    Config,
        readonly persist:   LocalStorage
    ) {
        this.ua = new APIAuthoriseUserAgent(log, config, persist, this.language);
        this.events = new APIEventStream(log, this.ua);
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
    async getPrograms(haid: string): Promise<Programs> {
        const response = await this.ua.get<ProgramsWrapper>(
            checkers.ProgramsWrapper, `/api/homeappliances/${haid}/programs`);
        return response.data;
    }

    // Get a list of the available programs
    async getAvailablePrograms(haid: string): Promise<Programs> {
        const response = await this.ua.get<ProgramsWrapper>(
            checkers.ProgramsWrapper, `/api/homeappliances/${haid}/programs/available`);
        return response.data;
    }

    // Get the details of a specific available programs
    async getAvailableProgram(haid: string, key: string): Promise<ProgramDefinition> {
        const response = await this.ua.get<ProgramDefinitionWrapper>(
            checkers.ProgramDefinitionWrapper,
            `/api/homeappliances/${haid}/programs/available/${key}`);
        return response.data;
    }

    // Get the program which is currently being executed
    async getActiveProgram(haid: string): Promise<Program> {
        const response = await this.ua.get<ProgramWrapper>(
            checkers.ProgramWrapper, `/api/homeappliances/${haid}/programs/active`);
        return response.data;
    }

    // Start a specified program
    setActiveProgram(haid: string, key: string, options: Option[] = []): Promise<void> {
        const putBody: ProgramWrapper = { data: { key, options} };
        return this.ua.put(`/api/homeappliances/${haid}/programs/active`, putBody);
    }

    // Stop the active program
    stopActiveProgram(haid: string): Promise<void> {
        return this.ua.delete(`/api/homeappliances/${haid}/programs/active`);
    }

    // Get all options of the active program
    async getActiveProgramOptions(haid: string): Promise<Option[]> {
        const response = await this.ua.get<OptionsWrapper>(
            checkers.OptionsWrapper, `/api/homeappliances/${haid}/programs/active/options`);
        return response.data.options;
    }

    // Set all options of the active program
    setActiveProgramOptions(haid: string, options: Option[]): Promise<void> {
        const putBody: OptionsWrapper = { data: { options } };
        return this.ua.put(`/api/homeappliances/${haid}/programs/active/options`, putBody);
    }

    // Get a specific option of the active program
    async getActiveProgramOption(haid: string, key: string): Promise<Option> {
        const response = await this.ua.get<OptionWrapper>(
            checkers.OptionWrapper, `/api/homeappliances/${haid}/programs/active/options/${key}`);
        return response.data;
    }

    // Set a specific option of the active program
    setActiveProgramOption(haid: string, key: string, value: Value): Promise<void> {
        const putBody: OptionWrapper = { data: { key, value } };
        return this.ua.put(`/api/homeappliances/${haid}/programs/active/options/${key}`, putBody);
    }

    // Get the program which is currently selected
    async getSelectedProgram(haid: string): Promise<Program> {
        const response = await this.ua.get<ProgramWrapper>(
            checkers.ProgramWrapper, `/api/homeappliances/${haid}/programs/selected`);
        return response.data;
    }

    // Select a program
    setSelectedProgram(haid: string, key: string, options: Option[]): Promise<void> {
        const putBody: ProgramWrapper = { data: { key, options } };
        return this.ua.put(`/api/homeappliances/${haid}/programs/selected`, putBody);
    }

    // Get all options of the selected program
    async getSelectedProgramOptions(haid: string): Promise<Option[]> {
        const response = await this.ua.get<OptionsWrapper>(
            checkers.OptionsWrapper, `/api/homeappliances/${haid}/programs/selected/options`);
        return response.data.options;
    }

    // Set all options of the selected program
    setSelectedProgramOptions(haid: string, options: Option[]): Promise<void> {
        const putBody: OptionsWrapper = { data: { options } };
        return this.ua.put(`/api/homeappliances/${haid}/programs/selected/options`, putBody);
    }

    // Get a specific option of the selected program
    async getSelectedProgramOption(haid: string, key: string): Promise<Option> {
        const response = await this.ua.get<OptionWrapper>(
            checkers.OptionWrapper, `/api/homeappliances/${haid}/programs/selected/options/${key}`);
        return response.data;
    }

    // Set a specific option of the selected program
    setSelectedProgramOption(haid: string, key: string, value: Value): Promise<void> {
        const putBody: OptionWrapper = { data: { key, value } };
        return this.ua.put(`/api/homeappliances/${haid}/programs/selected/options/${key}`, putBody);
    }

    // Get the current status
    async getStatus(haid: string): Promise<Status[]> {
        const response = await this.ua.get<StatusesWrapper>(
            checkers.StatusesWrapper, `/api/homeappliances/${haid}/status`);
        return response.data.status;
    }

    // Get a specific status
    async getStatusSpecific(haid: string, key: string): Promise<Status> {
        const response = await this.ua.get<StatusWrapper>(
            checkers.StatusWrapper, `/api/homeappliances/${haid}/status/${key}`);
        return response.data;
    }

    // Get all settings
    async getSettings(haid: string): Promise<Setting[]> {
        const response = await this.ua.get<SettingsWrapper>(
            checkers.SettingsWrapper, `/api/homeappliances/${haid}/settings`);
        return response.data.settings;
    }

    // Get a specific setting
    async getSetting(haid: string, key: string): Promise<Setting> {
        const response = await this.ua.get<SettingWrapper>(
            checkers.SettingWrapper, `/api/homeappliances/${haid}/settings/${key}`);
        return response.data;
    }

    // Set a specific setting
    setSetting(haid: string, key: string, value: Value): Promise<void> {
        const putBody: SettingWrapper = { data: { key, value } };
        return this.ua.put(`/api/homeappliances/${haid}/settings/${key}`, putBody);
    }

    // Get a list of supported commands
    async getCommands(haid: string): Promise<Command[]> {
        const response = await this.ua.get<CommandsWrapper>(
            checkers.CommandsWrapper, `/api/homeappliances/${haid}/commands`);
        return response.data.commands;
    }

    // Issue a command
    setCommand(haid: string, key: string, value = true): Promise<void> {
        const putBody: ExecuteCommandWrapper = { data: { key, value } };
        return this.ua.put(`/api/homeappliances/${haid}/commands/${key}`, putBody);
    }

    // Get events for a single appliance or all appliances
    async* getEvents(haid?: string): AsyncGenerator<APIEvent, void, void> {
        const events: AsyncIterableIterator<[APIEvent]> = on(this.events, 'event');
        for await (const [event] of events) {
            if (event.event !== 'KEEP-ALIVE'
                && (haid === undefined || !('id' in event) || event.id === haid)) {
                yield event;
            }
        }
    }

    // Obtain the URL that the user should use to authorise this client
    getAuthorisationURI(): Promise<AuthorisationURI | null> {
        return this.ua.getAuthorisationURI();
    }
}
