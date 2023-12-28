// Homebridge plugin for Home Connect home appliances
// Copyright © 2023 Alexander Thoukydides

import { IHomebridgeUiToastHelper } from '@homebridge/plugin-ui-utils/dist/ui.interface';
import { Logger } from 'homebridge';

import { ClientIPC } from './client-ipc';
import { ClientIDStatus } from '../server-clientid';
import { ConfigPlugin } from '../../config-types';
import { MS } from '../../utils';
import { AuthorisationStatusFailed, AuthorisationStatusUser } from '../../api-ua-auth';
import { cloneTemplate, getElementById, setSlotText } from './utils-dom';
import { HomeAppliance } from '../../api-types';

// Minimum time between duplicate toast notifications
const TOAST_DEDUP_TIME = 5 * MS;

// The current Home Connect client
export class ClientClientID {

    // The configuration of the client being monitored
    clientConfig?: ConfigPlugin;

    // The most recent toast displayed (to avoid duplicates)
    lastToast?: string;

    // Triggers to modify the configuration
    onFail?:        ()                                  => void;
    onAppliances?:  (appliances?:   HomeAppliance[])    => void;

    // Create a new Home Connect client
    constructor(readonly log: Logger, readonly ipc: ClientIPC) {
        this.ipc.onEvent('status', status => this.onClientStatus(status));
    }

    // The Home Connect client configuration has changed
    async setClient(config: Partial<ConfigPlugin>) {
        const clientConfig = this.prepareClientConfig(config);
        if (clientConfig) {
            // Test the client configuration
            this.clientConfig = clientConfig;
            try {
                const status = await this.ipc.request('/clientid', clientConfig);
                this.onClientStatus(status);
            } catch (err) {
                this.showToast('error', `Unable to attempt authorisation ${err}`);
            }
        } else {
            // Ignore the client configuration until it is valid
            this.clientConfig = undefined;
            this.showPanel();
            this.onAppliances?.();
        }
    }

    // Test whether the client configuration is likely to be valid
    prepareClientConfig(config: Partial<ConfigPlugin>): ConfigPlugin | undefined {
        if (config.debug?.includes('Mock Appliances')) {
            // Mock appliances; use an empty clientid to match the status
            return { ...config, clientid: '' } as ConfigPlugin;
        } else if (config.clientid !== undefined && /^[0-9A-F]{64}$/i.test(config.clientid)) {
            // Viable clientid
            return config as ConfigPlugin;
        }
    }

    // Handle events from the Home Connect client
    onClientStatus(status: ClientIDStatus) {
        // Ignore the status if no longer monitoring the client
        if (this.clientConfig?.clientid !== status.clientid) return;

        // Update the list of appliances
        this.onAppliances?.(status.appliances);

        // Display an appropriate toast notfication
        switch (status.authorisation?.state) {
        case 'success':
            this.showToast('success', 'Successfully authorised');
            this.showPanel();
            break;
        case 'user':
            this.showToast('info', 'User authorisation required');
            this.showUserAuthorisation(status.authorisation);
            break;
        case 'fail':
            this.showToast('error', 'Authorisation failed');
            this.showFail(status.authorisation);
            this.onFail?.();
            break;
        case 'busy':
        default:
            this.showPanel();
        }
    }

    // Prompt the user to authorise the client
    async showUserAuthorisation(authorisation: AuthorisationStatusUser) {
        // Set the link/code
        const link = getElementById('hc-client-user-link');
        link.setAttribute('href', authorisation.uri);
        setSlotText(document, { 'hc-client-user-code': authorisation.code });

        // Enable generation of a new authorisation code
        getElementById('hc-client-user-retry').onclick = () => this.retryAuthorisation();

        // Make the authorisation link visible (before triggering transition)
        this.showPanel('hc-client-user');

        // Start animating the progress bar for the time until the link expires
        const progress = getElementById('hc-client-user-progress');
        progress.classList.remove('hc-progress-zero');
        if (authorisation.expires !== null) {
            progress.style.transitionDuration = `${authorisation.expires - Date.now()}ms`;
            void(progress.offsetHeight); // (force a reflow)
            progress.classList.add('hc-progress-zero');
        }
    }

    // Display the result of a failed authorisation
    showFail(authorisation: AuthorisationStatusFailed) {
        // Display the error message
        getElementById('hc-client-fail-message').textContent = authorisation.message;

        // Indicate whether the authorisation can be retried
        getElementById('hc-client-fail-retryable').hidden = !authorisation.retryable;
        getElementById('hc-client-fail-retry')    .hidden = !authorisation.retryable;
        getElementById('hc-client-fail-retry').onclick = () => this.retryAuthorisation();

        // Add any help that has been provided
        if (authorisation.help) {
            // Set text blocks
            const setText = (id: string, text: string[]) =>
                getElementById(id).replaceChildren(...text.map(paragraph =>
                    cloneTemplate('hc-client-fail-paragraph', { paragraph } )));
            setText('hc-client-fail-prescript',  authorisation.help.prescript);
            setText('hc-client-fail-postscript', authorisation.help.postscript);

            // Provide additional help for creating or modifying the application
            const { client } = authorisation.help;
            const link = getElementById('hc-client-fail-uri');
            if (client) {
                getElementById('hc-client-fail-client-settings').replaceChildren(
                    ...Object.entries(client.settings).map(([key, value]) =>
                        cloneTemplate('hc-client-fail-client-setting', { key, value })));
                link.setAttribute('href', client.uri);
                link.textContent = client.action === 'create' ? 'Create application' : 'Modify application';
                link.hidden = false;
                getElementById('hc-client-fail-client').hidden = false;
            } else {
                link.hidden = true;
                getElementById('hc-client-fail-client').hidden = true;
            }

            // Make the details visible
            getElementById('hc-client-fail-detail').hidden = false;
        } else {
            // Otherwise hide the details
            getElementById('hc-client-fail-uri')   .hidden = true;
            getElementById('hc-client-fail-detail').hidden = true;
        }

        // Make the failure message visible
        this.showPanel('hc-client-fail');
    }

    // Trigger authorisation retry
    async retryAuthorisation(): Promise<void> {
        try {
            await this.ipc.request('/clientid/retry', null);
            this.showToast('info', 'Requesting new authorisation code');
        } catch (err) {
            this.showToast('error', `Unable to retry authorisation: ${err}`);
        }
    }

    // Show the specified element and hide all others
    showPanel(idShow?: string): void {
        for (const id of ['hc-client-fail', 'hc-client-user']) {
            getElementById(id).hidden = id !== idShow;
        }
    }

    // Display a toast notification
    showToast(level: keyof IHomebridgeUiToastHelper, message: string): void {
        // Avoid duplicate toast notifications
        const key = `${level} - ${message}`;
        if (this.lastToast === key) return;
        this.lastToast = key;
        setTimeout(() => {
            if (this.lastToast === key) this.lastToast = undefined;
        }, TOAST_DEDUP_TIME);

        // Display the toast notification
        window.homebridge.toast[level](message, 'Home Connect Client');
    }
}