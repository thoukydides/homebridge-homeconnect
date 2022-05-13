// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2022 Alexander Thoukydides

'use strict';

const EventEmitter = require('events');
const finished = require('stream/promises').finished;
const undici = require('undici');
const fetch = undici.fetch;
const FormData = require('undici').FormData;

// User-Agent header
const NAME       = require('../package.json').name;
const VERSION    = require('../package.json').version;
const USER_AGENT = NAME + '/' + VERSION;

// URLs for the Home Connect API
const URL_LIVE = 'https://api.home-connect.com';
const URL_SIMULATOR = 'https://simulator.home-connect.com';

// Scopes to request; an additional Partner Agreement is required for:
//   FridgeFreezer-Images
const SCOPES = ['IdentifyAppliance', 'Monitor', 'Settings', 'Control'];

// Expanded help text for problems with the Client ID
const CLIENT_HELP_PREFIX1 = 'Unable to authorise Home Connect application; ';
const CLIENT_HELP_PREFIX2 = '. Visit https://developer.home-connect.com/applications to ';
const CLIENT_HELP_EXTRA = {
    'request rejected by client authorization authority (developer portal)':
        'register an application and then copy its Client ID.',
    'client not authorized for this oauth flow (grant_type)':
        "register a new application, ensuring that the 'OAuth Flow' is set to 'Device Flow' (this setting cannot be changed after the application has been created).",
    'client has no redirect URI defined':
        "edit the application (or register a new one) to set a 'Success Redirect' web page address.",
    'client has limited user list - user not assigned to client':
        "edit the application (or register a new one) to set the 'Home Connect User Account for Testing' to match the one being authorised."
};

// Interval between authorisation retries
const AUTH_RETRY_DELAY    = 60; // (seconds)
const REFRESH_RETRY_DELAY = 5;  // (seconds)

// Time before expiry of access token to request refresh
const TOKEN_REFRESH_WINDOW = 60 * 60; // (seconds)

// Request timeouts (affects both connection and reads)
const REQUEST_TIMEOUT = 20; // (seconds)
const EVENT_TIMEOUT   = 2 * 60; // (seconds, must be > 55 second keep-alive)

const MS = 1000;
                  
