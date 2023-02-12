// Homebridge plugin for Home Connect home appliances
// Copyright © 2023 Alexander Thoukydides

import { Logger } from 'homebridge';

import assert from 'assert';
import { IErrorDetail } from 'ts-interface-checker';

import { APIError } from './api-errors';

// Convert an interface to a type alias to make it indexable
export type Copy<T> = { [K in keyof T]: T[K] };

// Type assertions
export function assertIsDefined<Type>(value: Type): asserts value is NonNullable<Type> {
    assert(value !== undefined && value !== null);
}

// Wait for the next iteration of the event loop
export function immediate(): Promise<void> {
    return new Promise(resolve => setImmediate(resolve));
}

// Sleep for a specified period
export function sleep(ms: number, abort?: Promise<never>): Promise<void> {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, Math.max(ms, 0));
        if (abort) abort.catch(reason => reject(reason));
    });
}

// Log an error
let lastLoggedError: unknown;
export function logError<Type>(log: Logger, when: string, err: Type): Type {
    try {
        // Suppress duplicate reports
        if (lastLoggedError === err) return err;
        lastLoggedError = err;

        // Log the error message itself
        log.error(`[${when}] ${err}`);

        // Log the request details for API errors
        if (err instanceof APIError) {
            log.error(`${err.request.method} ${err.request.path}`);
        }

        // Log any history of causes for the error
        let cause: unknown = err;
        let prefix = ' '.repeat(when.length + 3);
        while ((cause instanceof APIError) && cause.errCause) {
            cause = cause.errCause;
            log.error(`${prefix}└─ ${cause}`);
            prefix += '   ';
        }

        // Log any stack backtrace
        if (err instanceof Error && err.stack) log.debug(err.stack);
    } catch { /* empty */ }
    return err;
}

// Format a millisecond duration
export function formatDuration(ms: number, maxParts = 2): string {
    if (ms < 1) return 'n/a';

    // Split the duration into components
    const duration: Record<string, number> = {
        day:            Math.floor(ms / (24 * 60 * 60 * 1000)),
        hour:           Math.floor(ms /      (60 * 60 * 1000)) % 24,
        minute:         Math.floor(ms /           (60 * 1000)) % 60,
        second:         Math.floor(ms /                 1000 ) % 60,
        millisecond:    Math.floor(ms                        ) % 1000
    };

    // Remove any leading zero components
    const keys = Object.keys(duration);
    while (keys.length && duration[keys[0]] === 0) keys.shift();

    // Combine the required number of remaining components
    return keys.slice(0, maxParts)
        .filter(key => duration[key] !== 0)
        .map(key => `${duration[key]} ${key}${duration[key] === 1 ? '' : 's'}`)
        .join(' ');
}

// Format strings in columns
export function columns(rows: string[][], separator = '  '): string[] {
    // Determine the required column widths
    const width: number[] = [];
    rows.forEach(row => {
        row.forEach((value, index) => {
            width[index] = Math.max(width[index] || 0, value.length);
        });
    });
    width.splice(-1, 1, 0);

    // Format the rows
    return rows.map(row => row.map((value, index) => value.padEnd(width[index])).join(separator));
}

// Convert checker validation error into lines of text
export function getValidationTree(errors: IErrorDetail[]): string[] {
    const lines: string[] = [];
    errors.forEach((error, index) => {
        const prefix = (a: string, b: string): string => index < errors.length - 1 ? a : b;
        lines.push(`${prefix('├─ ', '└─ ')}${error.path} ${error.message}`);
        if (error.nested) {
            const nested = getValidationTree(error.nested);
            lines.push(...nested.map(line => `${prefix('│  ', '   ')} ${line}`));
        }
    });
    return lines;
}