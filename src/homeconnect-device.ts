// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2023 Alexander Thoukydides

import { Logger } from 'homebridge';

import { EventEmitter } from 'events';
import { once } from 'node:events';

import { APIStatusCodeError } from './api-errors';
import { MS } from './utils';
import { logError } from './log-error';
import { HomeConnectAPI } from './api';
import { HomeAppliance } from './api-types';
import { OperationState, OptionValues, PowerState, ProgramKey } from './api-value-types';
import { CommandKV, EventKey, EventKV, EventValue, KVKey, KVValue, OptionKey,
         OptionKV, OptionValue, ProgramDefinitionKV, ProgramKV, ProgramListKV,
         SettingKey, SettingKV, SettingValue, StatusKey, StatusKV, StatusValue } from './api-value';
import { Scope } from './api-auth-types';

// Minimum event stream interruption before treated as appliance disconnected
const EVENT_DISCONNECT_DELAY = 3 * MS;

// Delay before retrying a failed read of appliance state when connected
let readAllRetryDelay: number = 0; // (milliseconds)
const CONNECTED_RETRY_MIN_DELAY =       5 * MS;
const CONNECTED_RETRY_MAX_DELAY = 10 * 60 * MS;
const CONNECTED_RETRY_FACTOR = 2;  // (double delay on each retry)

// Blackout period for workaround implicitly setting power state
const POWERSTATE_BLACKOUT = 2 * MS;

// All key-value pairs that can be get/set or included in events
interface DeviceExtraValues {
    connected?:     boolean;
}
type DeviceExtraKey = KVKey<DeviceExtraValues>;
type DeviceKey = DeviceExtraKey | OptionKey | StatusKey | SettingKey | EventKey;
type DeviceExtraValue<Key> = KVValue<DeviceExtraValues, Key>;
type DeviceValue<Key> = DeviceExtraValue<Key> | OptionValue<Key> | StatusValue<Key> | SettingValue<Key> | EventValue<Key>;

// Any type of key-value item
type Item<KeyU extends DeviceKey = DeviceKey> = { [Key in KeyU]: {
    key:            Key;
    value:          DeviceValue<Key>;
    unit?:          string;
} }[KeyU];

// Shorthand for OperationState values
export type OperationStateKey = keyof typeof OperationState;

// Convert Options from dictionary to array format
function OptionsRecordToKV(options: OptionValues): OptionKV[] {
    const toKV = <Key extends OptionKey>(key: Key, value: OptionValue<Key>): OptionKV<Key> => ({ key, value });
    return Object.entries(options).map(([key, value]) => toKV(key as OptionKey, value));
}

// Low-level access to the Home Connect API
export class HomeConnectDevice extends EventEmitter {

    // Database of most recently reported key-value pairs
    readonly items: { [Key in DeviceKey]?: Item<Key>; } = {};

    // Stop event stream when appliance is depaired
    private stopEvents: boolean = false;

    // Avoid multiple connection status updates in same poll cycle
    private setConnectedScheduled?: ReturnType<typeof setImmediate>;

    // Treat extended event stream outage as an appliance disconnect
    private stopScheduled?: ReturnType<typeof setTimeout>;

    // Pending actions to read appliance state when (re)connected
    private readAllActions?: (() => void)[];
    private readAllScheduled?: ReturnType<typeof setTimeout>;
    private readPrograms?: boolean;

    // Create a new API object
    constructor(
        readonly log:   Logger,
        readonly api:   HomeConnectAPI,
        readonly ha:    HomeAppliance
    ) {
        super({ captureRejections: true });
        super.on('error', err => logError(this.log, 'Device event', err));

        // Initial device state
        this.setConnectedState(this.ha.connected);

        // Disable warning for more than 10 listeners on an event
        this.setMaxListeners(0);

        // Workaround appliances not reliably indicating power state
        this.inferPowerState();

        // Start streaming events
        this.processEvents();
    }

    // Stop event stream (and any other autonomous activity)
    stop(): void {
        this.stopEvents = true;
    }

    // Describe an item
    describe<Key extends DeviceKey>(item: Item<Key>): string {
        let description: string = item.key;
        if ('value' in item) {
            description += `=${item.value}`;
        }
        if (item.unit && item.unit !== 'enum') {
            description += ` ${item.unit}`;
        }
        return description;
    }

