// Homebridge plugin for Home Connect home appliances
// Copyright © 2023 Alexander Thoukydides

import { Logger, LogLevel } from 'homebridge';

import { EventEmitter } from 'events';
import { CheckerT, createCheckers } from 'ts-interface-checker';

import { Event } from './api-types';
import { APIAuthoriseUserAgent } from './api-ua-auth';
import { formatMilliseconds } from './utils';
import { logError } from './log-error';
import { APIEventStreamError, APIValidationError } from './api-errors';
import { Request, Response, SSE } from './api-ua';
import apiTI from './ti/api-types-ti';

// Checkers for API responses
const checkers = createCheckers(apiTI) as {
    Event: CheckerT<Event>;
};

// Events that may be emitted
export type APIEvent = Event | EventStart | EventStop;
export interface EventStart {
    event:  'START';
}
export interface EventStop {
    event:  'STOP';
    err?:   unknown;
}

// Home Connect API event stream
export class APIEventStream extends EventEmitter {

    // Create a new event stream object
    constructor(
        readonly log:    Logger,
        readonly ua:     APIAuthoriseUserAgent
    ) {
        super({ captureRejections: true });
        super.on('error', err => logError(this.log, 'API event', err));

        // Start an event stream when the first listener registers
        this.once('newListener', () => void this.startEventStream());
    }

    // Emit events for a single appliance or all appliances
    async startEventStream(haid?: string, eventName = 'event'): Promise<never> {
        const description = `events stream for ${haid ?? 'all appliances'}`;
        const path = haid ? `/api/homeappliances/${haid}/events`
                          : '/api/homeappliances/events';
        for (;;) {
            const startTime = Date.now();
            const elapsed = () => formatMilliseconds(Date.now() - startTime);
            try {

                // Start the event stream
                this.log.info(`Starting ${description}`);
                const { request, response, stream } = await this.ua.getStream(path);
                this.log.debug(`Started ${description} after ${elapsed()}`);
                this.emit(eventName, { event: 'START' });

                // Dispatch events as they are received
                for await (const sse of stream) {
                    const event = this.parseSSEToHomeConnect(request, response, sse);
                    this.emit(eventName, event);
                }

                // Normal end of event stream
                this.emit(eventName, { event: 'STOP' });

            } catch (err) {

                // Stream terminated due to an error
                logError(this.log, 'API event stream', err);
                this.emit(eventName, { event: 'STOP', err });

            } finally {

                // Log completion of the stream
                this.log.debug(`Terminated ${description} after ${elapsed()}`);

            }
        }
    }

    // Parse an SSE event into a Home Connect event structure
    parseSSEToHomeConnect(request: Request, response: Response, sse: SSE): Event {
        const event: Record<string, unknown> = { ...sse };

        // Attempt to parse any 'data' field as JSON
        if ('data' in sse && sse.data.length) {
            try {
                event.data = JSON.parse(sse.data);
            } catch (cause) {
                throw new APIEventStreamError(request, response, `Failed to parse JSON event data (${String(cause)})`, sse, { cause });
            }

            // Workaround for Home Connect API bug
            if (event.data && typeof event.data === 'object'
                && 'haId' in event.data && !event.id) {
                this.log.debug('Applying workaround for issue #88');
                event.id = event.data.haId;
            }
        }

        // Check that the response has the expected fields
        const checker = checkers.Event;
        checker.setReportedPath('event');
        if (!checker.test(event)) {
            const validation = checker.validate(event) ?? [];
            this.ua.logCheckerValidation(LogLevel.ERROR, 'Unexpected structure of Home Connect API event',
                                         request, validation, event);
            throw new APIValidationError(request, response, validation);
        }
        const strictValidation = checker.strictValidate(event);
        if (strictValidation) {
            this.ua.logCheckerValidation(LogLevel.WARN, 'Unexpected fields in Home Connect API event',
                                         request, strictValidation, event);
        }

        // Return the event
        return event;
    }
}