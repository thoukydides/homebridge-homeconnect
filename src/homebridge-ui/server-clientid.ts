// Homebridge plugin for Home Connect home appliances
// Copyright © 2023-2025 Alexander Thoukydides

import '@homebridge/plugin-ui-utils/dist/ui.interface.js';
import { Logger } from 'homebridge';

import { LocalStorage } from 'node-persist';

import { CloudAPI, HomeConnectAPI } from '../api.js';
import { HomeAppliance } from '../api-types.js';
import { ConfigPlugin } from '../config-types.js';
import { MockAPI } from '../mock/index.js';
import { Constructor, assertIsDefined } from '../utils.js';
import { logError } from '../log-error.js';
import { AuthorisationStatus } from '../api-ua-auth.js';
import { APIStatusCodeError } from '../api-errors.js';
import { ServerIPC } from './server-ipc.js';

// API status
export interface ClientIDStatus {
    clientid:       string;
    simulator:      boolean;
    china:          boolean;
    appliances?:    HomeAppliance[];
    authorisation?: AuthorisationStatus;
}

// An API with its status
export interface ClientIDAPI {
    api:            HomeConnectAPI;
    status:         ClientIDStatus;
}

// Home Connect API authorisation and basic usage
export class ServerClientID {

    // Cache of all API clients that have been created
    clients = new Map<string, ClientIDAPI>();
    selected?:  ClientIDAPI;

    constructor(
        readonly log:       Logger,
        readonly ipc:       ServerIPC,
        readonly persist:   LocalStorage
    ) {}

    // Set the API client
    setClientID(config: ConfigPlugin): ClientIDStatus {
        // Select the appropriate configuration
        let api: Constructor<HomeConnectAPI>;
        let description: string;
        if (config.debug?.includes('Mock Appliances')) {
            api = MockAPI;
            config.clientid = '';
            config.simulator = true;
            config.china = false;
            description = 'mock appliances';
        } else {
            api = CloudAPI;
            config.simulator ??= false;
            config.china ??= false;
            description = `${config.simulator ? 'simulated' : 'physical'} appliances`
                        + `${config.china ? ' in China' : ''} with clientid ${config.clientid}`;
        }

        // Select or create the client
        const key = `${config.clientid}-${config.simulator}-${config.china}`;
        let client = this.clients.get(key);
        if (client === undefined) {
            // Create a new client
            this.log.info(`Creating Home Connect API client for ${description}`);
            client = {
                api:    new api(this.log, config, this.persist),
                status: {
                    clientid:   config.clientid,
                    simulator:  config.simulator ?? false,
                    china:      config.china     ?? false
                }
            };
            this.clients.set(key, client);

            // Send authorisation status updates to the client
            this.authorisationEvents(client);
        } else {
            this.log.info(`Resurrecting Home Connect API client for ${description}`);
        }

        // Return the API client status
        return client.status;
    }

    // Trigger a retry of Device Flow authorisation
    retryAuthorisation(): ClientIDStatus {
        assertIsDefined(this.selected);
        this.selected.api.retryAuthorisation();
        return this.selected.status;
    }

    // Monitor authorisation status and send updates to the client if selected
    async authorisationEvents(client: ClientIDAPI): Promise<void> {
        // Monitor status until authorised
        while (client.status.authorisation?.state !== 'success') {
            const status = await client.api.getAuthorisationStatus();
            client.status.authorisation = status;
            if (this.selected === client) this.ipc.pushEvent('status', client.status);
        }

        // Attempt to read the list of appliances
        try {
            client.status.appliances = await client.api.getAppliances();
            this.log.info(`Authorised (${client.status.appliances.length} appliances)`);
            this.ipc.pushEvent('status', client.status);
        } catch (err) {
            logError(this.log, 'Reading appliances', err);
        }
    }

    // Wait for authorisation status to indicate whether the clientid is valid
    async isClientValid(client: ClientIDAPI): Promise<boolean> {
        // Wait for the authorisation attempt to succeed, fail, or wait for user
        let status = await client.api.getAuthorisationStatus(true);
        while (status.state === 'busy') status = await client.api.getAuthorisationStatus();

        // Anything other than 'unauthorized_client' indicates a valid clientid
        if (status.state === 'fail') {
            const err = status.error;
            if (err instanceof APIStatusCodeError && err.response?.statusCode === 400
                && err.key === 'unauthorized_client')
                return false;
        }
        return true;
    }
}