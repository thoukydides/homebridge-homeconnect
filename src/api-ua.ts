// Homebridge plugin for Home Connect home appliances
// Copyright © 2023 Alexander Thoukydides

import { Logger, LogLevel } from 'homebridge';

import { STATUS_CODES, IncomingHttpHeaders } from 'http';
import { Client, Dispatcher } from 'undici';
import { Checker, IErrorDetail } from 'ts-interface-checker';
import querystring, { ParsedUrlQueryInput } from 'node:querystring';
import { setTimeout as setTimeoutP } from 'timers/promises';

import { PLUGIN_NAME, PLUGIN_VERSION } from './settings.js';
import { APIError, APIStatusCodeError, APIValidationError } from './api-errors.js';
import { assertIsDefined, assertIsString, columns, formatMilliseconds, getValidationTree, MS } from './utils.js';
import { ConfigPlugin } from './config-types.js';

export type Method     = Dispatcher.HttpMethod;
export type Headers    = IncomingHttpHeaders;
export type Response   = Dispatcher.ResponseData;

// Simplified version of Dispatcher.DispatchOptions
export interface Request {
    method:             Method;
    path:               string;
    headers:            Headers;
    body?:              string;
    idempotent?:        boolean;
}

// A generic Server-Sent Event (not restricted to standard field names)
export type SSE = Record<string, string>;

// User agent for accessing the Home Connect API
export class APIUserAgent {
    // Home Connect API host
    readonly url: string;

    // Default timeout applied to most requests
    private readonly requestTimeout =     20 * MS;

    // Timeout applied to event stream, must be > 55 second keep-alive
    private readonly streamTimeout =  2 * 60 * MS;

    // Default headers to include in all requests
    private readonly defaultHeaders: Headers;

    // Number of requests that have been issued
    private requestCount = 0;

    // The earliest time (milliseconds since epoch) that a request can be issued
    private earliestRetry = 0;

    // Create a new user agent
    constructor(
        readonly log:       Logger,
        readonly config:    ConfigPlugin,
        readonly language:  string
    ) {
        this.url = this.config.simulator ? 'https://simulator.home-connect.com'
                 : this.config.china     ? 'https://api.home-connect.cn' : 'https://api.home-connect.com';
        this.defaultHeaders = {
            'user-agent':       `${PLUGIN_NAME}/${PLUGIN_VERSION}`,
            'accept-language':  this.language
        };
    }

    // GET request, expecting a JSON response
    async get<Type>(checker: Checker, path: string): Promise<Type> {
        const { request, response } = await this.request('GET', path, {
            headers: { accept: 'application/vnd.bsh.sdk.v1+json' }
        });
        return this.getJSONResponse(checker, request, response);
    }

    // GET request, returning stream lines as an async generator
    async getStream(path: string): Promise<{
        request:    Request;
        response:   Response;
        stream:     AsyncGenerator<SSE, void, void>;
    }> {
        const { request, response } = await this.request('GET', path, {
            headers:    { accept: 'text/event-stream' }
        });
        const stream = this.getSSEResponse(request, response);
        return { request, response, stream };
    }

    // GET request, expecting a redirection URL
    async getRedirect(path: string): Promise<URL> {
        const { request, response } = await this.request('GET', path);
        return this.getRedirectResponse(request, response);
    }

    // PUT request with JSON body
    async put(path: string, body: object): Promise<void> {
        const { request, response } = await this.request('PUT', path, {
            headers:    { 'content-type': 'application/vnd.bsh.sdk.v1+json' },
            body:       JSON.stringify(body)
        });
        return this.getEmptyResponse(request, response);

    }

    // Post request with form body, expecting a JSON response
    async post<Type>(checker: Checker, path: string, form: ParsedUrlQueryInput): Promise<Type> {
        const { request, response } = await this.request('POST', path, {
            headers:    {
                'content-type': 'application/x-www-form-urlencoded',
                'accept':       'application/json'
            },
            body:       querystring.stringify(form)
        });
        return this.getJSONResponse(checker, request, response);
    }

    // DELETE request, no body in request or response
    async delete(path: string): Promise<void> {
        const { request, response } = await this.request('DELETE', path);
        return this.getEmptyResponse(request, response);
    }

    // Check that the response is empty
    async getEmptyResponse(request: Request, response: Response): Promise<void> {
        const contentLength = Number(response.headers['content-length']);
        if (contentLength)
            throw new APIError(request, response, `Unexpected non-empty response (${contentLength} bytes)`);
        return Promise.resolve();
    }

