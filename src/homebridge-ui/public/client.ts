// Homebridge plugin for Home Connect home appliances
// Copyright © 2023-2024 Alexander Thoukydides

import '@homebridge/plugin-ui-utils/dist/ui.interface';
import { LogLevel, Logger } from 'homebridge';

import { ClientLogger, ServerLogger } from './logger';
import { Config } from './config';
import { Cards } from './cards';
import { ClientClientID } from './client-clientid';
import { FormId, Forms } from './forms';
import { ClientIPC } from './client-ipc';
import { APIStatus } from './api-status';

// A Homebridge HomeConnect custom UI client
class Client {

    // Custom loggers
    readonly log:   Logger;
    serverLog?:     Logger;

    // Local resources
    readonly ipc: ClientIPC;

    // Create a new custom UI client
    constructor() {
        // Create a local logger and IPC client
        this.log = new ClientLogger();
        this.log.debug('homebridge.plugin', window.homebridge.plugin);
        this.ipc = new ClientIPC(this.log);

        // Wait for the server before continuing initialisation
        this.ipc.onEvent('ready', () => this.serverReady());
    }

    // The server is ready so finish initialising the client
    async serverReady(): Promise<void> {
        // Start receiving (important) log messages from the server
        this.serverLog = new ServerLogger(this.ipc, LogLevel.WARN);

        // Create all of the required resources
        const config = new Config(this.log, this.ipc);
        const forms  = new Forms(this.log, this.ipc, config);
        const cards  = new Cards(this.log);
        const client = new ClientClientID(this.log, this.ipc);
        new APIStatus(this.log);

        // Create cards for the global settings and each available appliance
        cards.setNonAppliances([{ id: FormId.Global, icon: 'global', name: 'General Settings' }]);
        client.onAppliances = appliances => cards.setAppliances(appliances ?? []);
        cards.onSelect = (id?: string) => forms.showForm(id);

        // Attempt to authorise a client when the configuration changes
        config.onGlobal = config => client.setClient(config);
        client.onFail   = ()     => forms.showForm(FormId.Global);
    }
}

// Create a custom UI client instance
new Client();