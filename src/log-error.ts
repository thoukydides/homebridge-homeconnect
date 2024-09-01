// Homebridge plugin for Home Connect home appliances
// Copyright © 2023 Alexander Thoukydides

import { Logger } from 'homebridge';

import { APIError } from './api-errors';

// Log an error
let lastLoggedError: unknown;
export function logError<Type>(log: Logger, when: string, err: Type): Type {
    try {
        // Suppress duplicate reports
        if (lastLoggedError === err) return err;
        lastLoggedError = err;

        // Log the error message itself
        log.error(`[${when}] ${String(err)}`);

        // Log the request details for API errors
        if (err instanceof APIError) {
            log.error(`${err.request.method} ${err.request.path}`);
        }

        // Log any history of causes for the error
        let cause: unknown = err;
        let prefix = ' '.repeat(when.length + 3);
        while ((cause instanceof APIError) && cause.errCause) {
            cause = cause.errCause;
            log.error(`${prefix}└─ ${String(cause)}`);
            prefix += '   ';
        }

        // Log any stack backtrace
        if (err instanceof Error && err.stack) log.debug(err.stack);
    } catch { /* empty */ }
    return err;
}