    // Retrieve a JSON response and validate it against the expected type
    async getJSONResponse<Type>(checker: Checker, request: Request, response: Response): Promise<Type> {
        // Check that a JSON response was returned
        if (response.statusCode === 204)
            throw new APIError(request, response, 'Unexpected empty response (status code 204 No Content)');
        const contentType = response.headers['content-type'];
        if (typeof contentType !== 'string'
            || !['application/json', 'application/vnd.bsh.sdk.v1+json'].includes(contentType.replace(/;.*$/, ''))) {
            const contentTypeValue = JSON.stringify(contentType);
            throw new APIError(request, response, `Unexpected response content-type (${contentTypeValue})`);
        }

        // Retrieve and parse the response as JSON
        let json: unknown;
        try {
            const text = await response.body.text();
            this.logBody('Response', text);
            json = JSON.parse(text);
        } catch (cause) {
            throw new APIError(request, response, `Failed to parse JSON response (${String(cause)})`, { cause });
        }

        // Check that the response has the expected fields
        checker.setReportedPath('response');
        const validation = checker.validate(json);
        if (validation) {
            this.logCheckerValidation(LogLevel.ERROR, 'Unexpected structure of Home Connect API response',
                                      request, validation, json);
            throw new APIValidationError(request, response, validation);
        }
        const strictValidation = checker.strictValidate(json);
        if (strictValidation) {
            this.logCheckerValidation(LogLevel.WARN, 'Unexpected fields in Home Connect API response',
                                      request, strictValidation, json);
        }

        // Return the result
        return json as Type;
    }

    // Retrieve a redirection URL from a response
    async getRedirectResponse(request: Request, response: Response): Promise<URL> {
        // Check that the response provides a redirection URL
        if (response.statusCode !== 302 || !response.headers.location) {
            const text = await response.body.text();
            this.logBody('Redirect', text);
            throw new APIStatusCodeError(request, response, text);
        }

        // Parse the redirection URL
        try {
            const location = response.headers.location;
            if (typeof location !== 'string') throw new Error('Missing "location" header in redirect');
            return new URL(location);
        } catch (cause) {
            const locationValue = JSON.stringify(response.headers.location);
            throw new APIError(request, response, `Failed to parse redirect location ${locationValue}`, { cause });
        }
    }

    // Retrieve a response as Server-Sent Events (SSE)
    async* getSSEResponse(request: Request, response: Response): AsyncGenerator<SSE, void, void> {
        try {
            // Read the stream as strings
            const body = response.body;
            body.setEncoding('utf-8');

            body.on('end', () => {
                this.log.warn('EVENT STREAM END');
            });
            body.on('error', err => {
                const message = err instanceof Error ? err.message : String(err);
                this.log.warn(`EVENT STREAM ERROR: ${message}`);
            });

            // Parse chunks of the stream as events
            let sse: SSE = {};
            for await (const chunk of body) {
                assertIsString(chunk);
                this.logBody('Stream', chunk);
                for (const line of chunk.split(/\r?\n/)) {
                    if (!line.length) {
                        // A blank line indicates the end of an event
                        if (Object.keys(sse).length) {
                            yield sse;
                            sse = {};
                        }
                    } else if (line.startsWith(':')) {
                        // Comment
                        this.log.debug(`API event stream comment "${line}"`);
                    } else {
                        // Field, optionally with value
                        const matches = /^(\w+): ?(.*)$/.exec(line);
                        const [name, value] = matches ? matches.slice(1, 3) : [line, ''];
                        assertIsDefined(name);
                        assertIsDefined(value);
                        sse[name] = name in sse ? `${sse[name]}\n${value}` : value;
                    }
                }
            }
        } catch (cause) {
            throw new APIError(request, response, 'SSE stream terminated', { cause });
        }
    }

    // Construct and issue a request, retrying if appropriate
    async request(method: Method, path: string, options?: Partial<Request>):
    Promise<{ request: Request; response: Response }> {
        // Request counters
        let requestCount: number | undefined;
        let retryCount = 0;

        for (;;) {
            try {
                // Apply rate limiting
                const retryDelay = this.retryDelay;
                if (0 < retryDelay) {
                    this.log.log(retryDelay < 10 * MS ? LogLevel.DEBUG : LogLevel.WARN,
                                 `Waiting ${formatMilliseconds(retryDelay)} before issuing Home Connect API request`);
                    await setTimeoutP(retryDelay);
                }

                // Attempt the request
                const request = await this.prepareRequest(method, path, options);
                requestCount ??= ++this.requestCount;
                const counter = `${requestCount}` + (retryCount ? `.${retryCount}` : '');
                const logPrefix = `Home Connect request #${counter}:`;
                const response = await this.requestCore(logPrefix, request);
                return { request, response };
            } catch (err) {
                // Request failed, so check whether it can be retried
                if (!this.canRetry(err)) throw err;
                ++retryCount;
            }
        }
    }

