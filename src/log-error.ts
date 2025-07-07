// Homebridge plugin for Home Connect home appliances
// Copyright © 2023-2025 Alexander Thoukydides

import { Logger } from 'homebridge';

import { APIError } from './api-errors.js';

// Log an error
let lastLoggedError: unknown;
export function logError<Type>(log: Logger, when: string, err: Type): Type {
    try {
        // Suppress duplicate reports
        if (lastLoggedError === err) return err;
        lastLoggedError = err;

        // Log the top-level error message
        const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
        log.error(`[${when}] ${message}`);
        const prefix = ' '.repeat(when.length + 3);

        // Log the request details for API errors
        if (err instanceof APIError) {
            log.error(`${err.request.method} ${err.request.path}`);
        }

        // Log any history of causes or sub-errors
        logSubErrors(log, prefix, err);

        // Log any stack backtrace (for the top-level error only)
        if (err instanceof Error && err.stack) log.debug(err.stack);
    } catch { /* empty */ }
    return err;
}

// Log any sub-errors (causes or aggregates) of an error, formatted as a tree
function logSubErrors(log: Logger, prefix: string, err: unknown): void {
    // Collect all aggregate or causal errors
    const subErrs: unknown[] = [];
    if (err instanceof APIError && err.errCause) subErrs.push(err.errCause);
    if (err instanceof Error && err.cause) subErrs.push(err.cause);
    if (err instanceof AggregateError && Array.isArray(err.errors)) subErrs.push(...(err.errors as unknown[]));

    // Log the collected errors formatted as a tree
    subErrs.forEach((subErr, index) => {
        const subPrefix = index < subErrs.length - 1 ? ['├─', '│ '] : ['└─', '  '];
        const message = subErr instanceof Error ? `${subErr.name}: ${subErr.message}` : String(subErr);
        log.error(`${prefix}${subPrefix[0]} ${message}`);
        logSubErrors(log, `${prefix}${subPrefix[1]} `, subErr);
    });
}