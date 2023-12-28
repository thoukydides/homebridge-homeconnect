// Homebridge plugin for Home Connect home appliances
// Copyright © 2023 Alexander Thoukydides

import { Logger, LogLevel } from 'homebridge';

import { LocalStorage } from 'node-persist';
import { bold, greenBright } from 'chalk';
import { CheckerT, createCheckers } from 'ts-interface-checker';
import { setTimeout as setTimeoutP } from 'timers/promises';

import { AbsoluteToken, PersistAbsoluteTokens, AuthorisationError,
         AccessTokenRefreshRequest, AccessTokenRefreshResponse,
         AccessTokenRequest, AccessTokenResponse,
         AuthorisationRequest, AuthorisationResponse,
         DeviceAccessTokenRequest, DeviceAccessTokenResponse,
         DeviceAuthorisationRequest, DeviceAuthorisationResponse } from './api-auth-types';
import { APIUserAgent, Method, Request } from './api-ua';
import { assertIsDefined, Copy, formatMilliseconds, formatSeconds, MS } from './utils';
import { logError } from './log-error';
import { APIAuthorisationError, APIError, APIStatusCodeError } from './api-errors';
import { ConfigPlugin } from './config-types';
import { API_SCOPES } from './settings';
import { AuthHelp, AuthHelpDeviceFlow, AuthHelpMessage } from './api-ua-auth-help';
import authTI from './ti/api-auth-types-ti';

// Authorisation status update
export interface AuthorisationStatusSuccess {
    state:      'busy' | 'success';
}
export interface AuthorisationStatusUser {
    state:      'user';
    uri:        string;
    code:       string;
    expires:    number | null;
}
export interface AuthorisationStatusFailed {
    state:      'fail';
    retryable:  boolean;
    error:      unknown;
    message:    string;
    help?:      AuthHelpMessage;
}
export type AuthorisationStatus =
    AuthorisationStatusSuccess | AuthorisationStatusUser | AuthorisationStatusFailed;

// Checkers for API responses
const checkers = createCheckers(authTI);
const checkersT = checkers as {
    AuthorisationResponse:  CheckerT<AuthorisationResponse>;
    AuthorisationError:     CheckerT<AuthorisationError>;
    AbsoluteToken:          CheckerT<AbsoluteToken>;
    PersistAbsoluteTokens:  CheckerT<PersistAbsoluteTokens>;
};

// An authorisation abort and retry trigger
export class AuthorisationRetry {
    constructor(readonly reason: string) {}
}

// Authorisation for accessing the Home Connect API
export class APIAuthoriseUserAgent extends APIUserAgent {

    // Time before token expiry to request a refresh
    private readonly refreshWindow =  60 * 60 * MS;

    // Delay between retrying failed authorisation operations
    private readonly refreshRetryDelay =    6 * MS;
    private readonly pollPersistDelay =     3 * MS;

    // Device Flow polling (normally set by API response) and prompt logging
    private deviceFlowPollInterval =        5 * MS;
    private deviceFlowLogInterval =        12 * MS;

    // Promise that is resolved by successful authorisation (or token refresh)
    private isAuthorised:               Promise<void>;

    // Triggers indicating that it may be worth reattempting authorisation
    private readonly triggerAuthorisationRetry: Promise<AuthorisationRetry>[] = [];
    private triggerDeviceFlow?:         (reason: AuthorisationRetry) => void;
    private pollDeviceCode?:            string;

    // Abort signal used to abandon token refreshing
    private triggerTokenRefresh?:       () => void;

    // The current authorisation status
    private status!:                    AuthorisationStatus;
    private statusUpdate!:              Promise<void>;
    private triggerStatusUpdate?:       () => void;

    // The current access and refresh token
    private token?: AbsoluteToken;

    // Create a new authorisation agent
    constructor(
        log:                Logger,
        config:             ConfigPlugin,
        readonly persist:   LocalStorage,
        language:           string
    ) {
        super(log, config, language);
        this.isAuthorised = this.authoriseUserAgent();
        this.maintainAccessToken();
    }

