// Homebridge plugin for Home Connect home appliances
// Copyright © 2023-2025 Alexander Thoukydides

import { HomebridgePluginUiServer, RequestError } from '@homebridge/plugin-ui-utils';
import { LogLevel, PlatformConfig } from 'homebridge';

import NodePersist from 'node-persist';
import { join } from 'path';

import { PLUGIN_NAME } from '../settings.js';
import { ConfigSchema, FormSchema } from './schema.js';
import { ServerIPC } from './server-ipc.js';
import { ServerLogger } from './logger.js';
import { ConfigPlugin } from '../config-types.js';
import { ClientIDStatus, ServerClientID } from './server-clientid.js';

// A Homebridge HomeConnect custom UI server
export class HomeConnectServer extends HomebridgePluginUiServer {

    // Custom logger
    readonly log:       ServerLogger;

    // Local resources
    readonly ipc:       ServerIPC;
    readonly persist:   Promise<NodePersist.LocalStorage>;
    readonly schema:    Promise<ConfigSchema>;
    readonly clientid:  Promise<ServerClientID>;

    // Create a new server
    constructor() {
        super();

        // Create a logger that sends messages to the UI client as events
        this.log = new ServerLogger();

        // Create a type-safe IPC handler
        this.ipc = new ServerIPC(this.log, this);

        // Register request handlers
        this.ipc.onRequest('/log',              level  => this.setLogLevel(level));
        this.ipc.onRequest('/config',           ()     => this.getConfig());
        this.ipc.onRequest('/clientid',         config => this.setClientID(config));
        this.ipc.onRequest('/clientid/retry',   ()     => this.retryAuthorisation());
        this.ipc.onRequest('/schema/global',    ()     => this.getSchemaGlobal());
        this.ipc.onRequest('/schema/appliance', haid   => this.getSchemaAppliance(haid));

        // Prepare local resources
        this.persist  = this.preparePersistentStorage();
        this.schema   = this.prepareConfigSchema();
        this.clientid = this.prepareClientID();

        // Server is ready (although asynchronous initialisation continues)
        this.ready();
    }

    // Prepare the persistent storage
    async preparePersistentStorage(): Promise<NodePersist.LocalStorage> {
        if (!this.homebridgeStoragePath) throw new Error('Homebridge storage path is not set');
        const persistDir = join(this.homebridgeStoragePath, PLUGIN_NAME, 'persist');
        this.log.debug('Persistent storage directory', persistDir);
        const persist = NodePersist.create({ dir: persistDir });
        await persist.init();
        return persist;
    }

    // Prepare the configuration schema
    async prepareConfigSchema(): Promise<ConfigSchema> {
        return new ConfigSchema(this.log, await this.persist);
    }

    // Prepare the Home Connect API interface
    async prepareClientID(): Promise<ServerClientID> {
        return new ServerClientID(this.log, this.ipc, await this.persist);
    }

    // Start sending log messages to the client
    async setLogLevel(level: LogLevel): Promise<string> {
        this.log.sendLogEvents(this.ipc, level);
        return Promise.resolve('');
    }

    // Retrieve the active plugin configuration
    async getConfig(): Promise<PlatformConfig> {
        const config = await (await this.schema).getConfig();
        if (!config) throw new RequestError('Plugin configuration not found', { status: 404 });
        return config;
    }

    // Set the Home Connect API client
    async setClientID(config: ConfigPlugin): Promise<ClientIDStatus> {
        return (await this.clientid).setClientID(config);
    }

    // Retry authorisation of the Home Connect API client
    async retryAuthorisation(): Promise<ClientIDStatus> {
        return (await this.clientid).retryAuthorisation();
    }

    // Retrieve the global configuration schema
    async getSchemaGlobal(): Promise<FormSchema> {
        return (await this.schema).getSchemaGlobal();
    }

    // Retrieve the configuration schema for a specified appliance
    async getSchemaAppliance(haid: string): Promise<FormSchema> {
        const schema = await (await this.schema).getSchemaAppliance(haid);
        if (!schema) throw new RequestError(`Appliance not found: ${haid}`, { status: 404 });
        return schema;
    }
}

// Start an instance of the class
new HomeConnectServer;