// Homebridge plugin for Home Connect home appliances
// Copyright © 2023 Alexander Thoukydides

import { LogLevel, Logger, PlatformConfig } from 'homebridge';
import { HomebridgePluginUiServer, RequestError } from '@homebridge/plugin-ui-utils';

import { FormSchema } from './schema';
import { ConfigPlugin } from '../config-types';
import { ClientIDStatus } from './server-clientid';
import { logError } from '../log-error';

// Client to server requests and their responses
export interface ServerRequests {
    '/log':                 { request: LogLevel;        response: string };
    '/clientid':            { request: ConfigPlugin;    response: ClientIDStatus };
    '/clientid/retry':      { request: null;            response: ClientIDStatus };
    '/config':              { request: null;            response: PlatformConfig };
    '/schema/global':       { request: null;            response: FormSchema };
    '/schema/appliance':    { request: string;          response: FormSchema };
}
export type ServerPath = keyof ServerRequests;
export type ServerRequest <Path extends ServerPath> = ServerRequests[Path]['request'];
export type ServerResponse<Path extends ServerPath> = ServerRequests[Path]['response'];
export type ServerResponseAsync<Path extends ServerPath> = Promise<ServerResponse<Path>> | ServerResponse<Path>;

// Events (from server to client)
export interface ServerEvents {
    ready:      undefined;
    log:        ServerLogMessage[];
    status:     ClientIDStatus;
}
export type ServerEvent = keyof ServerEvents;
export type ServerEventData<Event extends ServerEvent> = ServerEvents[Event];

// A log message
export interface ServerLogMessage {
    level:      LogLevel;
    message:    string;
    params:     unknown[];
}

// Server-side IPC implementation
export class ServerIPC {

    // Create a new server IPC instance
    constructor(readonly log: Logger, readonly server: HomebridgePluginUiServer) {}

    // Register a new request handler for a given route
    onRequest<Path extends ServerPath>(path: Path, fn: (data: ServerRequest<Path>) => ServerResponseAsync<Path>): void {
        this.server.onRequest(path, async (data) => {
            const prefix = `onRequest("${path}")`;
            try {
                this.log.debug(`${prefix} request`, data);
                const result = await fn(data);
                this.log.debug(`${prefix} response`, result);
                return result;
            } catch (err) {
                // All errors should be reported as RequestError to the client
                if (err instanceof RequestError) throw err;
                logError(this.log, prefix, err);
                throw new RequestError(`Unexpected ${path} error: ${err}`, { status: 500 });
            }
        });
    }

    // Push an event or stream data to the client
    pushEvent<Event extends keyof ServerEvents>(event: Event, data: ServerEventData<Event>): void {
        if (event !== 'log') this.log.debug(`pushEvent("${event}")`, data);
        this.server.pushEvent(event, data);
    }
}