// Low-level access to the Home Connect API
module.exports = class HomeConnectAPI extends EventEmitter {

    // Create a new API object
    constructor(options) {
        super();
        
        // Store the options, applying defaults for missing options
        this.clientID  = options.clientID;
        this.simulator = options.simulator || false;
        this.savedAuth = options.savedAuth || {};
        this.language  = options.language  || 'en-GB';

        // Logging
        this.logRaw = options.log;
        this.requestCount = 0;

        // Select the appropriate API and scopes
        this.url    = this.simulator ? URL_SIMULATOR : URL_LIVE;
        this.scopes = SCOPES;

        // Pending promises
        this.authResolve = [];
        this.sleepReject = {};
        this.streamAbort = {};

        // Rate limiting
        this.earliestRetry = Date.now();

        // Obtain and maintain an access token
        this.authoriseClient();

        // Start event stream for all appliances
        this.getEvents();
    }

    // Get a list of paired home appliances
    async getAppliances() {
        let data = await this.requestAppliances('GET');
        return data && data.homeappliances;
    }

    // Get details of a specific paired home appliances
    getAppliance(haid) {
       return this.requestAppliances('GET', haid);
    }

    // Get all programs
    async getPrograms(haid) {
        let data = await this.requestAppliances('GET', haid, '/programs');
        return data && data.programs;
    }

    // Get a list of the available programs
    async getAvailablePrograms(haid) {
        let data = await this.requestAppliances('GET', haid,
                                                '/programs/available');
        return data && data.programs;
    }

    // Get the details of a specific available programs
    getAvailableProgram(haid, programKey) {
        return this.requestAppliances('GET', haid,
                                      '/programs/available/' + programKey);
    }

    // Get the program which is currently being executed
    getActiveProgram(haid) {
        return this.requestAppliances('GET', haid, '/programs/active');
    }

    // Start a specified program
    setActiveProgram(haid, programKey, options = []) {
        return this.requestAppliances('PUT', haid, '/programs/active', {
            data: {
                key:      programKey,
                options:  options
            }
        });
    }

    // Stop the active program
    stopActiveProgram(haid) {
        return this.requestAppliances('DELETE', haid, '/programs/active');
    }

    // Get all options of the active program
    async getActiveProgramOptions(haid) {
        let data = await this.requestAppliances('GET', haid,
                                                '/programs/active/options');
        return data && data.options;
    }

    // Set all options of the active program
    setActiveProgramOptions(haid, options) {
        return this.requestAppliances('PUT', haid, '/programs/active/options', {
            data: {
                options: options
            }
        });
    }

    // Get a specific option of the active program
    getActiveProgramOption(haid, optionKey) {
        return this.requestAppliances('GET', haid,
                                      '/programs/active/options/' + optionKey);
    }

    // Set a specific option of the active program
    setActiveProgramOption(haid, optionKey, value) {
        return this.requestAppliances('PUT', haid,
                                      '/programs/active/options/' + optionKey, {
            data: {
                key:    optionKey,
                value:  value
            }
        });
    }

    // Get the program which is currently selected
    getSelectedProgram(haid) {
        return this.requestAppliances('GET', haid, '/programs/selected');
    }

    // Select a program
    setSelectedProgram(haid, programKey, options) {
        return this.requestAppliances('PUT', haid, '/programs/selected', {
            data: {
                key:      programKey,
                options:  options
            }
        });
    }

    // Get all options of the selected program
    async getSelectedProgramOptions(haid) {
        let data = await this.requestAppliances('GET', haid,
                                                '/programs/selected/options');
        return data && data.options;
    }

    // Set all options of the selected program
    setSelectedProgramOptions(haid, options) {
        return this.requestAppliances('PUT', haid,
                                      '/programs/selected/options', {
            data: {
                options: options
            }
        });
    }

    // Get a specific option of the selecgted program
    getSelectedProgramOption(haid, optionKey) {
        return this.requestAppliances('GET', haid,
                                      '/programs/selected/options/'
                                      + optionKey);
    }

    // Set a specific option of the selected program
    setSelectedProgramOption(haid, optionKey, value) {
        return this.requestAppliances('PUT', haid,
                                      '/programs/selected/options/'
                                      + optionKey, {
            data: {
                key:    optionKey,
                value:  value
            }
        });
    }

    // Get the current status
    async getStatus(haid) {
        let data = await this.requestAppliances('GET', haid, '/status');
        return data && data.status;
    }

    // Get a specific status
    getStatusSpecific(haid, statusKey) {
        return this.requestAppliances('GET', haid, '/status/' + statusKey);
    }

    // Get all settings
    async getSettings(haid) {
        let data = await this.requestAppliances('GET', haid, '/settings');
        return data && data.settings;
    }

    // Get a specific setting
    getSetting(haid, settingKey) {
        return this.requestAppliances('GET', haid, '/settings/' + settingKey);
    }

    // Set a specific setting
    setSetting(haid, settingKey, value) {
        return this.requestAppliances('PUT', haid, '/settings/' + settingKey, {
            data: {
                key:    settingKey,
                value:  value
            }
        });
    }

    // Get a list of supported commands
    async getCommands(haid) {
        let data = await this.requestAppliances('GET', haid, '/commands');
        return data && data.commands;
    }

    // Issue a command
    setCommand(haid, commandKey, value = true) {
        return this.requestAppliances('PUT', haid, '/commands/' + commandKey, {
            data: {
                key:    commandKey,
                value:  value
            }
        });
    }
    
    // Obtain and maintain an access token
    async authoriseClient() {
        while (true) {
            try {
                
                // authorise this client if there is no saved authorisation
                if (!this.savedAuth[this.clientID]) {
                    let token = await (this.simulator
                                       ? this.authCodeGrantFlow()
                                       : this.authDeviceFlow());
                    this.tokenSave(token);
                } else if (this.savedAuth[this.clientID].scopes) {
                    this.scopes = this.savedAuth[this.clientID].scopes;
                }

                // Refresh the access token before it expires
                while (true) {

                    // Check the validity of the current access token
                    let auth = this.savedAuth[this.clientID];
                    let refreshIn = auth.accessExpires - Date.now()
                                    - TOKEN_REFRESH_WINDOW * MS;
                    if (auth.accessToken && 0 < refreshIn) {
                        
                        // Resolve any promises awaiting authorisation
                        for (let resolve of this.authResolve) resolve();
                        this.authResolve = [];
                    
                        // Delay before refreshing the access token
                        this.debug('Refreshing access token in '
                                   + Math.floor(refreshIn / MS) + ' seconds');
                        await this.sleep(refreshIn, 'refresh');
                    }

                    // Refresh the access token
                    let token = await this.tokenRefresh(auth.refreshToken);
                    this.tokenSave(token);
                }
                
            } catch (err) {
                
                // Discard any access token and report the error
                this.tokenInvalidate();
                this.error(err.message);

                // Delay before retrying authorisation
                let retryIn = this.savedAuth[this.clientID]
                              ? REFRESH_RETRY_DELAY : AUTH_RETRY_DELAY;
                this.warn('Retrying client authentication in ' + retryIn
                          + ' seconds');
                await this.sleep(retryIn * MS);
            }
        }
    }

    // Wait until an access token has been obtained
    waitUntilAuthorised() {
        // Resolve immediately if already authorised, otherwise add to queue
        let auth = this.savedAuth[this.clientID];
        if (auth && auth.accessToken && Date.now() < auth.accessExpires) {
            return Promise.resolve();
        } else {
            return new Promise(resolve => this.authResolve.push(resolve));
        }
    }

    // Obtain the current access token (or throw an error if not authorised)
    getAuthorisation() {
        let token = this.savedAuth[this.clientID].accessToken;
        if (!token) throw new Error('Home Connect client is not authorised');
        return 'Bearer ' + token;
    }

    // Check whether a particular scope has been authorised
    hasScope(scope) {
        // Check for the specific scope requested
        if (this.scopes.includes(scope)) return true;

        // Check for row or column scopes that include the requested scope
        let parsedScope = /^([^-]+)-([^-]+)$/.exec(scope);
        if (parsedScope) {
            let [, row, column] = parsedScope;
            if (this.scopes.includes(row)) return true;
            if (this.scopes.includes(column)) return true;
        }

        // Scope has not been authorised
        return false;
    }

    // A new access token has been obtained
    tokenSave(token) {
        let truncate =
            s => s.substring(0, 4) + '...' + s.substring(s.length - 8)
                 + ' (' + s.length + ' characters)';
        this.debug('Refresh token ' + truncate(token.refresh_token));
        this.debug('Access token  ' + truncate(token.access_token)
                   + ' (expires after ' + token.expires_in + ' seconds)');

        // Save the refresh and access tokens, plus the authenticated scopes
        this.savedAuth[this.clientID] = {
            refreshToken:   token.refresh_token,
            accessToken:    token.access_token,
            accessExpires:  Date.now() + token.expires_in * MS,
            scopes:         this.scopes
        };
        this.emit('auth_save', this.savedAuth);
    }

    // Device authorisation flow (used for the live server)
    async authDeviceFlow() {
        // Obtain verification URI
        this.log('Requesting Home Connect authorisation using the Device Flow');
        let resp = await this.requestRaw({
            method:  'POST',
            url:     this.url + '/security/oauth/device_authorization',
            json:    true,
            form:    {
                client_id:  this.clientID,
                scope:      this.scopes.join(' ')
            }
        });
        this.emit('auth_uri', resp.verification_uri_complete);
        this.debug('Waiting for completion of Home Connect authorisation'
                   + ' (poll every ' + resp.interval + ' seconds,'
                   + ' device code ' + resp.device_code + ' expires'
                   + ' after ' + resp.expires_in + ' seconds)...');

        // Wait for the user to authorise access (or expiry of device code)
        let token;
        while (!token)
        {
            // Wait for the specified poll interval
            await this.sleep(resp.interval * MS);

            // Poll for a device access token (returns null while auth pending)
            token = await this.requestRaw({
                method:  'POST',
                url:     this.url + '/security/oauth/token',
                json:    true,
                form:    {
                    client_id:      this.clientID,
                    grant_type:     'device_code',
                    device_code:    resp.device_code
                }
            });
        }

        // Return the access token
        return token;
    }
    
    // Authorisation code grant flow (used for the simulator)
    async authCodeGrantFlow() {
        // Request authorisation, skipping the user interaction steps
        this.log('Attempting to short-circuit authorisation Code Grant Flow '
                 + 'for the Home Connect appliance simulator');
        let location = await this.requestRaw({
            method:         'GET',
            url:            this.url + '/security/oauth/authorize',
            followRedirect: false,
            qs:             {
                client_id:      this.clientID,
                response_type:  'code',
                scope:          this.scopes.join(' '),
                user:           'me' // (can be anything non-zero length)
            },
        });

        // Extract the authorisation code from the redirection URL
        let redirect = new URL(location);
        let code = redirect.searchParams.get('code');
        redirect.searchParams.delete('code');
        this.debug('Using authorisation code ' + code + ' and redirect '
                   + redirect + ' to request token');

        // Convert the authorisation code into an access token
        let token = await this.requestRaw({
            method:  'POST',
            url:     this.url + '/security/oauth/token',
            json:    true,
            form:    {
                client_id:      this.clientID,
                grant_type:     'authorization_code',
                redirect_uri:   redirect.href,
                code:           code
            }
        });

        // Return the access token
        return token;
    }

    // Refresh the access token
    async tokenRefresh(refreshToken) {
        // Request a refresh of the access token
        this.log('Refreshing Home Connect access token');
        let token = await this.requestRaw({
            method:  'POST',
            url:     this.url + '/security/oauth/token',
            json:    true,
            form:    {
                grant_type:     'refresh_token',
                refresh_token:  refreshToken
            }
        });

        // Request returns null if authorisation is pending (shouldn't happen)
        if (!token) throw new Error('authorisation pending');

        // Return the refreshed access token
        return token;
    }

    // Invalidate saved authentication data if server indicates it is invalid
    authInvalidate() {
        delete this.savedAuth[this.clientID];
        this.wake('refresh', new Error('Client authentication invalidated'));
    }

    // Invalidate the current access token if server indicates it is invalid
    tokenInvalidate() {
        let auth = this.savedAuth[this.clientID];
        if (auth) delete auth.accessToken;
        this.wake('refresh', new Error('Access token invalidated'));
    }

    // Delay before issuing another request if the server indicates rate limit
    retryAfter(delaySeconds) {
        let earliest = Date.now() + delaySeconds * MS;
        if (this.earliestRetry < earliest) {
            this.earliestRetry = earliest;
        }
    }

    // Issue a normal home appliances API request
    async requestAppliances(method, haid, path, body) {
        // Construct request (excluding authorisation header which may change)
        let options = {
            method:  method,
            url:     this.url + '/api/homeappliances',
            timeout: REQUEST_TIMEOUT * MS,
            json:    true,
            headers: {
                'user-agent':       USER_AGENT,
                accept:             'application/vnd.bsh.sdk.v1+json',
                'content-type':     'application/vnd.bsh.sdk.v1+json',
                'accept-language':  this.language
            }
        };
        if (haid) options.url += '/' + haid + (path || '');
        if (body) options.body = body;

        // Implement retries
        while (true) {

            // Apply rate limiting
            let retryIn = this.earliestRetry - Date.now();
            if (0 < retryIn) {
                this.warn('Waiting ' + Math.floor(retryIn / MS)
                          + ' seconds before issuing Home Connect API request');
                await this.sleep(retryIn);
            }
        
            // Try issuing the request
            try {
                
                options.headers['authorization'] = this.getAuthorisation();
                let body = await this.requestRaw(options);
                return body && body.data;
                
            } catch (err) {

                // Re-throw the error if the request cannot be retried
                if (!err.retry) throw err;

            }
        }
    }

    // Issue a raw Home Connect request
    async requestRaw(options) {
        
        // Log the request
        let logPrefix = 'Home Connect request #' + ++this.requestCount + ': ';
        this.debug(logPrefix + options.method + ' ' + options.url);
        let startTime = Date.now();

        // Issue the request
        let status = 'OK';
        try {
            
            // Construct the fetch request
            let init = {
                method:     options.method,
                headers:    options.headers || {}
            };
            let url = options.url;
            if (options.qs) {
                // Add query string to the URL
                let params = new URLSearchParams();
                Object.entries(options.qs).forEach(([key, value]) => {
                    params.append(key, value);
                });
                url += '?' + params;
            }
            if (options.body) {
                init.body = options.json ? JSON.stringify(options.body)
                                                 : options.body;
            } else if (options.form) {
                // POST form as application/x-www-form-urlencoded
                init.headers['content-type'] = 'application/x-www-form-urlencoded';
                init.body = new URLSearchParams();
                Object.entries(options.form).forEach(([key, value]) => {
                    init.body.append(key, value);
                });
            }
            if (options.timeout) {
                init.signal = AbortSignal.timeout(options.timeout);
            }

            // Attempt the request
            let response = await fetch(url, init);
            if (!options.followRedirect && response.redirected) {
                status = 'Redirect ' + response.url;
                return response.url;
            }
            let text = await response.text();
            let json;
            if (options.json && text.length) json = this.parseJSON(text);
            if (response.ok) {
                if (options.json) {
                    if (json === null) {
                        throw new Error('Response not JSON: ' + text);
                    }
                    return json;
                } else return text;
            }

            // Status codes returned by the server have special handling
            status = response.status;
            if (response.statusText.length) {
                status += ' - ' + response.statusText;
            }
            let retry = false;

            // Inspect any response returned by the server
            if (json && json.error_description) {

                // Authorisation (OAuth) error response
                status = json.error_description + ' [' + json.error + ']';

                // Special handling for some authorisation errors
                switch (json.error) {
                case 'authorization_pending':
                    // User has not yet completed the user interaction steps
                    status = 'Authorisation pending';
                    return null;
                    break;
                        
                case 'access_denied':
                    if (json.error_description == 'Too many requests') {
                        // Token refresh rate limit exceeded
                        status = 'Token refresh rate limit exceeded'
                               + ' (only 100 refreshes are allowed per day)';
                        retry = true;
                        break;
                    }
                    // fallthrough
                case 'invalid_grant':
                case 'expired_token':
                    // Refresh token not valid; restart whole authorisation
                    this.authInvalidate();
                    break;
                        
                case 'unauthorized_client':
                    // There is a problem with the client
                    this.authInvalidate();
                    status = CLIENT_HELP_PREFIX1 + json.error_description;
                    let extra = CLIENT_HELP_EXTRA[json.error_description];
                    if (extra) status += CLIENT_HELP_PREFIX2 + extra;
                    break;
                }
                    
            } else if (json && json.error && json.error.key) {

                // Normal Home Connect API error format
                status = (json.error.developerMessage
                          || json.error.description
                          || json.error.value)
                       + ' [' + json.error.key + ']';

                // Special handling for some API errors
                switch (json.error.key) {
                case 'invalid_token':
                    // Problem with the access token
                    this.tokenInvalidate();
                    break;

                case '429':
                    // Rate limit exceeded (wait Retry-After header seconds)
                    let delay = response.headers.get('retry-after');
                    this.retryAfter(delay);
                    retry = true;
                    break;
                }
            }

            // Throw a status code error unless handled above
            throw Object.assign(new Error(status), {
                name:       'StatusCodeError',
                statusCode: response.status,
                response:   json,
                options:    options,
                retry:      retry
            });

        } catch (err) {

            status = err.message;
            if (err.cause && err.cause.message) {
                status += ' (' + err.cause.message + ')';
            }
            err.message = 'Home Connect API error: ' + status;
            throw err;
            
        } finally {

            // Log completion of the request
            this.debug(logPrefix + status
                       + ' +' + (Date.now() - startTime) + 'ms ');
            
        }
    }

    // Maintain an events stream for all appliances
    getEvents() {
        // Listen for event listeners that resemble haId values
        const haidRegex = /^(\w+-\w+-[0-9A-F]{12}|\d{18})$/;
        this.eventListeners = new Set();
        this.on('newListener', (event, listener) => {
            if (!haidRegex.test(event)) return;

            // Start an event stream when the first listener registers
            if (!this.eventListeners.size) this.getEventsRaw();
            this.eventListeners.add(event);
        });
    }

    // Get events stream for a single appliance or all appliances
    async getEventsRaw(haid) {
        // Construct request (excluding authorisation header which may change)
        let options = {
            method:     'GET',
            url:        this.url + '/api/homeappliances/'
                        + (haid ? haid + '/events' : 'events'),
            timeout:    EVENT_TIMEOUT * MS,
            encoding:   'utf8',
            json:       true,
            headers: {
                'user-agent':       USER_AGENT,
                accept:             'text/event-stream',
                'accept-language':  this.language
            }
        };

        // Dispatch a received event
        let dispatch = event => {
            // Ignore keep-alive events
            if (event.event == 'KEEP-ALIVE') return;

            // Choose the destination for this event
            let eventListeners = event.id ? [event.id]
                                 : (haid ? [haid] : this.eventListeners);

            // Notify all of the listeners
            for (let haid of eventListeners) this.emit(haid, event);
        }

        // Automatically restart the event stream
        let description = 'events stream for ' + (haid || 'all appliances');
        while (true) {
            try {
                // Wait until authorised
                await this.waitUntilAuthorised();

                // Apply rate limiting
                let retryIn = this.earliestRetry - Date.now();
                if (0 < retryIn) {
                    this.warn('Waiting ' + Math.floor(retryIn / MS)
                              + ' seconds before requesting ' + description);
                    await this.sleep(retryIn);
                }
                
                // Start the event stream
                this.log('Starting ' + description);
                options.headers['authorization'] = this.getAuthorisation();
                let controller = new AbortController();
                options.signal = controller.signal;
                let stream = await this.requestStream(options);
                this.debug('Started ' + description);
                dispatch({ event: 'START' });

                // Process received events until the stream terminates
                let state = {
                    dispatch:       dispatch,
                    controller:     controller,
                    event:          {},
                    debugHistory:   []
                };
                stream.on('data', chunk => this.eventChunk(state, chunk));
                await finished(stream);

                // Event stream closed
                this.debug('Terminated ' + description + ' without error');
                dispatch({ event: 'STOP' });
            } catch (err) {
                this.error('Terminated ' + description + ': ' + err.message);
                dispatch({ event: 'STOP', err: err });
            }
        }
    }

    // Process a chunk of event stream data
    eventChunk(state, chunk) {
        // Process each received line
        chunk.split(/\r?\n/).forEach(line => {
            // Maintain a recent history in case problems are detected
            state.debugHistory.push(line);
            if (20 < state.debugHistory.length) state.debugHistory.shift();
            let garbage = desc => {
                this.debug("Unable to parse " + desc + " '" + line + "':\n"
                           + state.debugHistory.join('\n'));
                state.debugHistory = [];
                state.controller.abort();
            }

            // Parse an event
            if (!line.length) {
                // A blank line indicates the end of an event
                if (Object.keys(state.event).length) {
                    let data = state.event.data;
                    if (data) {
                        if (data.haId && !state.event.id) state.event.id = data.haId;
                        if (!data.items) delete state.event.data;
                    }
                    state.dispatch(state.event);
                }
                state.event = {};
            } else if (/^:/.test(line)) {
                // Server-sent events comment
                this.debug("Event comment '" + line + "'");
            } else {
                // More information about the event
                let data = /^(\w+):\s*(.*)$/.exec(line);
                if (!data) return garbage('event');
                let key = data[1], value = data[2];
                if (key == 'data' && value.length) {
                    value = this.parseJSON(value);
                    if (value === null) return garbage('event data');
                }
                state.event[key] = value;
            }
        });
    }

    // Issue a raw Home Connect request in streaming mode
    async requestStream(options) {

        // Log the request
        let logPrefix = 'Home Connect request #' + ++this.requestCount + ': ';
        this.debug(logPrefix + options.method + ' ' + options.url);
        let startTime = Date.now();

        // Issue the request
        let status = 'OK';
        try {

            // Create a new HTTP client for this event stream
            let url = new URL(options.url);
            let client = new undici.Client(url.origin, {
                timeout:          options.timeout,
                headersTimeout:   options.timeout,
                bodyTimeout:      options.timeout,
                keepAliveTimeout: options.timeout
            });

            // Attempt to start the event stream
            let response = await client.request({
                method:           options.method,
                path:             url.pathname,
                headers:          options.headers,
                signal:           options.signal
            });
            if (200 <= response.statusCode && response.statusCode <= 299) {
                let body = response.body;
                body.setEncoding('utf-8');
                body.on('end',   () => {
                    client.close()
                    this.debug(logPrefix + 'END'
                               + ' +' + (Date.now() - startTime) + 'ms ');
                });
                body.on('error', err => {
                    client.close();
                    this.debug(logPrefix + err.message
                               + ' +' + (Date.now() - startTime) + 'ms ');
                });
                return body;
            }

            // Attempt to extract a useful error message
            let json = this.parseJSON(await response.body.text());
            console.debug(json);
            let status = response.statusCode;
            let retry = false;

            // Inspect any error response returned by the server
            if (json && json.error && json.error.key) {

                // Normal Home Connect API error format
                status = (json.error.developerMessage
                          || json.error.description
                          || json.error.value)
                       + ' [' + json.error.key + ']';

                // Special handling for some API errors
                switch (json.error.key) {
                case '401':
                case 'invalid_token':
                    // Problem with the access token
                    this.tokenInvalidate();
                    break;

                case '429':
                    // Rate limit exceeded (wait Retry-After header seconds)
                    let delay = response.headers['retry-after'];
                    this.retryAfter(delay);
                    retry = true;
                    break;
                }
            }

            // Throw a status code error unless handled above
            throw new Error(status, {
                name:       'StatusCodeError',
                statusCode: response.statusCode,
                response:   json,
                options:    options,
                retry:      retry
            });

        } catch (err) {

            status = err.message;
            if (err.cause && err.cause.message) {
                status += ' (' + err.cause.message + ')';
            }
            err.message = 'Home Connect API error: ' + status;
            throw err;

        } finally {

            // Log completion of the request
            this.debug(logPrefix + status
                       + ' +' + (Date.now() - startTime) + 'ms ');

        }
    }

    // Attempt to parse JSON, returning null instead of an error for failure
    parseJSON(text) {
        try {
            return JSON.parse(text);
        } catch (err) {
            return null;
        }
    }

    // Sleep for a specified number of milliseconds
    sleep(milliseconds, id) {
        return new Promise((resolve, reject) => {
            if (id) this.sleepReject[id] = reject;
            setTimeout(resolve, milliseconds);
        });
    }

    // Cancel a previous sleep with an error
    wake(id, err) {
        let reject = this.sleepReject[id];
        if (reject) reject(err || new Error('Sleep aborted'));
    }

    // Logging
    error(msg)  { this.logRaw ? this.logRaw.error(msg) : console.error(msg); }
    warn(msg)   { this.logRaw ? this.logRaw.warn(msg)  : console.warn(msg);  }
    log(msg)    { this.logRaw ? this.logRaw.info(msg)  : console.log(msg);   }
    debug(msg)  { this.logRaw ? this.logRaw.debug(msg) : console.debug(msg); }
}
