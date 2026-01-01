// Homebridge plugin for Home Connect home appliances
// Copyright © 2023-2026 Alexander Thoukydides

import { LogLevel } from 'homebridge';

import { setImmediate as setImmediateP } from 'timers/promises';

import { ServerIPC, ServerLogMessage } from './server-ipc.js';

// A logger that sends messages to the client as events
export class ServerLogger {

    // Minimum log level to send to the client
    minLevel: LogLevel = LogLevel.INFO;

    // Queue of pending log messages
    readonly queue: ServerLogMessage[] = [];

    // Wait until the client is ready before sending events
    ipcReady!: (ipc: ServerIPC) => void;
    readonly ipc: Promise<ServerIPC>;

    // Create a new logger
    constructor() {
        this.ipc = new Promise<ServerIPC>(resolve => this.ipcReady = resolve);
    }

    // Start sending log messages to the client
    sendLogEvents(ipc: ServerIPC, level: LogLevel): void {
        this.minLevel = level;
        this.ipcReady(ipc);
    }

    // Is a specified log level enabled
    isEnabled(level: LogLevel): boolean {
        const levelOrder = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
        return levelOrder.indexOf(this.minLevel) <= levelOrder.indexOf(level);
    }

    // Simple wrappers to log a message
    error  (message: string, ...params: unknown[]): void { this.log(LogLevel.ERROR,   message, ...params); }
    success(message: string, ...params: unknown[]): void { this.log(LogLevel.SUCCESS, message, ...params); }
    warn   (message: string, ...params: unknown[]): void { this.log(LogLevel.WARN,    message, ...params); }
    info   (message: string, ...params: unknown[]): void { this.log(LogLevel.INFO,    message, ...params); }
    debug  (message: string, ...params: unknown[]): void { this.log(LogLevel.DEBUG,   message, ...params); }

    // Log a message at the specified level
    log(level: LogLevel, message: string, ...params: unknown[]): void {
        // Send queued log message as an event to the client
        const send = async (): Promise<void> => {
            await setImmediateP();
            const ipc = await this.ipc;
            const messages = this.queue.filter(log => this.isEnabled(log.level));
            if (messages.length) ipc.pushEvent('log', messages);
            this.queue.length = 0;
        };
        if (!this.queue.length) send();

        // Add this message to the queue
        if (this.isEnabled(level)) this.queue.push({ level, message, params });
    }
}