    // Update cached values and notify listeners
    update<Key extends DeviceKey>(items: Item<Key>[]): void {
        // Update cached state for all items before notifying any listeners
        for (const item of items) Object.assign(this.items, { [item.key]: item });

        // Notify listeners for each item
        for (const item of items) {
            const description = this.describe(item);
            this.log.debug(`${description} (${this.listenerCount(item.key)} listeners)`);
            try {
                this.emit(item.key, item.value);
            } catch (err) {
                logError(this.log, `Update emit ${description}`, err);
            }
        }
    }

    // Get a cached item's value
    getItem<Key extends DeviceKey>(key: Key): DeviceValue<Key> | undefined {
        return this.items[key]?.value;
    }

    // Read details about this appliance (especially its connection status)
    async getAppliance(): Promise<HomeAppliance> {
        try {
            this.requireIdentify();
            const appliance = await this.api.getAppliance(this.ha.haId);
            this.setConnectedState(appliance.connected);
            return appliance;
        } catch (err) {
            throw logError(this.log, 'GET appliance', err);
        }
    }

    // Read current status
    async getStatus(): Promise<StatusKV[]> {
        try {
            this.requireMonitor();
            const status = await this.api.getStatus(this.ha.haId);
            this.update(status);
            return status;
        } catch (err) {
            throw logError(this.log, 'GET status', err);
        }
    }

    // Read current settings
    async getSettings(): Promise<SettingKV[]> {
        try {
            this.requireSettings();
            const settings = await this.api.getSettings(this.ha.haId);
            this.update(settings);
            return settings;
        } catch (err) {
            throw logError(this.log, 'GET settings', err);
        }
    }

    // Read a single setting
    async getSetting<Key extends SettingKey>(settingKey: Key): Promise<SettingKV<Key> | null> {
        try {
            this.requireSettings();
            const setting = await this.api.getSetting(this.ha.haId, settingKey);
            this.update([setting]);
            return setting;
        } catch (err) {
            if (err instanceof APIStatusCodeError
                && (err.key === 'SDK.Error.UnsupportedSetting'
                 || err.key === 'SDK.Simulator.InternalError')) {
                // Suppress error when the setting is unsupported
                return null;
            }
            throw logError(this.log, `GET ${settingKey}`, err);
        }
    }

    // Write a single setting
    async setSetting<Key extends SettingKey>(settingKey: Key, value: SettingValue<Key>): Promise<void> {
        try {
            this.requireSettings();
            this.requireRemoteControl();
            await this.api.setSetting<Key>(this.ha.haId, settingKey, value);
            this.update([{ key: settingKey, value: value }]);
        } catch (err) {
            throw logError(this.log, `SET ${settingKey}=${value}`, err);
        }
    }

    // Read the list of all programs
    async getAllPrograms(): Promise<ProgramListKV[]> {
        try {
            this.requireMonitor();
            const programs = await this.api.getPrograms(this.ha.haId);
            if (programs.active?.key) {
                this.update([{ key: 'BSH.Common.Root.ActiveProgram',
                    value: programs.active.key }]);
                if (programs.active.options) {
                    this.update(programs.active.options);
                }
            } else if (programs.selected?.key) {
                this.update([{ key: 'BSH.Common.Root.SelectedProgram',
                    value: programs.selected.key }]);
                if (programs.selected.options) {
                    this.update(programs.selected.options);
                }
            }
            return programs.programs;
        } catch (err) {
            throw logError(this.log, 'GET programs', err);
        }
    }

    // Read the list of currently available programs
    async getAvailablePrograms(): Promise<ProgramListKV[]>  {
        try {
            this.requireMonitor();
            const programs = await this.api.getAvailablePrograms(this.ha.haId);
            if (programs.active?.key) {
                this.update([{ key: 'BSH.Common.Root.ActiveProgram',
                    value: programs.active.key }]);
                if (programs.active.options) {
                    this.update(programs.active.options);
                }
            } else if (programs.selected?.key) {
                this.update([{ key: 'BSH.Common.Root.SelectedProgram',
                    value: programs.selected.key }]);
                if (programs.selected.options) {
                    this.update(programs.selected.options);
                }
            }
            return programs.programs;
        } catch (err) {
            if (err instanceof APIStatusCodeError
                && err.key === 'SDK.Error.WrongOperationState') {
                // Suppress error when there are no available programs
                return [];
            }
            throw logError(this.log, 'GET available programs', err);
        }
    }