    // Scopes that have (or will be) authorised
    get scopes(): string[] {
        return this.token?.scopes ?? API_SCOPES;
    }

    // Attempt to obtain an access token
    async authoriseUserAgent(): Promise<void> {
        while (!this.token) {
            try {
                this.log.info('Attempting authorisation');
                this.setAuthorisationStatus({ state: 'busy' });
                await this.obtainAccessToken();
            } catch (err) {
                if (err instanceof AuthorisationRetry) {
                    this.log.info(`Restarting authorisation: ${err.reason}`);
                } else {
                    logError(this.log, 'API authorisation', err);
                    this.setAuthorisationStatusFailed(err);
                    this.log.error('Authorisation attempt abandoned; restart Homebridge to try again');
                    await Promise.race(this.triggerAuthorisationRetry);
                }
            }
        }
        this.log.info('Successfully authorised');
        this.setAuthorisationStatus({ state: 'success' });
    }

    // Maintain the access token with periodic refreshes
    async maintainAccessToken(): Promise<never> {
        // Wait until an access token has been obtained
        await this.isAuthorised;
        assertIsDefined(this.token);

        // Periodically refresh the access token
        for (;;) {
            // Wait until the token is due to expire, unless a failure occurs
            const refreshNow = new Promise<void>(resolve => {
                this.triggerTokenRefresh = () => {
                    this.log.warn('Triggering early token refresh');
                    this.triggerTokenRefresh = undefined;
                    resolve();
                };
            });
            const expiresIn = this.token.accessExpires - Date.now();
            await Promise.race([setTimeoutP(expiresIn - this.refreshWindow), refreshNow]);

            // Refresh the token
            this.log.info('Refreshing access token');
            this.isAuthorised = this.refreshAccessToken();
            await this.isAuthorised;
            this.log.info('Successfully refreshed access token');
        }
    }

    // Single attempt to obtain an access token
    async obtainAccessToken(): Promise<void> {
        this.triggerAuthorisationRetry.length = 0;

        // Retrieve any saved authorisation
        let savedToken: AbsoluteToken | undefined;
        try {
            savedToken = await this.getSavedToken();
            if (Date.now() + this.refreshWindow < savedToken.accessExpires) {
                this.log.info('Using saved access token');
                this.token = savedToken;
            } else {
                this.log.info('Saved access token has expired');
                const token = await this.accessTokenRefreshRequest(savedToken.refreshToken);
                this.log.info('Successfully refreshed access token');
                this.saveToken(token);
            }
        } catch (err) {
            this.log.info(`Unable to use saved API authorisation (${err})`);
            this.triggerAuthorisationRetry.push(this.watchToken(savedToken));

            // Attempt new authorisation
            let token: AccessTokenResponse | DeviceAccessTokenResponse;
            if (this.config.simulator) {
                this.log.info('Requesting authorisation using Code Grant Flow');
                token = await this.authorisationCodeGrantFlow();
            } else {
                try {
                    this.log.info('Requesting authorisation using the Device Flow');
                    const promise = new Promise<AuthorisationRetry>(resolve => this.triggerDeviceFlow = resolve);
                    this.triggerAuthorisationRetry.push(promise);
                    token = await this.deviceFlow();
                } catch (err) {
                    const help = new AuthHelpDeviceFlow(err, this.config.clientid);
                    help.log(this.log);
                    this.setAuthorisationStatusFailed(err, true, help);
                    throw err;
                }
            }
            this.saveToken(token);
        }
    }

    // Refresh the access token
    async refreshAccessToken(): Promise<void> {
        assertIsDefined(this.token);
        for (;;) {
            try {
                const token = await this.accessTokenRefreshRequest(this.token.refreshToken);
                this.saveToken(token);
                return;
            } catch (cause) {
                logError(this.log, 'API token refresh', cause);
                await setTimeoutP(this.refreshRetryDelay);
            }
        }
    }

    // Attempt to retrieve a saved token
    async getSavedToken(): Promise<AbsoluteToken> {
        // Attempt to retrieve the appropriate token
        const savedTokens = await this.loadTokens();
        const token = savedTokens[this.config.clientid];
        if (!token) throw Error('No saved authorisation for this client');

        // Notify any interested parties that authorisation is not required
        return token;
    }

