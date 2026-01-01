// Homebridge plugin for Home Connect home appliances
// Copyright © 2023-2026 Alexander Thoukydides

// Authorisation scopes
export type Scope =       'Monitor'                 | 'Control'                 | 'Settings'                | 'Images'
    | 'AirConditioner'  | 'AirConditioner-Monitor'  | 'AirConditioner-Control'  | 'AirConditioner-Settings'
    | 'CleaningRobot'   | 'CleaningRobot-Monitor'   | 'CleaningRobot-Control'   | 'CleaningRobot-Settings'
    | 'CoffeeMaker'     | 'CoffeeMaker-Monitor'     | 'CoffeeMaker-Control'     | 'CoffeeMaker-Settings'
    | 'CookProcessor'   | 'CookProcessor-Monitor'   | 'CookProcessor-Control'   | 'CookProcessor-Settings'
    | 'Dishwasher'      | 'Dishwasher-Monitor'      | 'Dishwasher-Control'      | 'Dishwasher-Settings'
    | 'Dryer'           | 'Dryer-Monitor'           | 'Dryer-Control'           | 'Dryer-Settings'
    | 'Freezer'         | 'Freezer-Monitor'         | 'Freezer-Control'         | 'Freezer-Settings'
    | 'FridgeFreezer'   | 'FridgeFreezer-Monitor'   | 'FridgeFreezer-Control'   | 'FridgeFreezer-Settings'  | 'FridgeFreezer-Images'
    | 'Hob'             | 'Hob-Monitor'             | 'Hob-Control'             | 'Hob-Settings'
    | 'Hood'            | 'Hood-Monitor'            | 'Hood-Control'            | 'Hood-Settings'
    | 'Microwave'       | 'Microwave-Monitor'       | 'Microwave-Control'       | 'Microwave-Settings'
    | 'Oven'            | 'Oven-Monitor'            | 'Oven-Control'            | 'Oven-Settings'
    | 'Refrigerator'    | 'Refrigerator-Monitor'    | 'Refrigerator-Control'    | 'Refrigerator-Settings'
    | 'Washer'          | 'Washer-Monitor'          | 'Washer-Control'          | 'Washer-Settings'
    | 'WasherDryer'     | 'WasherDryer-Monitor'     | 'WasherDryer-Control'     | 'WasherDryer-Settings'
    | 'WineCooler'      | 'WineCooler-Monitor'      | 'WineCooler-Control'      | 'WineCooler-Settings';

// Authorisation Code Grant Flow

// Authorisation Request
// (URL query parameters)
export interface AuthorisationRequest {
    client_id:                  string;
    redirect_uri?:              string;
    response_type:              'code';
    scope?:                     string;
    state?:                     AuthorisationState;
    nonce?:                     string;
    code_challenge?:            string;
    code_challenge_method?:     'plain' | 'S256';
}
export type AuthorisationState = string | number;

// Authorisation Response
// (URL query parameters passed to redirect_uri)
export interface AuthorisationResponse {
    code:                       string;
    grant_type?:                'authorization_code';
    state?:                     AuthorisationState;
}

// Access Token Request
// (Content-Type: application/x-www-form-urlencoded)
export interface AccessTokenRequest {
    client_id:                  string;
    client_secret?:             string; // (required unless using simulator)
    redirect_uri?:              string;
    grant_type:                 'authorization_code';
    code:                       string;
    code_verifier?:             string;
}

// Access Token Response
export interface AccessTokenResponse {
    id_token:                   string;
    access_token:               string;
    expires_in:                 number;
    scope:                      string;
    refresh_token:              string;
    token_type?:                'Bearer';
}

// Device Flow

// Device Authorisation Request
// (Content-Type: application/x-www-form-urlencoded)
export interface DeviceAuthorisationRequest {
    client_id:                  string;
    scope?:                     string;
}

// Device Authorisation Response
export interface DeviceAuthorisationResponse {
    device_code:                string;
    user_code:                  string;
    verification_uri:           string;
    verification_uri_complete?: string;
    expires_in?:                number;
    interval?:                  number;
}

// Device Access Token Request
// (Content-Type: application/x-www-form-urlencoded)
export interface DeviceAccessTokenRequest {
    grant_type:                 'urn:ietf:params:oauth:grant-type:device_code' | 'device_code';
    device_code:                string;
    client_id:                  string;
    client_secret?:             string;
}

// Device Access Token Response
export interface DeviceAccessTokenResponse {
    id_token:                   string;
    access_token:               string;
    expires_in:                 number;
    scope:                      string;
    refresh_token:              string;
    token_type?:                'Bearer';
}

// Refreshing an Access Token

// Access Token Refresh Request
// (Content-Type: application/x-www-form-urlencoded)
export interface AccessTokenRefreshRequest {
    grant_type:                 'refresh_token';
    refresh_token:              string;
    client_secret?:             string;
    scope?:                     string;
    expires_in?:                number;
}

// Access Token Refresh Response
export interface AccessTokenRefreshResponse {
    id_token:                   string;
    access_token:               string;
    expires_in:                 number;
    scope:                      string;
    refresh_token:              string;
    token_type:                 'Bearer';
}

// Storage format for a token (with an absolute expiry time)
export interface AbsoluteToken {
    refreshToken:               string;
    accessToken:                string;
    accessExpires:              number;
    scopes:                     string[];
}
export interface PersistAbsoluteTokens {
    [index: string]:            AbsoluteToken;
}

// Authorisation errors
// (either JSON body or URL query parameters passed to redirect_uri)
export interface AuthorisationError {
    error:                      string;
    error_description:          string;
}