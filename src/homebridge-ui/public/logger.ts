// Homebridge plugin for Home Connect home appliances
// Copyright © 2023 Alexander Thoukydides

import { LogLevel } from 'homebridge';

import { ClientIPC } from './client-ipc';
import { ServerLogMessage } from '../server-ipc';

// Prefix for client and server log messages
const PLUGIN_PREFIX = window.homebridge.plugin.displayName ?? window.homebridge.plugin.name;

// A logger that sends messages to the debugging console
export class ConsoleLogger {

    // Create a new console logger
    constructor(readonly prefix = '') {}

    // Simple wrappers to log a message
    error  (message: string, ...params: unknown[]): void { this.log(LogLevel.ERROR,   message, ...params); }
    warn   (message: string, ...params: unknown[]): void { this.log(LogLevel.WARN,    message, ...params); }
    success(message: string, ...params: unknown[]): void { this.log(LogLevel.SUCCESS, message, ...params); }
    info   (message: string, ...params: unknown[]): void { this.log(LogLevel.INFO,    message, ...params); }
    debug  (message: string, ...params: unknown[]): void { this.log(LogLevel.DEBUG,   message, ...params); }


    // Log a message at the specified level
    log(level: LogLevel, message: string, ...params: unknown[]): void {
        // Add the prefix to the message
        if (this.prefix.length) message = `[${this.prefix}] ${message}`;

        // Log the message
        switch (level) {
        case LogLevel.ERROR:   console.error  (message, ...params); break;
        case LogLevel.WARN:    console.warn   (message, ...params); break;
        case LogLevel.SUCCESS: console.info   (message, ...params); break;
        case LogLevel.INFO:    console.info   (message, ...params); break;
        case LogLevel.DEBUG:   console.debug  (message, ...params); break;
        }
    }

}

// Logger for locally generated messages
export class ClientLogger extends ConsoleLogger {

    // Create a new client logger
    constructor() {
        super(`${PLUGIN_PREFIX} client`);
    }
}

// Logger that receives messages events from the server
export class ServerLogger extends ConsoleLogger {

    // Create a new server logger
    constructor(readonly ipc: ClientIPC, minLevel: LogLevel) {
        super(`${PLUGIN_PREFIX} server`);

        // Start receiving log events
        ipc.onEvent('log', messages => this.logMessages(messages));
        try { ipc.request('/log', minLevel); } catch { /* empty */ }
    }

    // Log messages received from the server
    logMessages(messages: ServerLogMessage[]): void {
        for (const { level, message, params } of messages)
            this.log(level, message, ...params);
    }
}