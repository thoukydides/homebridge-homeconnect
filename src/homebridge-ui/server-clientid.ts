// Homebridge plugin for Home Connect home appliances
// Copyright © 2023 Alexander Thoukydides

import '@homebridge/plugin-ui-utils/dist/ui.interface';
import { Logger } from 'homebridge';

import { LocalStorage } from 'node-persist';

import { CloudAPI, HomeConnectAPI } from '../api';
import { HomeAppliance } from '../api-types';
import { ConfigPlugin } from '../config-types';
import { MockAPI } from '../mock-api';
import { Constructor, assertIsDefined } from '../utils';
import { logError } from '../log-error';
import { AuthorisationStatus } from '../api-ua-auth';
import { APIStatusCodeError } from '../api-errors';
import { ServerIPC } from './server-ipc';

// API status
export interface ClientIDStatus {
    clientid:       string;
    simulator:      boolean;
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
    clients:    Record<string, ClientIDAPI> = {};
    selected?:  ClientIDAPI;

    constructor(
        readonly log:       Logger,
        readonly ipc:       ServerIPC,
        readonly persist:   LocalStorage
    ) {}

    // Set the API client
    async setClientID(config: ConfigPlugin): Promise<ClientIDStatus> {
        // Select the appropriate configuration
        let api: Constructor<HomeConnectAPI>;
        let description: string;
        if (config.debug?.includes('Mock Appliances')) {
            api = MockAPI;
            config.clientid = '';
            config.simulator = true;
            description = 'mock appliances';
        } else {
            api = CloudAPI;
            config.simulator ??= false;
            description = `${config.simulator ? 'simulated' : 'physical'} appliances with clientid ${config.clientid}`;
        }

        // Select or create the client
        const key = `${config.clientid}-${config.simulator}`;
        if (this.clients[key] === undefined) {
            // Create a new client
            this.log.info(`Creating Home Connect API client for ${description}`);
            this.clients[key] = {
                api:    new api(this.log, config, this.persist),
                status: {
                    clientid:   config.clientid,
                    simulator:  config.simulator ?? false
                }
            };

            // Send authorisation status updates to the client
            this.authorisationEvents(this.clients[key]);
        } else {
            this.log.info(`Resurrecting Home Connect API client for ${description}`);
        }

        // Return the API client status
        this.selected = this.clients[key];
        return this.selected.status;
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