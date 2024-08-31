// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2023 Alexander Thoukydides

import { Logger } from 'homebridge';

import { setImmediate as setImmediateP } from 'timers/promises';

// An operation that can be serialised
export type SerialisedValue = unknown;//object | string | number | boolean | null | undefined;
export type SerialisedOperation<Value extends SerialisedValue, Returns = void> = (value: Value) => Promise<Returns> | Returns;

// Options for a serialised operation
export interface SerialisedOptions {
    name?:      string;
    reset?:     boolean;
    verbose?:   boolean;
}

// Count of serialised operation objects
let serialisedCounter = 0;

// Coalesce and serialise operations that should run exclusively
export class Serialised<Value extends SerialisedValue, Returns = void> {

    // Operation currently in progress
    private activePromise?: Promise<Returns>;

    // Pending operation
    private pendingValue: Value;
    private pendingPromise?: Promise<Returns>;

    // Count of operations performed
    private counter = 1;

    // Initialise a serialised operation manager
    constructor(
        readonly log:           Logger,
        readonly operation:     SerialisedOperation<Value, Returns>,
        readonly defaultValue:  Value,
        readonly options:       SerialisedOptions = {}) {

        // Ensure that the operation has a name
        ++serialisedCounter;
        this.options.name ??= serialisedCounter.toString();

        // Set the initial value for the pending operation
        this.pendingValue = defaultValue;
    }

    // Trigger the operation
    trigger(value?: Value): Promise<Returns> {
        this.updatePendingValue(value);
        this.pendingPromise ??= this.startPending();
        return this.pendingPromise;
    }

    // Wait for any active operation to complete and start a new one
    async startPending(): Promise<Returns> {
        // Wait for any active operation to complete
        try {
            await this.activePromise;
        } catch { /* empty */ }
        await setImmediateP();

        // Start the pending operation and reset ready for the next
        this.activePromise = this.startActive(this.pendingValue);
        this.resetPendingValue();
        this.pendingPromise = undefined;

        // Wait for the active operation to complete
        try {
            return await this.activePromise;
        } finally {
            this.activePromise = undefined;
        }
    }

    // Start a new operation
    async startActive(value: Value): Promise<Returns> {
        const logPrefix = this.logPrefix;
        ++this.counter;
        try {
            this.logVerbose(`${logPrefix} starting: ${JSON.stringify(value)}`);
            const result = await this.operation(value);
            this.logVerbose(`${logPrefix} successful`);
            return result;
        } catch (err) {
            this.logVerbose(`${logPrefix} failed: ${err}`);
            throw err;
        }
    }

    // Merge a new value with the pending value
    updatePendingValue(value?: Value): void {
        let description: string;
        if (typeof value === 'object') {
            // Objects are merged, with new properties overwriting old ones
            const newValue = Object.assign({}, this.pendingValue, value);
            description = `${JSON.stringify(this.pendingValue)} + ${JSON.stringify(value)} = ${JSON.stringify(newValue)}`;
            this.pendingValue = newValue;
        } else if (value !== undefined) {
            // Other types just use the latest value
            description = `${value} (was ${this.pendingValue})`;
            this.pendingValue = value;
        } else {
            // No value provided so keep the existing value
            description = '(no value)';
        }
        this.logVerbose(`${this.logPrefix} coalescing: ${description}`);
    }

    // Reset the pending value
    resetPendingValue(): void {
        if (this.options.reset) {
            this.pendingValue = this.defaultValue;
        }
    }

    // Prefix for log messages
    get logPrefix(): string {
        return `Serialised request #${this.options.name}.${this.counter}`;
    }

    // Verbose logging
    logVerbose(message: string): void {
        if (this.options.verbose) this.log.debug(message);
    }
}