    // Read the options for a currently available program
    async getAvailableProgram<Key extends ProgramKey>(programKey: Key): Promise<ProgramDefinitionKV<Key>> {
        try {
            this.requireMonitor();
            const program = await this.api.getAvailableProgram(this.ha.haId,
                                                               programKey);
            return program;
        } catch (err) {
            throw logError(this.log, `GET available program ${programKey}`, err);
        }
    }

    // Read the currently selected program
    async getSelectedProgram(): Promise<ProgramKV | null> {
        try {
            this.requireMonitor();
            const program = await this.api.getSelectedProgram(this.ha.haId);
            this.update([{ key: 'BSH.Common.Root.SelectedProgram', value: program.key }]);
            if (this.isOperationState('Ready') && program.options) {
                // Only update options when no program is active
                this.update(program.options);
            }
            return program;
        } catch (err) {
            if (err instanceof APIStatusCodeError
                && err.key === 'SDK.Error.NoProgramSelected') {
                // Suppress error when there is no selected program
                return null;
            }
            throw logError(this.log, 'GET selected program', err);
        }
    }

    // Select a program
    async setSelectedProgram(programKey: ProgramKey, options: OptionValues = {}): Promise<void> {
        try {
            this.requireControl();
            this.requireRemoteControl();
            const programOptions = OptionsRecordToKV(options);
            await this.api.setSelectedProgram(this.ha.haId, programKey,
                                              programOptions);
            this.update([{ key: 'BSH.Common.Root.SelectedProgram', value: programKey }]);
            this.update(programOptions);
        } catch (err) {
            throw logError(this.log, `SET selected program ${programKey}`, err);
        }
    }

    // Read the currently active program (if any)
    async getActiveProgram(): Promise<ProgramKV | null> {
        try {
            // Only request the active program if one might be active
            if (!this.isOperationState('Inactive', 'Ready')) {
                this.requireMonitor();
                const program = await this.api.getActiveProgram(this.ha.haId);
                if (program === undefined) throw new Error('Empty response');
                this.update([{ key:   'BSH.Common.Root.ActiveProgram',
                    value: program.key }]);
                if (program.options) {
                    this.update(program.options);
                }
                return program;
            } else {
                const operationState = this.getItem('BSH.Common.Status.OperationState');
                this.log.debug(`Ignoring GET active program in ${operationState}`);
                return null;
            }
        } catch (err) {
            if (err instanceof APIStatusCodeError
                && err.key === 'SDK.Error.NoProgramActive') {
                // Suppress error when there is no active program
                return null;
            }
            throw logError(this.log, 'GET active program', err);
        }
    }

    // Start a program
    async startProgram(programKey?: ProgramKey, options: OptionValues = {}) {
        try {
            this.requireControl();
            this.requireRemoteStart();
            if (programKey === undefined) {
                // Start the selected program if none specified explicitly
                const selected = this.getItem('BSH.Common.Root.SelectedProgram');
                if (!selected) throw new Error('No program selected');
                programKey = selected;
            }
            const programOptions = OptionsRecordToKV(options);
            await this.api.setActiveProgram(this.ha.haId, programKey,
                                            programOptions);
            this.update([{ key: 'BSH.Common.Root.ActiveProgram', value: programKey }]);
            this.update(programOptions);
        } catch (err) {
            throw logError(this.log, `START active program ${programKey}`, err);
        }
    }

    // Stop a program
    async stopProgram(): Promise<void> {
        try {
            // No action required unless a program is active
            if (this.isOperationState('DelayedStart', 'Run', 'Pause', 'ActionRequired')) {
                this.requireControl();
                this.requireRemoteControl();
                await this.api.stopActiveProgram(this.ha.haId);
            } else {
                const operationState = this.getItem('BSH.Common.Status.OperationState');
                this.log.debug(`Ignoring STOP active program in ${operationState}`);
            }
        } catch (err) {
            throw logError(this.log, 'STOP active program', err);
        }
    }