    // Wait for any update to a saved token
    async watchToken(oldToken?: AbsoluteToken): Promise<AuthorisationRetry> {
        let token: AbsoluteToken | undefined;
        while (!token || token.accessToken === oldToken?.accessToken) {
            await setTimeoutP(this.pollPersistDelay);
            try { token = await this.getSavedToken(); } catch { /* empty */ }
        }
        return new AuthorisationRetry('Saved token changed');
    }

    // Apply and save a new access token
    async saveToken(newToken: AccessTokenResponse | DeviceAccessTokenResponse | AccessTokenRefreshResponse) {
        this.log.debug(`Refresh token ${newToken.refresh_token}`);
        this.log.debug(`Access token  ${newToken.access_token}`
                   + ` (expires in ${formatSeconds(newToken.expires_in)})`);

        // Convert the token to storage format, with an absolute expiry time
        this.token = {
            refreshToken:   newToken.refresh_token,
            accessToken:    newToken.access_token,
            accessExpires:  Date.now() + newToken.expires_in * MS,
            scopes:         newToken.scope.split(' ')
        };

        // Read any previously saved tokens
        let savedTokens: PersistAbsoluteTokens = {};
        try {
            savedTokens = await this.loadTokens();
        } catch (err) {
            this.log.debug(`Failed to load saved authorisation tokens: ${err}`);
        }

        // Replace (or add) the token for the current client
        savedTokens[this.config.clientid] = this.token;
        await this.persist.setItem('token', savedTokens);
        this.log.debug('Authorisation token saved');
    }

    // Retrieve saved tokens
    async loadTokens(): Promise<PersistAbsoluteTokens> {
        const savedTokens = await this.persist.getItem('token');
        if (!savedTokens) throw Error('No saved authorisation data found');
        if (!checkersT.PersistAbsoluteTokens.test(savedTokens)) {
            throw Error('Incompatible saved authorisation data');
        }
        return savedTokens;
    }

    // Authorisation Code Grant Flow for simulator only
    async authorisationCodeGrantFlow(): Promise<AccessTokenResponse> {
        // Obtain the authorisation code without user interaction
        const { code, redirect_uri } = await this.authorisationRequest();

        // Exchange the authorisation code for an access token
        this.log.debug(`Using authorisation code ${code} and redirect ${redirect_uri} to request token`);
        return await this.accessTokenRequest(code, redirect_uri);
    }

    // Device Flow
    async deviceFlow(): Promise<DeviceAccessTokenResponse> {
        // Obtain verification URI, using defaults for any missing parameters
        const response = await this.deviceAuthorisationRequest();
        if (response.interval) this.deviceFlowPollInterval = response.interval * MS;

        // Provide the verification URI to any other interested party
        const expires = response.expires_in ? Date.now() + response.expires_in * MS : null;
        this.setAuthorisationStatus({
            state: 'user',
            uri:    response.verification_uri_complete ?? response.verification_uri,
            code:   response.user_code,
            expires
        });

        // Display the verification URI in the log file
        let displayPrompts = true;
        const logPrompt = async () => {
            while (displayPrompts) {
                const expiry = expires ? ` within ${formatMilliseconds(expires - Date.now())}` : '';
                this.log.info(greenBright(`Please authorise access to your appliances${expiry}`
                                          + ' using the associated Home Connect or SingleKey ID'
                                          + ' email address by visiting:'));
                this.log.info(response.verification_uri_complete
                    ? greenBright(`    ${bold(response.verification_uri_complete)}`)
                    : greenBright(`    ${bold(response.verification_uri)} and enter code ${bold(response.user_code)}`));
                await setTimeoutP(this.deviceFlowLogInterval);
            }
        };

        // Wait for the user to authorise access (or expiry of device code)
        this.log.debug('Waiting for completion of Home Connect authorisation'
                     + ` (poll every ${formatMilliseconds(this.deviceFlowPollInterval)},`
                     + (response.expires_in ? ` expires in ${formatSeconds(response.expires_in)},` : '')
                     + ` device code ${response.device_code})...`);
        try {
            logPrompt();
            this.pollDeviceCode = response.device_code;
            const token = await Promise.race([this.deviceAccessTokenRequest(response.device_code),
                                              ...this.triggerAuthorisationRetry]);
            if (token instanceof AuthorisationRetry) throw token;
            return token;
        } finally {
            this.pollDeviceCode = undefined;
            displayPrompts = false;
        }
    }

