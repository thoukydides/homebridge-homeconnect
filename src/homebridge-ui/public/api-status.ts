// Homebridge plugin for Home Connect home appliances
// Copyright © 2024 Alexander Thoukydides

import { Logger } from 'homebridge';
import { MS, assertIsBoolean, assertIsNumber } from '../../utils';
import { getElementById } from './utils-dom';

// URL for the server status image
const STATUS_URL = 'https://homeconnect.thouky.co.uk/api/images/plugin-status.svg';

// Warn for errors more recent than this
const STATUS_SINCE = 24 * 60 * 60 * MS;

// Interval to poll for updates (if there are issues)
const POLL_INTERVAL = 2.5 * 60 * MS;

// X-Server-Status
export interface ServerStatus {
    updated:    number;
    up:         boolean;
    since:      number;
}

// Home Connect API server status
export class APIStatus {

    // When was the status last updated
    lastUpdated?: number;

    // Create a new API server status checker
    constructor(readonly log: Logger) {
        this.pollStatus();
    }

    // Check the status of the Home Connect API servers
    async pollStatus(): Promise<void> {
        // Attempt to fetch the status image
        const response = await fetch(STATUS_URL);
        if (!response.ok) {
            this.log.warn('checkStatus fetch', response.statusText);
            return;
        }
        const svg = await response.text();

        // Attempt to parse the status header
        let status;
        try {
            status = JSON.parse(response.headers.get('X-Server-Status') ?? '') as ServerStatus;
            assertIsBoolean(status.up);
            assertIsNumber(status.since);
            assertIsNumber(status.updated);
        } catch (err) {
            this.log.warn('checkStatus X-Server-Status', err);
            return;
        }

        // Update the displayed status, if it has changed
        let pollAgain = true;
        if (this.lastUpdated !== status.updated) {
            this.lastUpdated = status.updated;
            pollAgain = this.showStatus(svg, status);
        }

        // Periodically poll the status if there are server issues
        if (pollAgain) setTimeout(() => this.pollStatus(), POLL_INTERVAL);
    }

    // Display the latest status of the Home Connect API servers
    showStatus(svg: string, status: ServerStatus): boolean {
        // Display the appropriate summary
        getElementById('hc-api-up').hidden = !status.up;
        getElementById('hc-api-up2').hidden = !status.up;
        getElementById('hc-api-down').hidden = status.up;
        getElementById('hc-api-down2').hidden = status.up;

        // Add the detailed status
        getElementById('hc-api-since').innerText = this.formatDateTime(status.since);

        // Add the retrieved status image
        getElementById('hc-api-svg').innerHTML = svg;

        // Show or hide the status as appropriate
        const showStatus = !status.up || Date.now() < status.since + STATUS_SINCE;
        getElementById('hc-api-status').hidden = !showStatus;
        return showStatus;
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