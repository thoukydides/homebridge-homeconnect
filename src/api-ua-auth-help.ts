// Homebridge plugin for Home Connect home appliances
// Copyright © 2023 Alexander Thoukydides

import { Logger } from 'homebridge';

import { Chalk, greenBright } from 'chalk';

import { APIStatusCodeError } from './api-errors';
import { columns } from './utils';

// Components of help message
export interface AuthHelpMessage {
    prescript:  string[];
    client?:    {
        action:     'create' | 'modify';
        uri:        string;
        settings:   Record<string, string>;
    };
    postscript: string[];
}

// Possible fixes for the application or clientid
export type ClientAction = 'create' | 'modify' | 'set' | undefined;

// Generate helpful information for authorisation errors
export abstract class AuthHelp {

    // The structured help message
    message!: AuthHelpMessage;

    // Retrieve the structured help message
    getStructured(): AuthHelpMessage | undefined {
        return this.message;
    }

    // Retrieve the message as text
    getText(colour: boolean = false): string[] {
        // Help isn't always available
        if (!this.message) return [];

        // Write the pre-script
        const text: string[] = [...this.message.prescript];

        // Write the client creation/modification guide
        const addLink = (description: string, uri: string, chalk?: Chalk) => {
            let lines = [`${description}:`, `    ${uri}`];
            if (colour && chalk) lines = [chalk(lines[0]), chalk.bold(lines[1])];
            text.push(...lines);
        };
        if (this.message.client) {
            const { action, uri, settings } = this.message.client;
            addLink(`${{ create: 'Create a new', modify: 'Edit the'}[action]} application`,
                    uri, greenBright);
            text.push('Ensure that the application settings are configured as follows:',
                      ...columns(Object.entries(settings)).map(line => `    ${line}`));
        }

        // Postscript with extra support from the Home Connect Developer Portal
        text.push(...this.message.postscript);
        addLink('Descriptions of authorisation error messages can be found in the Home Connect API documentation',
                'https://api-docs.home-connect.com/authorization?#authorization-errors');
        addLink('For additional support contact the Home Connect Developer team',
                'https://developer.home-connect.com/support/contact');
        return text;
    }

    // Write the help message to the log
    log(log: Logger): void {
        for (const line of this.getText(true)) log.warn(line);
    }
}

// Generate helpful information for Device Flow authorisation errors
export class AuthHelpDeviceFlow extends AuthHelp {

    // Create a new help object
    constructor(err: unknown, clientid: string) {
        super();

        // Only provide help when the status code was 400
        if (!(err instanceof APIStatusCodeError)) return;
        if (err.response?.statusCode !== 400)     return;

        // Decode the problem
        this.message = { prescript: [], postscript: [] };
        const action = this.decodeError(err, clientid);

        // Provide guidance for modifying or recreating the client
        if (action === 'create' || action === 'modify')
            this.clientSettingsGuide(action, clientid);

        // Provide guidance for setting the clientid
        this.clientChangeGuide(action);
    }


    // Decode the error message to provide suitable advice
    decodeError(err: APIStatusCodeError, clientid: string): ClientAction {
        const { prescript } = this.message;
        switch (err.key) {

        case 'access_denied':
            prescript.push('The specified Home Connect or SingleKey ID account cannot currently be used.'
                         + ' Check that it works correctly in the iPhone Home Connect app.'
                         + ' It may be necessary to convert a Home Connect account to a SingleKey ID,'
                         + ' or accept new terms of use within the app.');
            break;

        case 'expired_token':
            // "Device authorization session not found, expired or blocked"
            prescript.push('Authorisation of the Home Connect or SingleKey ID took too long.'
                         + ' Visit the provided web link and complete authorisation quickly.',
                           'Pay careful attention to any error messages displayed on the Home Connect / SingleKey ID web pages.');
            break;

        case 'invalid_client':
            // "client secret validation failed"
            prescript.push('Client Secret is not required with Device Flow authorisation.'
                         + ' Remove "clientsecret" from the "config.json" file (or set it to the correct value).');
            break;

        case 'unauthorized_client':
            return this.decodeUnauthorizedClient(err, clientid);
        }
    }

    // Decode an 'unauthorized_client' error message
    decodeUnauthorizedClient(err: APIStatusCodeError, clientid: string): ClientAction {
        const { prescript } = this.message;
        switch (err.description) {

        case 'Invalid client id':
            if (clientid.length !== 64) {
                prescript.push('The Client ID should be 64 hexadecimal characters,'
                             + ` but the value specified for "clientid" is ${clientid.length} characters long.`);
                return 'set';
            } else if (!clientid.match(/^[0-9A-F]+$/i)) {
                prescript.push('The Client ID should be 64 hexadecimal characters,'
                             + ' but the value specified for "clientid" includes non-hexadecimal characters.');
                return 'set';
            } else {
                prescript.push('The configured Client ID does not appear to be a valid Home Connect application.');
                return 'modify';
            }

        case 'request rejected by client authorization authority (developer portal)':
            prescript.push('The configured Client ID does not appear to be a valid Home Connect application.'
                         + ' If it was created recently then it may still be propagating to the authorisation servers.');
            return 'modify';

        case 'client not authorized for this oauth flow (grant_type)':
            prescript.push('The configured Client ID has been incorrectly configured'
                         + ' with the OAuth Flow set to "Authorization Code Grant Flow".'
                         + ' Create a new application using "Device Flow" instead.'
                         + ' This setting cannot be changed after the application has been created.');
            return 'create';
        }
    }

    // Provide guidance for creating or modifying an application
    clientSettingsGuide(action: 'create' | 'modify', clientid: string): void {
        const settings: Record<string, string> = {
            'Home Connect User Account':        'Same as the Home Connect or SingleKey ID email address',
            'Success Redirect':                 'Leave blank',
            'One Time Token':                   'Not ticked',
            'Status':                           'Enabled',
            'Client Secret Always Required':    'No'
        };
        if (action === 'create') settings['OAuth Flow'] = 'Set to "Device Flow"';

        const uri = action === 'create' ? 'https://developer.home-connect.com/applications/add'
                                        : `https://developer.home-connect.com/applications/${clientid}/edit`;

        this.message.client = { action, settings, uri };
    }

    clientChangeGuide(action: ClientAction): void {
        const { postscript } = this.message;
        if (action === 'create' || action === 'modify') {
            postscript.push('Accurately copy the Client ID value (64 hexadecimal characters) from the Home Connect Developer Program'
                          + ' site to the "clientid" field of the "config.json" configuration file.');
        }
        postscript.push('Note that applications created or edited on the Home Connect Developer Program site often take'
                      + ' several minutes to propagate to the authorisation servers.'
                      + ' If you think the configuration is correct, then wait 15 minutes and try again'
                      + ' before seeking help elsewhere or reporting an issue.');
    }
}