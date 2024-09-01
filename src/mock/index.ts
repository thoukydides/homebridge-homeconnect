// Homebridge plugin for Home Connect home appliances
// Copyright © 2023 Alexander Thoukydides

import { Logger } from 'homebridge';

import { LocalStorage } from 'node-persist';
import { setTimeout as setTimeoutP } from 'timers/promises';

import { ConfigPlugin } from '../config-types';
import { HomeAppliance } from '../api-types';
import { CommandKey, CommandKV, EventKV, OptionKey, OptionKV,
         ProgramDefinitionKV, ProgramKV, ProgramsKV, SettingKey,  SettingKV,
         SettingValue, StatusKey, StatusKV, OptionValue } from '../api-value';
import { ProgramKey } from '../api-value-types';
import { HomeConnectAPI } from '../api';
import { MockAppliance } from './mock-appliance';
import { MockDishwasher } from './mock-dishwasher';
import { MockHob } from './mock-hob';
import { MockHood } from './mock-hood';
import { MockOven } from './mock-oven';
import { MockFridgeFreezer } from './mock-fridgefreezer';
import { MockCoffeeMaker } from './mock-coffeemaker';
import { MockDryer } from './mock-dryer';
import { MockWasher } from './mock-washer';
import { AuthorisationStatus } from '../api-ua-auth';

// Random delay before completing API requests
const MOCK_MIN_DELAY =  1; // (milliseconds)
const MOCK_MAX_DELAY = 20; // (milliseconds)

// Mock appliance methods by name
type MethodKey<Key extends keyof MockAppliance = keyof MockAppliance> =
    Key extends Key ? (MockAppliance[Key] extends (...args: any[]) => unknown ? Key : never) : never;
type MethodParams<Key extends MethodKey = MethodKey> = Parameters<MockAppliance[Key]>;
type MethodReturn<Key extends MethodKey = MethodKey> = ReturnType<MockAppliance[Key]>;

// Low-level access to the Home Connect API with mocked appliances
export class MockAPI implements HomeConnectAPI {

    // The mock appliances
    appliances = new Map<string, MockAppliance>();

    // Create a new API object
    constructor(
        readonly log:       Logger,
        readonly config:    ConfigPlugin,
        readonly persist:   LocalStorage
    ) {
        // Create the mock appliances
        this.addMock(MockCoffeeMaker);
        this.addMock(MockDishwasher);
        this.addMock(MockDryer);
        this.addMock(MockFridgeFreezer);
        this.addMock(MockHob);
        this.addMock(MockHood);
        this.addMock(MockOven);
        this.addMock(MockWasher);
    }

    // Instantiate a mock appliance
    addMock(constructor: new (...args: ConstructorParameters<typeof MockAppliance>) => MockAppliance): void {
        const mockAppliance = new constructor(this.log);
        this.appliances.set(mockAppliance.haid, mockAppliance);
    }

    // Delay requests and events
    async delay(): Promise<void> {
        await setTimeoutP(MOCK_MIN_DELAY + Math.random() * (MOCK_MAX_DELAY - MOCK_MIN_DELAY));
    }

    // Wrap an API request
    async request<Method extends MethodKey>(method: Method, haid: string, ...args: MethodParams<Method>): Promise<MethodReturn<Method>> {
        await this.delay();
        const mockAppliance = this.appliances.get(haid);
        if (!mockAppliance) throw MockAppliance.statusCodeError(404, `Unknown appliance "${haid}"`);
        const fn = mockAppliance[method] as (...args: MethodParams<Method>) => MethodReturn<Method>;
        try {
            const result = fn.bind(mockAppliance)(...args);
            await this.delay();
            return result;
        } catch (err) {
            await this.delay();
            throw err;
        }
    }

    // Check whether a particular scope has been authorised
    hasScope(_scope: string): boolean {
        return true;
    }

    // Get authorisation status updates
    async getAuthorisationStatus(): Promise<AuthorisationStatus> {
        return Promise.resolve({ state: 'success' });
    }

    // Trigger a retry of Device Flow authorisation
    retryAuthorisation(): void { /* empty */ }

    // Get a list of paired home appliances
    async getAppliances(): Promise<HomeAppliance[]> {
        return Promise.resolve([...this.appliances.values()].map(appliance => appliance.getAppliance()));
    }

