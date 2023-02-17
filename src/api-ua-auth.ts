// Homebridge plugin for Home Connect home appliances
// Copyright © 2023 Alexander Thoukydides

import { Logger, LogLevel } from 'homebridge';

import { LocalStorage } from 'node-persist';
import { bold, greenBright } from 'chalk';
import { CheckerT, createCheckers } from 'ts-interface-checker';

import { AbsoluteToken, PersistAbsoluteTokens, AuthorisationError,
         AccessTokenRefreshRequest, AccessTokenRefreshResponse,
         AccessTokenRequest, AccessTokenResponse,
         AuthorisationRequest, AuthorisationResponse,
         DeviceAccessTokenRequest, DeviceAccessTokenResponse,
         DeviceAuthorisationRequest, DeviceAuthorisationResponse } from './api-auth-types';
import { APIUserAgent, Method, Request } from './api-ua';
import { assertIsDefined, Copy, formatDuration, logError, sleep } from './utils';
import { APIAuthorisationError, APIError, APIStatusCodeError } from './api-errors';
import { Config } from './config-types';
import { API_SCOPES } from './settings';
import { deviceFlowHelp } from './api-ua-auth-help';
import authTI from './ti/api-auth-types-ti';

// URL that the user should use to authorise this client
export interface AuthorisationURI {
    uri:        string;
    code?:      string;
    expires?:   number;
}

// Checkers for API responses
const checkers = createCheckers(authTI);
const checkersT = checkers as {
    AuthorisationResponse:  CheckerT<AuthorisationResponse>;
    AuthorisationError:     CheckerT<AuthorisationError>;
    AbsoluteToken:          CheckerT<AbsoluteToken>;
    PersistAbsoluteTokens:  CheckerT<PersistAbsoluteTokens>;
};

// Authorisation for accessing the Home Connect API
export class APIAuthoriseUserAgent extends APIUserAgent {

    // Time before token expiry to request a refresh
    private readonly refreshWindow =  60 * 60 * 1000; // (milliseconds)

    // Delay between retrying failed authorisation operations
    private readonly refreshRetryDelay =    6 * 1000; // (milliseconds)
    private readonly pollPersistDelay =     3 * 1000; // (milliseconds)

    // Device Flow polling (normally set by API response) and prompt logging
    private deviceFlowPollInterval =        5 * 1000; // (milliseconds)
    private deviceFlowLogInterval =        12 * 1000; // (milliseconds)

    // Promise that is resolved by successful authorisation (or token refresh)
    private isAuthorised!:          Promise<void>;

    // Triggers indicating that it may be worth reattempting authorisation
    private readonly triggerAuthorisationRetry: Promise<void>[] = [];
    private triggerDeviceFlow?:     () => void;

    // Abort signal used to abandon token refreshing
    private triggerTokenRefresh?:   () => void;

    // Provide URL that the user should use to authorise this client
    private authorisationURI!:          Promise<AuthorisationURI | null>;
    private resolveAuthorisationURI?:   (uri: AuthorisationURI | null) => void;

    // The current access and refresh token
    private token?: AbsoluteToken;

    // Create a new authorisation agent
    constructor(
        log:                Logger,
        config:             Config,
        readonly persist:   LocalStorage,
        language:           string
    ) {
        super(log, config, language);
        this.authoriseUserAgent();
    }

    // Scopes that have (or will be) authorised
    get scopes(): string[] {
        return this.token?.scopes ?? API_SCOPES;
    }