    // Trigger a retry of Device Flow authorisation
    retryDeviceFlow(reason: string = 'User requested retry'): void {
        this.triggerDeviceFlow?.(new AuthorisationRetry(reason));
    }

    // Update the authorisation status with an error
    setAuthorisationStatusFailed(err: unknown, retryable: boolean = false, help?: AuthHelp): void {
        // Ignore duplicates with the same error object and retry requests
        if (this.status.state === 'fail' && this.status.error === err) return;
        if (err instanceof AuthorisationRetry) return;

        // Log the error
        const status: AuthorisationStatusFailed = { state: 'fail', error: err, message: `${err}`, retryable };
        if (help) status.help = help.getStructured();
        this.setAuthorisationStatus(status);
    }

    // Update the authorisation status
    setAuthorisationStatus(status: AuthorisationStatus): void {
        this.status = status;
        this.triggerStatusUpdate?.();
        this.statusUpdate = new Promise(resolve => this.triggerStatusUpdate = resolve);
    }

    // Get authorisation status updates
    async getAuthorisationStatus(immediate: boolean = false): Promise<AuthorisationStatus> {
        if (!immediate) await this.statusUpdate;
        return this.status;
    }

    // Authorisation Code Grant Flow: Automatic authorisation for simulator only
    async authorisationRequest(): Promise<AuthorisationResponse & { redirect_uri: string }> {
        const requestURL = this.authorisationRequestURL();
        requestURL.searchParams.append('user', 'me'); // (anything non-zero length works)
        const redirectURL = await this.getRedirect(requestURL.pathname + requestURL.search);

        // Parse the redirect location
        const response = this.parseAuthorisationResponse(redirectURL);

        // Remove the code from the redirect URL
        redirectURL.searchParams.delete('code');
        const redirect_uri = redirectURL.href;
        return { ...response, redirect_uri };
    }

    // Authorisation Code Grant Flow: Generate URL to open in a browser
    authorisationRequestURL(redirect_uri?: string): URL {
        const query: AuthorisationRequest = { ...{
            client_id:      this.config.clientid,
            response_type:  'code',
            scope:          API_SCOPES.join(' ')
        }};
        if (redirect_uri) query.redirect_uri = redirect_uri;
        const url = new URL('/security/oauth/authorize', this.url);
        const searchParams = query as unknown as Record<string, string>;
        url.search = new URLSearchParams(searchParams).toString();
        return url;
    }

    // Authorisation Code Grant Flow: Parse redirect_uri providing a code
    parseAuthorisationResponse(url: URL | string): AuthorisationResponse {
        // Extract the query parameters from the URL
        if (typeof url === 'string') url = new URL(url, this.url);
        const response = Object.fromEntries(url.searchParams);

        // First check whether this is an error response
        const request: Request = {
            method:     'GET',
            path:       url.pathname + url.search,
            headers:    {}
        };
        if (checkersT.AuthorisationError.test(response)) {
            throw new APIAuthorisationError(request, undefined,
                                            `Home Connect API Redirect Error: ${response.error_description} [${response.error}]`);
        }

        // Check that the query parameters have the expected values
        const checker = checkersT.AuthorisationResponse;
        checker.setReportedPath('redirect_uri');
        if (!checker.test(response)) {
            const validation = checker.validate(response) ?? [];
            this.logCheckerValidation(LogLevel.ERROR, 'Unexpected structure of Home Connect API redirect_uri',
                                      undefined, validation, response);
            throw new APIAuthorisationError(request, undefined, 'Validation of redirect_uri failed');
        }
        const strictValidation = checker.strictValidate(response);
        if (strictValidation) {
            this.logCheckerValidation(LogLevel.WARN, 'Unexpected name-value pairs in Home Connect API redirect_uri',
                                      undefined, strictValidation, response);
        }

        // Return the parsed response
        return response;
    }