    // Get a list of supported commands
    async getCommands(): Promise<CommandKV[]> {
        try {
            this.requireControl();
            const commands = await this.api.getCommands(this.ha.haId);
            return commands;
        } catch (err) {
            if (err instanceof APIStatusCodeError && err.key === '404') {
                // Suppress error when the API is not supported
                return [];
            }
            throw logError(this.log, 'GET commands', err);
        }
    }

    // Pause or resume program
    async pauseProgram(pause: boolean = true): Promise<void> {
        const command = pause ? 'BSH.Common.Command.PauseProgram'
                              : 'BSH.Common.Command.ResumeProgram';
        try {
            this.requireControl();
            this.requireRemoteControl();
            return await this.api.setCommand(this.ha.haId, command);
        } catch (err) {
            throw logError(this.log, `COMMAND ${command}`, err);
        }
    }

    // Open or partly open door
    async openDoor(fully: boolean = true): Promise<void> {
        const command = fully ? 'BSH.Common.Command.OpenDoor'
                              : 'BSH.Common.Command.PartlyOpenDoor';
        try {
            this.requireControl();
            return await this.api.setCommand(this.ha.haId, command);
        } catch (err) {
            throw logError(this.log, `COMMAND ${command}`, err);
        }
    }

    // Set a specific option of the active program
    async setActiveProgramOption<Key extends OptionKey>(optionKey: Key, value: OptionValue<Key>): Promise<void> {
        try {
            this.requireControl();
            this.requireRemoteControl();
            await this.api.setActiveProgramOption(this.ha.haId, optionKey, value);
            this.update([{ key: optionKey, value: value }]);
        } catch (err) {
            throw logError(this.log, `SET ${optionKey}=${value}`, err);
        }
    }

    // Wait for the appliance to be connected
    async waitConnected(immediate: boolean = false): Promise<void> {
        let connected = immediate && this.getItem('connected');
        while (!connected) {
            connected = await this.onceWait('connected');
        }
    }

    // Wait for the appliance to enter specific states
    waitOperationState(states: OperationStateKey[], milliseconds?: number): Promise<void> {
        // Check whether the appliance is already in the target state
        if (this.isOperationState(...states)) return Promise.resolve();

        // Otherwise wait
        let listener: (value: OperationState) => void;
        return new Promise<void>((resolve, reject) => {
            // Listen for updates to the operation state
            listener = () => {
                if (this.isOperationState(...states)) resolve();
            };
            this.on('BSH.Common.Status.OperationState', listener);

            // Wait for the specified timeout, if any
            if (milliseconds !== undefined)
                setTimeout(() => {
                    reject(new Error('Timeout waiting for OperationState'));
                }, milliseconds);
        }).finally(() => {
            // Remove the update listener
            this.off('BSH.Common.Status.OperationState', listener);
        });
    }

    // Workaround appliances not reliably indicating power state
    inferPowerState(): void {
        // Disable workaround for blackout period after power status updated
        let blackoutScheduled: ReturnType<typeof setTimeout> | undefined;
        this.on('BSH.Common.Setting.PowerState', () => {
            clearTimeout(blackoutScheduled);
            blackoutScheduled = setTimeout(() => {
                blackoutScheduled = undefined;
            }, POWERSTATE_BLACKOUT);
        });

        // Fake the power state when the operation state changes
        this.on('BSH.Common.Status.OperationState', () => {
            const powerIsOn = this.getItem('BSH.Common.Setting.PowerState') === PowerState.On;
            if (this.isOperationState('Ready', 'Run') && !powerIsOn) {
                if (blackoutScheduled) {
                    this.log.debug('Operation state implies power is on (ignored)');
                } else {
                    this.log.debug('Operation state implies power is on');
                    this.update([{ key: 'BSH.Common.Setting.PowerState', value: PowerState.On }]);
                }
            } else if (this.isOperationState('Inactive') && powerIsOn) {
                this.log.debug('Operation state implies power is standby or off');
                this.update([{ key: 'BSH.Common.Setting.PowerState', value: PowerState.Standby }]);
            }
        });
    }

