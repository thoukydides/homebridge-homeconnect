// Homebridge plugin for Home Connect home appliances
// Copyright © 2023 Alexander Thoukydides

import { Logger } from 'homebridge';

import assert from 'assert';
import { IErrorDetail } from 'ts-interface-checker';

import { APIError } from './api-errors';

// Milliseconds in a second
export const MS = 1000;

// Convert an interface to a type alias to make it indexable
export type Copy<T> = { [K in keyof T]: T[K] };

// Make properties optional
export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

// A mixin class must have a constructor with a single rest parameter of type 'any[]'.ts(2545)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Constructor<T = object> = new (...args: any[]) => T;

// Type assertions
export function assertIsDefined<Type>(value: Type): asserts value is NonNullable<Type> {
    assert(value !== undefined && value !== null);
}
export function assertIsString(value: unknown): asserts value is string {
    assert(typeof value === 'string');
}
export function assertIsNumber(value: unknown): asserts value is number {
    assert(typeof value === 'number');
}
export function assertIsBoolean(value: unknown): asserts value is boolean {
    assert(typeof value === 'boolean');
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

// Format a milliseconds duration
export function formatMilliseconds(ms: number, maxParts = 2): string {
    if (ms < 1) return 'n/a';

    // Split the duration into components
    const duration: Record<string, number> = {
        day:            Math.floor(ms / (24 * 60 * 60 * MS)),
        hour:           Math.floor(ms /      (60 * 60 * MS)) % 24,
        minute:         Math.floor(ms /           (60 * MS)) % 60,
        second:         Math.floor(ms /                 MS ) % 60,
        millisecond:    Math.floor(ms                      ) % MS
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

// Format a seconds duration
export function formatSeconds(seconds: number, maxParts = 2): string {
    return formatMilliseconds(seconds * 1000, maxParts);
}

// Format strings in columns
export function columns(rows: string[][], separator = '  '): string[] {
    // Determine the required column widths
    const width: number[] = [];
    rows.forEach(row => {
        row.forEach((value, index) => {
            width[index] = Math.max(width[index] ?? 0, value.length);
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