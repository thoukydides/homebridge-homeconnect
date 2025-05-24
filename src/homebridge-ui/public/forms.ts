// Homebridge plugin for Home Connect home appliances
// Copyright © 2023-2025 Alexander Thoukydides

import { Logger } from 'homebridge';
import { IHomebridgeUiFormHelper, PluginConfig, PluginFormSchema } from '@homebridge/plugin-ui-utils/dist/ui.interface.js';

import { ClientIPC } from './client-ipc.js';
import { Config } from './config.js';
import { ConfigPlugin } from '../../config-types.js';
import { elementWithAbsolutePaths, cloneTemplate, getHTML } from './utils-dom.js';

// A configuration form handler
export abstract class Form {

    // The form
    form?: IHomebridgeUiFormHelper;

    // Create a configuration form
    constructor(readonly log: Logger) {}

    // Retrieve the configuration schema
    abstract getSchema(): Promise<PluginFormSchema>;

    // The current configuration for this form
    abstract getData(): Promise<PluginConfig>;

    // Return any changes to the form data
    abstract putData(data: PluginConfig): Promise<void>;

    // Retrieve and display the form
    async createForm(): Promise<void> {
        // Retrieve the form schema and data
        const schema = await this.getSchema();
        const data   = await this.getData();

        // Create the form (adding header and footer)
        const patchedSchema = this.patchSchema(schema);
        this.log.debug('createForm', patchedSchema, data);
        this.form = window.homebridge.createForm(patchedSchema, data);

        // Return any changes to the configuration
        this.form.onChange(config => this.putData(config));
    }

    // Hide the form (implicitly called if a different form is created)
    destroyForm(): void {
        this.form?.end();
        this.form = undefined;
    }

    // Add a header and footer to the schema form
    patchSchema(schema: PluginFormSchema): PluginFormSchema {
        const form = [
            ...(schema.form ?? []),
            ...this.formFromTemplate('hc-form-footer')
        ];
        return { ...schema, form };
    }

    // Create a form item from a template
    formFromTemplate(...args: Parameters<typeof cloneTemplate>): Record<string, string>[] {
        const template = cloneTemplate(...args);
        const absTemplate = elementWithAbsolutePaths(template);
        return this.formFromHTML(absTemplate);
    }

    // Create a form item from an HTML element
    formFromHTML(element: Node): Record<string, string>[] {
        return [{
            type:       'help',
            helpvalue:  getHTML(element)
        }];
    }
}

// A global configuration form handler
export class GlobalForm extends Form {
    constructor(log:                Logger,
                readonly ipc:       ClientIPC,
                readonly config:    Config) {
        super(log);
    }

    getSchema(): Promise<PluginFormSchema>      { return this.ipc.request('/schema/global', null); }
    getData(): Promise<PluginConfig>            { return this.config.getGlobal(); }
    putData(data: PluginConfig): Promise<void>  { return this.config.setGlobal(data as ConfigPlugin); }
}

// An configuration form handler for a specific appliance
export class ApplianceForm extends Form {
    constructor(log:                Logger,
                readonly ipc:       ClientIPC,
                readonly config:    Config,
                readonly haid:      string) {
        super(log);
    }

    getSchema(): Promise<PluginFormSchema>      { return this.ipc.request('/schema/appliance', this.haid); }
    getData(): Promise<PluginConfig>            { return this.config.getAppliance(this.haid); }
    putData(data: PluginConfig): Promise<void>  { return this.config.setAppliance(this.haid, data); }
}

// A placeholder form handler
export class TemplateForm extends Form {

    readonly elementAsForm: Record<string, string>[];

    constructor(log:        Logger,
                ...args:    Parameters<typeof cloneTemplate>) {
        super(log);
        this.elementAsForm = this.formFromTemplate(...args);
    }

    // Create a placeholder schema using the specified HTML element
    async getSchema(): Promise<PluginFormSchema> {
        return Promise.resolve({
            schema: {
                type: 'object',
                properties: {}
            },
            form:   this.elementAsForm
        });
    }

    async getData(): Promise<PluginConfig>  { return Promise.resolve({}); }
    async putData(): Promise<void>          { /* empty */ }
}

// Identifiers for special forms
export enum FormId {
    Global      = 'global',
    Placeholder = 'placeholder',
    Unavailable = 'unavailable'
}

// Type guard to check whether a string is a special form identifier
function isFormId(value: string): value is FormId {
    return Object.values(FormId).includes(value as FormId);
}

// Manage the configuration forms
export class Forms {

    // The form currently being displayed
    currentForm?:   Form;

    // Create a new form manager
    constructor(readonly log:       Logger,
                readonly ipc:       ClientIPC,
                readonly config:    Config) {
        this.showForm();
    }

    // Display the specified form (defaulting to the placeholder)
    async showForm(formId?: string): Promise<void> {
        try {
            // The forms are retrieved from the server, so display a spinner
            window.homebridge.showSpinner();

            // Display the requested form, with fallback to the error form
            try {
                await this.constructAndShowForm(formId ?? FormId.Placeholder);
            } catch (err) {
                this.log.warn('Failed to display form', formId, err);
                await this.constructAndShowForm(FormId.Unavailable);
            }
        } finally{
            // Ensure that the spinner is always hidden
            window.homebridge.hideSpinner();
        }
    }

    // Try to create the requested form, with fallback to the placeholder
    async constructAndShowForm(formId: string): Promise<void> {
        const form = this.constructForm(formId);
        await form.createForm();
        this.currentForm = form;
    }

    // Create a specific form
    constructForm(formId: string): Form {
        if (isFormId(formId)) {
            switch (formId) {
            case FormId.Placeholder: return new TemplateForm (this.log, 'hc-form-placeholder');
            case FormId.Unavailable: return new TemplateForm (this.log, 'hc-form-unavailable');
            case FormId.Global:      return new GlobalForm   (this.log, this.ipc, this.config);
            }
        } else {
            return new ApplianceForm(this.log, this.ipc, this.config, formId);
        }
    }
}