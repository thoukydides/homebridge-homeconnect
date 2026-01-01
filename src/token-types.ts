// Homebridge plugin for Home Connect home appliances
// Copyright © 2023-2026 Alexander Thoukydides

// Refresh token (Base64 decoded)
export interface RefreshToken {
    'x-reg':    string;     // e.g. 'EU'
    'x-env':    string;     // e.g. 'PRD'
    token:      string;     // Token (UUID 8-4-4-4-12 format)
    clty:       string;     // e.g. 'private'
}

// Simulator authorisation code or refresh token (Base64 decoded)
export interface SimulatorToken {
    'x-reg':    'SIM';
    'x-env':    string;     // e.g. 'PRD'
    token:      string;     // Token (UUID 8-4-4-4-12 format)
}

// Access token header (Base64 URL decoded)
export interface AccessTokenHeader {
    'x-reg':    string;     // e.g. 'EU'
    'x-env':    string;     // e.g. 'PRD'
    alg:        string;     // e.g. 'RS256'
    kid:        string;     // e.g. 'reu-production'
    typ?:       string;     // e.g. 'JWT'
}

// Access token payload (Base64 URL decoded)
export interface AccessTokenPayload {
    sub:        string;     // Subject, e.g. 'devportalUserId:123'
    jti:        string;     // JWT ID (UUID 8-4-4-4-12 format)
    aud:        string;     // Audience (Client ID)
    azp:        string;     // Authorised Party (Client ID)
    scope:      string[];   // Authorised scopes, e.g. ["Monitor", "Settings"]
    iss:        string;     // Issuer, e.g. 'EU:PRD:2'
    iat:        number;     // Issued At (seconds since epoch)
    exp:        number;     // Expiration Time (seconds since epoch)
    clty?:      string;     // e.g. 'private'
    fgrp?:      unknown[];  // e.g. []
    prm?:       unknown[];  // e.g. []
}