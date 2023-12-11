// Homebridge plugin for Home Connect home appliances
// Copyright © 2023 Alexander Thoukydides

import { Logger } from 'homebridge';

import { greenBright } from 'chalk';

import { APIStatusCodeError } from './api-errors';
import { columns } from './utils';

// Log helpful information for Device Flow authorisation errors
export function deviceFlowHelp(log: Logger, err: unknown, clientid: string) {
    if (!(err instanceof APIStatusCodeError)) return;
    if (err.response?.statusCode !== 400) return;

    // Decode the error message to provide suitable advice
    let newClient = false, editClient = false, setClient = false;
    switch (err.key) {
    case 'access_denied':
        log.warn('The specified Home Connect or SingleKey ID account cannot currently be used.'
               + ' Check that it works correctly in the iPhone Home Connect app.'
               + ' It may be necessary to convert a Home Connect account to a SingleKey ID,'
               + ' or accept new terms of use within the app.');
        break;
    case 'expired_token':
        // "Device authorization session not found, expired or blocked"
        log.warn('Authorisation of the Home Connect or SingleKey ID took too long.'
               + ' Restart Homebridge to obtain a new verification code and try again.'
               + ' Visit the provided web link and complete authorisation quickly.');
        log.warn('Pay careful attention to any error messages displayed on the'
               + ' Home Connect / SingleKey ID web pages.');
        break;
    case 'invalid_client':
        // "client secret validation failed"
        log.warn('Client Secret is not required with Device Flow authorisation.'
               + ' Remove "clientsecret" from the "config.json" file (or set it to the correct value).');
        break;
    case 'unauthorized_client':
        switch (err.description) {
        case 'Invalid client id':
            if (clientid.length !== 64) {
                log.warn('The Client ID should be 64 hexadecimal characters,'
                       + ` but the value specified for "clientid" is ${clientid.length} characters long.`);
                setClient = true;
            } else if (!clientid.match(/^[0-9A-F]+$/i)) {
                log.warn('The Client ID should be 64 hexadecimal characters,'
                       + ' but the value specified for "clientid" includes non-hexadecimal characters.');
                setClient = true;
            } else {
                log.warn('The configured Client ID does not appear to be a valid Home Connect application.');
                editClient = true;
            }
            break;
        case 'request rejected by client authorization authority (developer portal)':
            log.warn('The configured Client ID does not appear to be a valid Home Connect application.'
                   + ' If it was created recently then it may still be propagating to the authorisation servers.');
            editClient = true;
            break;
        case 'client not authorized for this oauth flow (grant_type)':
            log.warn('The configured Client ID has been incorrectly configured with'
                   + ' the OAuth Flow set to "Authorization Code Grant Flow".'
                   + ' Create a new application using "Device Flow" instead.'
                   + ' This setting cannot be changed after the application has been created.');
            newClient = true;
            break;
        }
        break;
    }

    // Extra help if the application needs to be edited
    const ensureClient: Record<string, string> = {
        'Home Connect User Account':        'Same as the Home Connect or SingleKey ID email address',
        'Success Redirect':                 'Leave blank',
        'One Time Token':                   'Not ticked',
        'Status':                           'Enabled',
        'Client Secret Always Required':    'No'
    };
    if (editClient) {
        log.warn(greenBright(`Edit the application (${clientid}) at:`));
        log.warn(greenBright.bold('    https://developer.home-connect.com/applications'));
    }
    if (newClient) {
        log.warn(greenBright('Create a new application at:'));
        log.warn(greenBright.bold('    https://developer.home-connect.com/applications/add'));
        ensureClient['OAuth Flow'] = 'Set to "Device Flow"';
    }
    if (editClient || newClient) {
        log.warn('Ensure that the application settings are configured as follows:');
        for (const line of columns(Object.entries(ensureClient))) log.warn(`    ${line}`);
    }
    if (newClient || setClient) {
        log.warn('Accurately copy the Client ID value (64 hexadecimal characters)'
               + ' from the Home Connect Developer Program site to the "clientid"'
               + ' field of the "config.json" configuration file.');
    }

    // Seek additional support from the Home Connect Developer Portal
    log.warn('Descriptions of authorisation error messages can be found in the Home Connect API documentation at:');
    log.warn('    https://api-docs.home-connect.com/authorization?#authorization-errors');
    log.warn('For additional support contact the Home Connect Developer team at:');
    log.warn('    https://developer.home-connect.com/support/contact');

    // Note that changes can take time to propagate
    log.warn('Note that applications created or edited on the Home Connect Developer Program site'
           + ' often take several minutes to propagate to the authorisation servers.'
           + ' If you think the configuration is correct, then wait 15 minutes and'
           + ' try again before seeking help elsewhere or reporting an issue.');
}
