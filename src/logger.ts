// Homebridge plugin for Home Connect home appliances
// Copyright © 2023 Alexander Thoukydides

import { Logger, LogLevel } from 'homebridge';

import { createCheckers, CheckerT } from 'ts-interface-checker';

import { AccessTokenHeader, AccessTokenPayload, RefreshToken, SimulatorToken } from './token-types';
import { formatList, MS } from './utils';
import tokensTI from './ti/token-types-ti';

// Checkers for token types
const checkers = createCheckers(tokensTI) as {
    RefreshToken:       CheckerT<RefreshToken>;
    SimulatorToken:     CheckerT<SimulatorToken>;
    AccessTokenHeader:  CheckerT<AccessTokenHeader>;
    AccessTokenPayload: CheckerT<AccessTokenPayload>;
};

// A logger with filtering and support for an additional prefix
export class PrefixLogger {

    // Log level used for debug messages
    debugLevel: LogLevel = LogLevel.DEBUG;

    // Create a new logger
    constructor(
        readonly logger:    Logger,
        readonly prefix?:   string
    ) {}

    // Wrappers around the standard Logger methods
    info (message: string): void { this.log(LogLevel.INFO,  message); }
    warn (message: string): void { this.log(LogLevel.WARN,  message); }
    error(message: string): void { this.log(LogLevel.ERROR, message); }
    debug(message: string): void { this.log(LogLevel.DEBUG, message); }
    log(level: LogLevel, message: string): void {
        // Allow debug messages to be logged as a different level
        if (level === LogLevel.DEBUG) level = this.debugLevel;

        // Mask any sensitive data within the log message
        message = PrefixLogger.filterSensitive(message);

        // Log each line of the message
        const prefix = this.prefix?.length ? `[${this.prefix}] ` : '';
        for (const line of message.split('\n')) this.logger.log(level, prefix + line);
    }

    // Log all DEBUG messages as INFO to avoid being dropped by Homebridge
    logDebugAsInfo(): void {
        this.debugLevel = LogLevel.INFO;
    }

    // Attempt to filter sensitive data within the log message
    static filterSensitive(message: string) {
        return message
            .replace(/\b[0-9-A-F]{64}\b/g,                      maskClientId)
            .replace(/\b[\w+/]{64,}(={1,2}|(%3D){1,2}|\b)/g,    maskRefreshToken)
            .replace(/\b[\w-]+\.[\w-]+\.[\w-]+\b/g,             maskAccessToken);
    }
}

// Mask a Home Connect Client ID
function maskClientId(clientId: string): string {
    return maskToken('CLIENT_ID', clientId);
}

// Mask a Home Connect refresh token or authorisation code
function maskRefreshToken(token: string): string {
    try {
        token = token.replace(/%3D/g, '=');
        const decoded = Buffer.from(token, 'base64').toString();
        const json = JSON.parse(decoded);
        if (checkers.SimulatorToken.test(json) && isUUID(json.token)) {
            return maskToken('SIMULATOR_TOKEN', token);
        } else if (checkers.RefreshToken.test(json) && isUUID(json.token)) {
            return maskToken('REFRESH_TOKEN', token);
        }
        return token;
    } catch {
        return token;
    }
}

// Mask a Home Connect access token
function maskAccessToken(token: string): string {
    try {
        const parts = token.split('.').map(part => decodeBase64URL(part));
        const header = JSON.parse(parts[0]);
        const payload = JSON.parse(parts[1]);
        if (checkers.AccessTokenHeader.test(header)
         && checkers.AccessTokenPayload.test(payload)) {
            return maskToken('ACCESS_TOKEN', token, {
                issued:     new Date(payload.iat * MS).toISOString(),
                expires:    new Date(payload.exp * MS).toISOString(),
                scopes:     payload.scope.join('/')
            });
        }
        return maskToken('JSON_WEB_TOKEN', token);
    } catch (err) {
        return token;
    }
}

// Mask a token, leaving just the first and final few characters
function maskToken(type: string, token: string, details: Record<string, string> = {}): string {
    let masked = `${token.slice(0, 4)}...${token.slice(-8)}`;
    const parts = Object.entries(details).map(([key, value]) => `${key}=${value}`);
    if (parts.length) masked += ` (${formatList(parts)})`;
    return `<${type}: ${masked}>`;
}

// Decode a Base64URL encoded string
function decodeBase64URL(base64url: string): string {
    const paddedLength = base64url.length + (4 - base64url.length % 4) % 4;
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
        .padEnd(paddedLength, '=');
    return Buffer.from(base64, 'base64').toString();
}

// Test whether a string is in UUID canonical format
function isUUID(uuid: string): boolean {
    return /^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/.test(uuid);
}