    // Authorisation Code Grant Flow: Exchange code for an access token
    accessTokenRequest(code: string, redirect_uri?: string): Promise<AccessTokenResponse> {
        const postForm: Copy<AccessTokenRequest> = {
            client_id:      this.config.clientid,
            grant_type:     'authorization_code',
            code
        };
        if (this.config.clientsecret) postForm.client_secret = this.config.clientsecret;
        if (redirect_uri) postForm.redirect_uri = redirect_uri;
        return this.post<AccessTokenResponse>(
            checkers.AccessTokenResponse, '/security/oauth/token', postForm);
    }

    // Device Flow: Request a URL that the user can use to authorise this device
    deviceAuthorisationRequest(): Promise<DeviceAuthorisationResponse> {
        const postForm: Copy<DeviceAuthorisationRequest> = {
            client_id:  this.config.clientid,
            scope:      API_SCOPES.join(' ')
        };
        return this.post<DeviceAuthorisationResponse>(
            checkers.DeviceAuthorisationResponse, '/security/oauth/device_authorization', postForm);
    }

    // Device Flow: Wait for user authorisation to obtain an access token
    deviceAccessTokenRequest(device_code: string): Promise<DeviceAccessTokenResponse> {
        const postForm: Copy<DeviceAccessTokenRequest> = {
            client_id:      this.config.clientid,
            grant_type:     'device_code',
            device_code
        };
        if (this.config.clientsecret) postForm.client_secret = this.config.clientsecret;
        return this.post<DeviceAccessTokenResponse>(
            checkers.DeviceAccessTokenResponse, '/security/oauth/token', postForm);
    }

    // Refresh an access token
    accessTokenRefreshRequest(refresh_token: string): Promise<AccessTokenRefreshResponse> {
        const postForm: Copy<AccessTokenRefreshRequest> = {
            grant_type:     'refresh_token',
            refresh_token
        };
        if (this.config.clientsecret) postForm.client_secret = this.config.clientsecret;
        return this.post<AccessTokenRefreshResponse>(
            checkers.AccessTokenRefreshResponse, '/security/oauth/token', postForm);
    }

    // Construct an Authorisation header
    get authorizationHeader(): string | undefined {
        return this.token && `Bearer ${this.token.accessToken}`;
    }

    // Add an Authorisation header to request options
    async prepareRequest(method: Method, path: string, options?: Partial<Request>): Promise<Request> {
        const request = await super.prepareRequest(method, path, options);

        // Wait for client to be authorised, unless this is an authorisation request
        if (!path.startsWith('/security/oauth/')) {
            try {
                // Wait for authorisation and then set the Authorisation header
                await this.isAuthorised;
                assertIsDefined(this.authorizationHeader);
                request.headers.authorization = this.authorizationHeader;
            } catch (err) {
                if (!(err instanceof APIError)) throw err;
                const cause = err.errCause;
                throw new APIAuthorisationError(err.request, err.response, err.message, { cause });
            }
        }

        // Return the modified request options
        return request;
    }

    // Restart authorisation if a request indicated an invalid token
    canRetry(err: unknown): boolean {
        // Authorisation issues take priority over other failure cases
        if (err instanceof APIStatusCodeError && err.response) {
            switch (err.response.statusCode) {
            case 400:
                if (err.key === 'authorization_pending'
                    && this.pollDeviceCode && err.request.body?.includes(this.pollDeviceCode)) {
                    // Device Flow user interaction steps not completed
                    this.retryDelay = this.deviceFlowPollInterval;
                    return true;
                }
                break;
            case 401:
                // Access token is probably missing/malformed/expired/revoked
                if (err.request.headers.authorization === this.authorizationHeader) {
                    this.triggerTokenRefresh?.();
                }
                break;
            }
        }

        // Apply standard checks for retrying the request
        return super.canRetry(err);
    }
}
