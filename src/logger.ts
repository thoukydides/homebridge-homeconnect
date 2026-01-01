// Homebridge plugin for Home Connect home appliances
// Copyright © 2025-2026 Alexander Thoukydides

import { Logger, LogLevel } from 'homebridge';

import { assertIsDefined, formatList, MS } from './utils.js';
import { checkers } from './ti/token-types.js';

// Mapping of haId values to their names
const applianceIds = new Map<string, string>();
let revealApplianceIds = false;
const HAID_PATTERN = '\\w+-\\w+-[0-9A-F]{12}|\\d{18}';
const HAID_REGEX = new RegExp(`^${HAID_PATTERN}$`);

// Regular expressions for different types of sensitive data
const filters: [(value: string) => string, RegExp][] = [
    [maskClientId,      /\b[0-9A-F]{64}\b/g],
    [maskRefreshToken,  /\b[\w+/]{64,}(={1,2}|(%3D){1,2}|\b)/g],
    [maskAccessToken,   /\b[\w-]+\.[\w-]+\.[\w-]+\b/g],
    [maskApplianceId,   new RegExp(`\\b${HAID_PATTERN}\\b`, 'g')]
];

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
    info   (message: string): void { this.log(LogLevel.INFO,    message); }
    success(message: string): void { this.log(LogLevel.SUCCESS, message); }
    warn   (message: string): void { this.log(LogLevel.WARN,    message); }
    error  (message: string): void { this.log(LogLevel.ERROR,   message); }
    debug  (message: string): void { this.log(LogLevel.DEBUG,   message); }
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

    // Do not redact haId values in log messages (global setting)
    static set logApplianceIds(log: boolean) { revealApplianceIds = log; }
    static get logApplianceIds(): boolean { return revealApplianceIds; }

    // Attempt to filter sensitive data within the log message
    static filterSensitive(message: string): string {
        // Exception for links related to authorisation
        if (message.includes('https://developer.home-connect.com/')) return message;

        // Otherwise replace anything that should probably be protected
        return filters.reduce((message, [filter, regex]) =>
            message.replace(regex, filter), message);
    }

    // Add an haId to filter
    static addApplianceId(haId: string, name: string): void {
        if (!applianceIds.has(haId) && !HAID_REGEX.test(haId)) {
            // haId was not matched by the standard regexp, so add its own
            filters.push([maskApplianceId, new RegExp(`\\b${haId}\\b`, 'g')]);
        }
        applianceIds.set(haId, name);
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
        const json: unknown = JSON.parse(decoded);
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
        assertIsDefined(parts[0]);
        assertIsDefined(parts[1]);
        const header:  unknown = JSON.parse(parts[0]);
        const payload: unknown = JSON.parse(parts[1]);
        if (checkers.AccessTokenHeader.test(header)
         && checkers.AccessTokenPayload.test(payload)) {
            return maskToken('ACCESS_TOKEN', token, {
                issued:     new Date(payload.iat * MS).toISOString(),
                expires:    new Date(payload.exp * MS).toISOString(),
                scopes:     payload.scope.join('/')
            });
        }
        return maskToken('JSON_WEB_TOKEN', token);
    } catch {
        return token;
    }
}

// Mask a Home Connect appliance ID
function maskApplianceId(haId: string): string {
    if (revealApplianceIds) return haId;
    const name = applianceIds.get(haId);
    if (name) return `<HA_ID ${name}>`;

    // Fallback if the haId is not already known
    const match = /-([^-]+)-/.exec(haId);
    return `<HA_ID ${match?.[1] ?? haId.substring(0, -12)}...>`;
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