    // Update whether the appliance is currently reachable
    setConnectedState(isConnected?: boolean): void {
        // Update the internal state immediately (if known)
        if (isConnected !== undefined) this.ha.connected = isConnected;
        if (isConnected === false) this.onDisconnected();

        // Only apply the most recent of multiple updates
        clearImmediate(this.setConnectedScheduled);
        this.setConnectedScheduled = setImmediate(() => {
            // Inform clients immediately when disconnected
            if (!this.ha.connected && this.getItem('connected') !== false) {
                this.update([{ key: 'connected', value: false }]);
            }

            // Read information from this appliance when it connects
            if (isConnected !== false) this.onConnected();
        });
    }

    // Refresh appliance information when it reconnects (or connection unknown)
    onConnected(): void {
        // No action required if already reading (or read) appliance state
        if (this.readAllActions) return;

        // Construct a list of pending appliance state to read
        this.readAllActions = [
            () => this.getAppliance(), // (checks connected and resets error)
            () => this.getStatus(),
            () => this.getSettings()
        ];
        if (this.readPrograms) this.readAllActions.push(
            () => this.getSelectedProgram(),
            () => this.getActiveProgram()
        );

        // Schedule the pending reads
        if (!this.readAllScheduled) {
            this.log.debug((this.ha.connected ? 'Connected' : 'Might be connected')
                           + ', so reading appliance state...');
            this.readAllScheduled = setTimeout(() => this.readAll());
        } else {
            this.log.debug('Connected, but appliance state read already pending...');
        }
    }

    // Abort refreshing appliance information when it disconnects
    onDisconnected(): void {
        if (this.readAllActions && this.readAllActions.length) {
            this.log.debug(`Appliance disconnected; abandoning ${this.readAllActions.length} pending reads`);
        }
        delete this.readAllActions;
    }

    // Attempt to read all appliance state when connected
    async readAll(): Promise<void> {
        try {
            // Attempt all pending reads
            while (this.readAllActions && this.readAllActions.length) {
                // Careful to avoid losing action if error or array replaced
                const actions = this.readAllActions;
                await actions[0]();
                actions.shift();
            }

            // Either abandoned or finished all pending reads
            delete this.readAllScheduled;
            if (this.readAllActions) {
                // Successfully read all appliance state
                this.log.debug('Successfully read all appliance state');
                readAllRetryDelay = 0;
                if (this.ha.connected && !this.getItem('connected')) {
                    this.update([{ key: 'connected', value: true }]);
                }
            } else {
                // Abandoned reading appliance state due to disconnection
                this.log.debug('Ignoring appliance state read due to disconnection');
            }
        } catch (err) {
            // Attempt to recover after an error
            if (this.ha.connected) {
                logError(this.log, 'Reading appliance state (will retry)', err);
                readAllRetryDelay =
                    readAllRetryDelay
                    ? Math.min(readAllRetryDelay * CONNECTED_RETRY_FACTOR, CONNECTED_RETRY_MAX_DELAY)
                    : CONNECTED_RETRY_MIN_DELAY;
                this.log.debug('Still connected, so retrying appliance state'
                             + ` read in ${readAllRetryDelay} seconds...`);
                this.readAllScheduled =
                    setTimeout(() => this.readAll(), readAllRetryDelay);
            } else {
                this.log.debug(`Ignoring appliance state read due to disconnection: ${err}`);
                delete this.readAllScheduled;
            }
        }
    }

    // Test whether the current OperationState is one of the specified values
    isOperationState(...states: OperationStateKey[]): boolean {
        const operationState = this.getItem('BSH.Common.Status.OperationState');
        return operationState !== undefined
            && states.map(state => OperationState[state]).includes(operationState);
    }

    // Ensure that the appliance is connected
    requireConnected(): void {
        if (!this.ha.connected)
            throw new Error('The appliance is offline');
    }

    // Ensure that IdentifyAppliance scope has been authorised
    requireIdentify(): void {
        if (!this.api.hasScope('IdentifyAppliance'))
            throw new Error('IdentifyAppliance scope has not been authorised');
    }

