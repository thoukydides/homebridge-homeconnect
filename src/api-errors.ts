// Homebridge plugin for Home Connect home appliances
// Copyright © 2023 Alexander Thoukydides

import { STATUS_CODES } from 'http';
import { createCheckers, CheckerT, IErrorDetail } from 'ts-interface-checker';

import { ErrorResponse } from './api-types';
import { AuthorisationError } from './api-auth-types';
import { Request, Response } from './api-ua';
import { columns } from './utils';
import apiTI from './ti/api-types-ti';
import authTI from './ti/api-auth-types-ti';

// Options that can be passed to an error constructor
interface Options {
    cause?: unknown
}

// Checkers for API error responses
const apiCheckers = createCheckers(apiTI) as {
    ErrorResponse:      CheckerT<ErrorResponse>;
};
const authCheckers = createCheckers(authTI) as {
    AuthorisationError: CheckerT<AuthorisationError>;
};

// Base for reporting all Home Connect API errors
export class APIError extends Error {

    readonly errCause: unknown;

    constructor(
        readonly request:   Request,
        readonly response:  Response | undefined,
        message:            string,
        options?:           Options
    ) {
        // Standard error object initialisation
        super(message);
        Error.captureStackTrace(this, APIError);
        this.name = 'Home Connect API Error';
        if (options?.cause) this.errCause = options.cause;
    }
}

// API could not be authorised
export class APIAuthorisationError extends APIError {

    constructor(
        request:            Request,
        response:           Response | undefined,
        message:            string,
        options?:           Options
    ) {
        super(request, response, message, options);
        Error.captureStackTrace(this, APIAuthorisationError);
        this.name = 'Home Connect API Authorisation Error';
    }

}

// API returned a non-success status code
export class APIStatusCodeError extends APIError {

    constructor(
        request:            Request,
        response:           Response,
        readonly text:      string,
        options?:           Options
    ) {
        super(request, response, APIStatusCodeError.getMessage(response, text), options);
        Error.captureStackTrace(this, APIStatusCodeError);
        this.name = 'Home Connect Status Code Error';
    }

    // Construct an error message from a response
    static getMessage(response: Response, text: string): string {
        const statusCode = response.statusCode;
        const statusCodeName = STATUS_CODES[statusCode];
        const description = APIStatusCodeError.getBodyDescription(text)
                            ?? 'No error message returned';
        return `[${statusCode} ${statusCodeName}] ${description}`;
    }

    // Attempt to retrieve the error key
    get key(): string | undefined {
        return APIStatusCodeError.parseBody(this.text).key;
    }

    // Attempt to retrieve the error key
    get description(): string | undefined {
        return APIStatusCodeError.parseBody(this.text).description;
    }

    // Attempt to retrieve the error description
    get simpleMessage(): string | undefined {
        return APIStatusCodeError.getBodyDescription(this.text);
    }

    // Attempt to extract a useful description from the response body
    static getBodyDescription(text: string): string | undefined {
        const { key, description } = APIStatusCodeError.parseBody(text);
        if (key) {
            return (description ? `${description} ` : '') + `[${key}]`;
        } else {
            return text.length ? text : undefined;
        }
    }

    // Attempt to parse the response body
    static parseBody(text: string): { key?: string; description?: string } {
        try {
            const json: unknown = JSON.parse(text);
            if (apiCheckers.ErrorResponse.test(json)) {
                return {
                    key:         json.error.key,
                    description: json.error.developerMessage
                                 ?? json.error.description
                                 ?? json.error.value
                };
            } else if (authCheckers.AuthorisationError.test(json)) {
                return {
                    key:            json.error,
                    description:    json.error_description
                };
            }
        } catch { /* empty */ }
        return {};
    }
}

// API returned a response that failed checker validation
export class APIValidationError extends APIError {

    constructor(
        request:                Request,
        response:               Response,
        readonly validation:    IErrorDetail[],
        options?:               Options
    ) {
        super(request, response, APIValidationError.getMessage(validation), options);
        Error.captureStackTrace(this, APIValidationError);
        this.name = 'Home Connect API Validation Error';
    }

    // Construct an error message from a checker validation error
    static getMessage(errors: IErrorDetail[]): string {
        const description = `${errors[0].path} ${errors[0].message}`;
        return `Structure validation failed (${description})`;
    }
}

// API returned event stream that could not be parsed
export class APIEventStreamError extends APIError {

    constructor(
        request:            Request,
        response:           Response,
        message:            string,
        readonly sse:       Record<string, string>,
        options?:           Options
    ) {
        super(request, response, APIEventStreamError.getMessage(message, sse), options);
        Error.captureStackTrace(this, APIEventStreamError);
        this.name = 'Home Connect API Event Stream Error';
    }

    // Construct an error message from a checker validation error
    static getMessage(description: string, sse: Record<string, string>): string {
        const fields = Object.entries(sse).map(([name, value]: [string, string]) => [`${name}:`, value]);
        return [`Unable to parse ${description}:`, ...columns(fields)].join('\n');
    }
}