    // Construct a Request
    async prepareRequest(method: Method, path: string, options?: Partial<Request>): Promise<Request> {
        return Promise.resolve({
            idempotent: ['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS', 'TRACE'].includes(method),
            ...options,
            method,
            path,
            headers:    {...this.defaultHeaders, ...options?.headers}
        });
    }

    // Decide whether a request can be retried following an error
    canRetry(err: unknown): boolean {
        // Do not retry the request unless the failure was an API error
        if (!(err instanceof APIError)) return false;

        // Update any rate limit
        if (err instanceof APIStatusCodeError
            && err.response?.statusCode === 429
            && err.response.headers['retry-after']) {
            this.retryDelay = Number(err.response.headers['retry-after']) * MS;
        }

        // Some status codes are never retried
        const noRetryStatusCodes = [400, 403, 404, 405, 406, 409, 415];
        if (err instanceof APIStatusCodeError && err.response
            && noRetryStatusCodes.includes(err.response.statusCode)) {
            this.log.debug(`Request will not be retried (status code ${err.response.statusCode})`);
            return false;
        }

        // Only retry methods that are idempotent
        if (!err.request.idempotent) {
            this.log.debug(`Request will not be retried (${err.request.method} is not idempotent)`);
            return false;
        }

        // The request can be retried
        return true;
    }

    // Set or get the delay between retries
    get retryDelay(): number   { return this.earliestRetry - Date.now(); }
    set retryDelay(ms: number) { this.earliestRetry = Math.max(this.earliestRetry, Date.now() + ms); }

    // Issue a generic request
    async requestCore(logPrefix: string, request: Request): Promise<Response> {
        const startTime = Date.now();
        let status = 'OK';
        try {

            // Attempt to issue the request
            let response;
            try {
                // Log details of the request
                this.log.debug(`${logPrefix} ${request.method} ${request.path}`);
                this.logHeaders(`${logPrefix} Request`, request.headers);
                this.logBody(`${logPrefix} Request`, request.body);

                // Create a new client and issue the request
                const client = new Client(this.url, {
                    bodyTimeout:        this.streamTimeout,
                    headersTimeout:     this.streamTimeout,
                    keepAliveTimeout:   this.streamTimeout,
                    connect: {
                        timeout:        this.requestTimeout
                    }
                });
                response = await client.request(request);

                // Log the response
                this.logHeaders(`${logPrefix} Response`, response.headers);
            } catch (cause) {
                const message = cause instanceof Error ? cause.message : String(cause);
                status = `ERROR: ${message}`;
                throw new APIError(request, undefined, status, { cause });
            }

            // Check whether the request was successful
            const statusCode = response.statusCode;
            status = `${statusCode} ${STATUS_CODES[statusCode]}`;
            if (statusCode === 302) {
                // Don't throw an error for 302 Found
            } else if (statusCode < 200 || 300 <= statusCode) {
                const text = await response.body.text();
                this.logBody(`${logPrefix} Response`, text);
                const err = new APIStatusCodeError(request, response, text);
                if (err.simpleMessage) status += ` - ${err.simpleMessage}`;
                throw err;
            }

            // Success, so return the response
            return response;

        } finally {

            // Log completion of the request
            this.log.debug(`${logPrefix} ${status} +${Date.now() - startTime}ms`);

        }
    }

    // Log request or response headers
    logHeaders(name: string, headers: Headers): void {
        if (!this.config.debug?.includes('Log API Headers')) return;
        const rows: string[][] = [];
        for (const key of Object.keys(headers).sort()) {
            const values = headers[key];
            if (typeof values === 'string') rows.push([`${key}:`, values]);
            else if (Array.isArray(values)) {
                for (const value of values) rows.push([`${key}:`, value]);
            }
        }
        this.log.debug(`${name} headers:`);
        for (const line of columns(rows)) this.log.debug(`    ${line}`);
    }

    // Log request or response body
    logBody(name: string, body: unknown): void {
        if (!this.config.debug?.includes('Log API Bodies')) return;
        if (typeof body !== 'string') return;
        if (body.length) {
            this.log.debug(`${name} body:`);
            for (const line of body.split('\n')) this.log.debug(`    ${line}`);
        } else {
            this.log.debug(`${name} body: EMPTY`);
        }
    }

    // Log checker validation errors
    logCheckerValidation(level: LogLevel, message: string, request: Request | undefined,
                         errors: IErrorDetail[], json: unknown): void {
        this.log.log(level, `${message}:`);
        if (request) this.log.log(level, `${request.method} ${request.path}`);
        const validationLines = getValidationTree(errors);
        for (const line of validationLines) this.log.log(level, line);
        this.log.debug('Received response (reformatted):');
        const jsonLines = JSON.stringify(json, null, 4).split('\n');
        for (const line of jsonLines) this.log.debug(`    ${line}`);
    }
}
