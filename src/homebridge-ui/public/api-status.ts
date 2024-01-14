// Homebridge plugin for Home Connect home appliances
// Copyright © 2024 Alexander Thoukydides

import { Logger } from 'homebridge';
import { MS, assertIsBoolean, assertIsNumber } from '../../utils';
import { getElementById } from './utils-dom';

// URL for the server status image
const STATUS_URL = 'https://homeconnect.thouky.co.uk/api/images/plugin-status.svg';

// Warn for errors more recent than this
const STATUS_SINCE = 24 * 60 * 60 * MS;

// X-Server-Status
export interface ServerStatus {
    updated:    number;
    up:         boolean;
    since:      number;
}

// Home Connect API server status
export class APIStatus {

    // Create a new API server status checker
    constructor(readonly log: Logger) {
        this.checkStatus();
    }

    // Check the status of the Home Connect API servers
    async checkStatus(): Promise<void> {
        // Attempt to fetch the status image
        const response = await fetch(STATUS_URL);
        if (!response.ok) return this.log.warn('checkStatus fetch', response.statusText);
        const svg = await response.text();

        // Attempt to parse the status header
        let status: ServerStatus;
        try {
            status = JSON.parse(response.headers.get('X-Server-Status') ?? '');
            assertIsBoolean(status.up);
            assertIsNumber(status.since);
            assertIsNumber(status.updated);
        } catch (err) {
            return this.log.warn('checkStatus X-Server-Status', err);
        }

        // Display the status if the API is currently down or has been recently
        if (!status.up || Date.now() < status.since + STATUS_SINCE) {
            this.showStatus(svg, status);
        }
    }

    // Display the status of the Home Connect API servers
    showStatus(svg: string, status: ServerStatus): void {
        // Display the appropriate summary
        getElementById('hc-api-up').hidden = !status.up;
        getElementById('hc-api-down').hidden = status.up;

        // Add the detailed status
        getElementById('hc-api-current').innerText = status.up ? 'Up' : 'Down';
        getElementById('hc-api-since').innerText = this.formatDateTime(status.since);

        // Add the image and show the alert
        getElementById('hc-api-svg').innerHTML = svg;
        getElementById('hc-api-status').hidden = false;
    }

    // Format a date/time
    formatDateTime(date: number): string {
        return new Date(date).toLocaleString(undefined, {
            weekday:        'long',
            month:          'long',
            day:            'numeric',
            hour:           'numeric',
            minute:         '2-digit',
            timeZoneName:   'short'
        });
    }
}