    // Ensure that Monitor scope has been authorised
    requireMonitor(): void {
        if (!this.hasScope('Monitor'))
            throw new Error('Monitor scope has not been authorised');
        this.requireConnected();
    }

    // Ensure that Settings scope has been authorised
    requireSettings(): void {
        if (!this.hasScope('Settings'))
            throw new Error('Settings scope has not been authorised');
        this.requireConnected();
    }

    // Ensure that Control scope has been authorised
    requireControl(): void {
        if (!this.hasScope('Control'))
            throw new Error('Control scope has not been authorised');
        this.requireConnected();
    }

    // Ensure that remote control is currently allowed
    requireRemoteControl(): void {
        if (this.getItem('BSH.Common.Status.LocalControlActive'))
            throw new Error('Appliance is being manually controlled locally');
        if (this.getItem('BSH.Common.Status.RemoteControlActive') === false)
            throw new Error('Remote control not enabled on the appliance');
    }

    // Ensure that remote start is currently allowed
    requireRemoteStart(): void {
        this.requireRemoteControl();
        if (this.getItem('BSH.Common.Status.RemoteControlStartAllowed')
            === false)
            throw new Error('Remote start not enabled on the appliance');
    }

    // Check whether a particular scope has been authorised
    hasScope(scope: Scope): boolean {
        return this.api.hasScope(scope)
            || this.api.hasScope(this.ha.type + '-' + scope);
    }

    // Enable polling of selected/active programs when connected
    pollPrograms(enable: boolean = true): void {
        this.readPrograms = enable;
    }

    // Process received events
    async processEvents(): Promise<void> {
        try {
            for await (const event of this.api.getEvents(this.ha.haId)) {
                this.eventListener(event);
                if (this.stopEvents) break;
            }
        } catch (err) {
            logError(this.log, 'Device events', err);
        }
    }

    // Process a single received event
    eventListener(event: EventKV): void {
        const itemCount = 'data' in event && event.data
                          ? ('items' in event.data ? event.data.items.length : 1) : 0;
        this.log.debug(`Event ${event.event} (${itemCount} items)`);
        switch (event.event) {
        case 'START':
            // If appliance disconnected then check its current status
            clearTimeout(this.stopScheduled);
            this.setConnectedState();
            break;
        case 'STOP':
            // Disconnect appliance if too slow re-establishing event stream
            this.stopScheduled = setTimeout(() => {
                this.log.debug('Events may have been missed;'
                             + ' treating appliance as disconnected');
                this.setConnectedState(false);
            }, event.err ? 0 : EVENT_DISCONNECT_DELAY);
            break;
        case 'PAIRED':
            // Check status if an appliance is added back to the account
            this.log.debug('Appliance restored to Home Connect account');
            this.setConnectedState();
            break;
        case 'DEPAIRED':
            // Immediately treat a removed appliance as disconnected
            this.log.debug('Appliance removed from Home Connect account;'
                         + ' treating appliance as disconnected');
            this.setConnectedState(false);
            break;
        case 'CONNECTED':
            this.log.debug('Appliance is now connected to Home Connect servers');
            this.setConnectedState(true);
            break;
        case 'DISCONNECTED':
            this.log.debug('Appliance lost connection to Home Connect servers');
            this.setConnectedState(false);
            break;
        case 'STATUS':
        case 'EVENT':
        case 'NOTIFY':
            this.update(event.data.items);
            break;
        }
    }

    // Install a handler for a device key-value event
    on<Key extends DeviceKey>(key: Key, listener: (value: DeviceValue<Key>) => void): this {
        return super.on(key, listener);
    }

    // Uninstall a handler for a device key-value event
    off<Key extends DeviceKey>(key: Key, listener: (value: DeviceValue<Key>) => void): this {
        return super.off(key, listener);
    }

    // Wait (once) for a device key-value event
    async onceWait<Key extends DeviceKey>(key: Key): Promise<DeviceValue<Key>> {
        const [value] = await once(this, key);
        return value;
    }

    // Emit an event
    emit<Key extends DeviceKey>(key: Key, value: DeviceValue<Key>): boolean {
        return super.emit(key, value);
    }
}