    // Authorise the user agent
    async authoriseUserAgent(): Promise<never> {
        // Attempt to obtain an access token
        this.setAuthorisationURI();
        while (!this.token) {
            try {
                this.log.info('Attempting authorisation');
                this.isAuthorised = this.obtainAccessToken();
                await this.isAuthorised;
                this.log.info('Successfully authorised');
            } catch (err) {
                logError(this.log, 'API authorisation', err);
                this.setAuthorisationURI();
                this.log.error('Authorisation attempt abandoned; restart Homebridge to try again');
                await Promise.race(this.triggerAuthorisationRetry);
            }
        }
        this.setAuthorisationURI(null);

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
            await Promise.race([sleep(expiresIn - this.refreshWindow), refreshNow]);

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
                    token = await this.deviceFlow();
                } catch (err) {
                    deviceFlowHelp(this.log, err, this.config.clientid);
                    const promise = new Promise<void>(resolve => this.triggerDeviceFlow = resolve);
                    this.triggerAuthorisationRetry.push(promise);
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
                await sleep(this.refreshRetryDelay);
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
    async watchToken(oldToken?: AbsoluteToken): Promise<void> {
        let token: AbsoluteToken | undefined;
        while (!token || token.accessToken === oldToken?.accessToken) {
            await sleep(this.pollPersistDelay);
            try { token = await this.getSavedToken(); } catch { /* empty */ }
        }
    }

    // Apply and save a new access token
    async saveToken(newToken: AccessTokenResponse | DeviceAccessTokenResponse | AccessTokenRefreshResponse) {
        this.log.debug(`Refresh token ${newToken.refresh_token}`);
        this.log.debug(`Access token  ${newToken.access_token}`
                   + ` (expires in ${formatDuration(newToken.expires_in * 1000)})`);

        // Convert the token to storage format, with an absolute expiry time
        this.token = {
            refreshToken:   newToken.refresh_token,
            accessToken:    newToken.access_token,
            accessExpires:  Date.now() + newToken.expires_in * 1000,
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
        if (response.interval) this.deviceFlowPollInterval = response.interval * 1000;

        // Provide the verification URI to any other interested party
        const uri: AuthorisationURI = response.verification_uri_complete
            ? { uri: response.verification_uri_complete }
            : { uri: response.verification_uri, code: response.user_code };
        if (response.expires_in) uri.expires = Date.now() + response.expires_in * 1000;
        this.setAuthorisationURI(uri);

        // Display the verification URI in the log file
        let displayPrompts = true;
        const logPrompt = async () => {
            while (displayPrompts) {
                const expiry = uri.expires ? ` within ${formatDuration(uri.expires - Date.now())}` : '';
                this.log.info(greenBright(`Please authorise access to your appliances${expiry}`
                                          + ' using the associated Home Connect or SingleKey ID'
                                          + ' email address by visiting:'));
                this.log.info(response.verification_uri_complete
                    ? greenBright(`    ${bold(response.verification_uri_complete)}`)
                    : greenBright(`    ${bold(response.verification_uri)} and enter code ${bold(response.user_code)}`));
                await sleep(this.deviceFlowLogInterval);
            }
        };

        // Wait for the user to authorise access (or expiry of device code)
        this.log.debug('Waiting for completion of Home Connect authorisation'
                     + ` (poll every ${formatDuration(this.deviceFlowPollInterval)},`
                     + (response.expires_in ? ` expires in ${formatDuration(response.expires_in * 1000)},` : '')
                     + ` device code ${response.device_code})...`);
        try {
            logPrompt();
            return await this.deviceAccessTokenRequest(response.device_code);
        } finally {
            displayPrompts = false;
        }
    }

    // Construct a Promise to indicate a new authorisation URI
    setAuthorisationURI(uri?: AuthorisationURI | null): void {
        if (uri !== undefined) {
            // Resolve the promise or create a new resolved promise
            if (this.resolveAuthorisationURI) {
                this.resolveAuthorisationURI?.(uri);
                this.resolveAuthorisationURI = undefined;
            } else {
                this.authorisationURI = Promise.resolve(uri);
            }
        } else {
            // Create a new promise if there isn't already one pending
            if (!this.resolveAuthorisationURI) {
                this.authorisationURI = new Promise(resolve => this.resolveAuthorisationURI = resolve);
            }
        }
    }

    // Obtain the URL that the user should use to authorise this client
    async getAuthorisationURI(): Promise<AuthorisationURI | null> {
        this.triggerDeviceFlow?.();
        return this.authorisationURI;
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
                if (err.key === 'authorization_pending' ) {
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
