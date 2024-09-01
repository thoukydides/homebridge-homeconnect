// Homebridge plugin for Home Connect home appliances
// Copyright © 2023 Alexander Thoukydides

import { Logger } from 'homebridge';

import { ServerEvent, ServerEventData, ServerPath, ServerRequest, ServerResponse } from '../server-ipc';

// Client-side IPC implementation
export class ClientIPC {

    // Create a new client IPC instance
    constructor(readonly log: Logger) {}

    // Issue a request to the server
    async request<Path extends ServerPath>(path: Path, data: ServerRequest<Path>): Promise<ServerResponse<Path>> {
        try {
            this.log.debug(`request("${path}", %O)`, data);
            const result: unknown = await window.homebridge.request(path, data);
            this.log.debug(`request("${path}", %O) =>`, data, result);
            return result as ServerResponse<Path>;
        } catch (err) {
            this.log.error(`request("${path}", %O) =>`, data, err);
            throw err;
        }
    }

    // Add an event listener
    onEvent<Event extends ServerEvent>(event: Event, callback: (evt: ServerEventData<Event>) => Promise<void> | void): void {
        window.homebridge.addEventListener(event, async (evt) => {
            try {
                const data = (evt as unknown as { data: ServerEventData<Event> }).data;
                if (event !== 'log') this.log.debug(`onEvent("${event}") => callback`, data);
                await callback(data);
            } catch (err) {
                this.log.error(`onEvent("${event}") =>`, err);
            }
        });
    }
}