    // Forward most methods to the appropriate mock appliance
    /* eslint-disable max-len */
    getAppliance                                   (...args: [string]):                         Promise<HomeAppliance>            { return this.request('getAppliance',              ...args); }
    getPrograms                                    (...args: [string]):                         Promise<ProgramsKV>               { return this.request('getPrograms',               ...args); }
    getAvailablePrograms                           (...args: [string]):                         Promise<ProgramsKV>               { return this.request('getAvailablePrograms',      ...args); }
    getAvailableProgram<Key extends ProgramKey>    (...args: [string, Key]):                    Promise<ProgramDefinitionKV<Key>> { return this.request('getAvailableProgram',       ...args) as Promise<ProgramDefinitionKV<Key>>; }
    getActiveProgram                               (...args: [string]):                         Promise<ProgramKV>                { return this.request('getActiveProgram',          ...args); }
    setActiveProgram                               (...args: [string, ProgramKey, OptionKV[]]): Promise<void>                     { return this.request('setActiveProgram',          ...args); }
    stopActiveProgram                              (...args: [string]):                         Promise<void>                     { return this.request('stopActiveProgram',         ...args); }
    getActiveProgramOptions                        (...args: [string]):                         Promise<OptionKV[]>               { return this.request('getActiveProgramOptions',   ...args); }
    setActiveProgramOptions                        (...args: [string, OptionKV[]]):             Promise<void>                     { return this.request('setActiveProgramOptions',   ...args); }
    getActiveProgramOption<Key extends OptionKey>  (...args: [string, Key]):                    Promise<OptionKV<Key>>            { return this.request('getActiveProgramOption',    ...args) as Promise<OptionKV<Key>>; }
    setActiveProgramOption<Key extends OptionKey>  (...args: [string, Key, OptionValue<Key>]):  Promise<void>                     { return this.request('setActiveProgramOption',    ...args); }
    getSelectedProgram                             (...args: [string]):                         Promise<ProgramKV>                { return this.request('getSelectedProgram',        ...args); }
    setSelectedProgram                             (...args: [string, ProgramKey, OptionKV[]]): Promise<void>                     { return this.request('setSelectedProgram',        ...args); }
    getSelectedProgramOptions                      (...args: [string]):                         Promise<OptionKV[]>               { return this.request('getSelectedProgramOptions', ...args); }
    setSelectedProgramOptions                      (...args: [string, OptionKV[]]):             Promise<void>                     { return this.request('setSelectedProgramOptions', ...args); }
    getSelectedProgramOption<Key extends OptionKey>(...args: [string, Key]):                    Promise<OptionKV<Key>>            { return this.request('getSelectedProgramOption',  ...args) as Promise<OptionKV<Key>>; }
    setSelectedProgramOption<Key extends OptionKey>(...args: [string, Key, OptionValue<Key>]):  Promise<void>                     { return this.request('setSelectedProgramOption',  ...args); }
    getStatus                                      (...args: [string]):                         Promise<StatusKV[]>               { return this.request('getStatus',                 ...args); }
    getStatusSpecific<Key extends StatusKey>       (...args: [string, Key]):                    Promise<StatusKV<Key>>            { return this.request('getStatusSpecific',         ...args) as Promise<StatusKV<Key>>; }
    getSettings                                    (...args: [string]):                         Promise<SettingKV[]>              { return this.request('getSettings',               ...args); }
    getSetting<Key extends SettingKey>             (...args: [string, Key]):                    Promise<SettingKV<Key>>           { return this.request('getSetting',                ...args) as Promise<SettingKV<Key>>; }
    setSetting<Key extends SettingKey>             (...args: [string, Key, SettingValue<Key>]): Promise<void>                     { return this.request('setSetting',                ...args); }
    getCommands                                    (...args: [string]):                         Promise<CommandKV[]>              { return this.request('getCommands',               ...args); }
    setCommand                                     (...args: [string, CommandKey]):             Promise<void>                     { return this.request('setCommand',                ...args); }
    /* eslint-enable max-len */

    // Get events for a single appliance or all appliances
    async* getEvents(haid?: string): AsyncGenerator<EventKV, void, void> {
        // Select the appliances
        const appliances = haid ? [this.appliances.get(haid)] : this.appliances.values();

        // Receive the event streams from all of the selected appliances
        let eventPromise: Promise<EventKV>;
        let eventResolve: (event: EventKV) => void;
        const receiveEvents = async (events: AsyncGenerator<EventKV, void, void>): Promise<void> => {
            for await (const event of events) {
                await this.delay();
                eventResolve(event);
            }
        };
        for (const mockAppliance of appliances) {
            if (mockAppliance) receiveEvents(mockAppliance.getEvents());
        }

        // Merge the event streams
        yield { event: 'START' };
        eventPromise = new Promise(resolve => eventResolve = resolve);
        for (;;) {
            const event = await eventPromise;
            eventPromise = new Promise(resolve => eventResolve = resolve);
            yield event;
        }
    }
}