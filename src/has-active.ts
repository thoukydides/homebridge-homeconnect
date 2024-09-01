// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2023 Alexander Thoukydides

import { Perms, Service } from 'homebridge';

import { ApplianceBase } from './appliance-generic';
import { assertIsDefined, Constructor } from './utils';

// Add operation state to an accessory
export function HasActive<TBase extends Constructor<ApplianceBase>>(Base: TBase) {
    return class HasActive extends Base {

        // Accessory services
        readonly activeService?: Service;

        // Mixin constructor
        constructor(...args: any[]) {
            super(...args as ConstructorParameters<TBase>);

            // Check whether an active program switch should be supported
            if (!this.hasOptionalFeature('Switch', 'Active Program')) return;

            // Create a Switch service for the active program
            this.activeService = this.makeService(this.Service.Switch, 'Active Program', 'active');

            // Make On characteristic read-only unless programs can be controlled
            this.activeService.getCharacteristic(this.Characteristic.On)
                .setProps({perms: [Perms.PAIRED_READ, Perms.NOTIFY]});

            // Add additional status characteristics
            this.activeService.addOptionalCharacteristic(this.Characteristic.StatusActive);
            this.activeService.getCharacteristic(this.Characteristic.StatusActive);
            this.activeService.addOptionalCharacteristic(this.Characteristic.StatusFault);
            this.activeService.getCharacteristic(this.Characteristic.StatusFault);

            // Update the status
            const updateHK = this.makeSerialised(() => { this.updateActiveHK(); });
            this.device.on('BSH.Common.Status.OperationState', updateHK);
            this.device.on('connected',                        updateHK);
        }

        // Deferred update of HomeKit state from Home Connect events
        updateActiveHK(): void {
            // Map the connection status and OperationState to the individual characteristics
            const disconnected = !this.device.getItem('connected');
            const isActive = !disconnected && this.device.isOperationState('DelayedStart', 'Run', 'Aborting');
            const isStatus = !disconnected && this.device.isOperationState('Inactive', 'Ready', 'DelayedStart', 'Run', 'Finished');
            const isFault  =  disconnected || this.device.isOperationState('Error');

            // Update the characteristics
            const { NO_FAULT, GENERAL_FAULT } = this.Characteristic.StatusFault;
            assertIsDefined(this.activeService);
            this.activeService.updateCharacteristic(this.Characteristic.On, isActive);
            this.activeService.updateCharacteristic(this.Characteristic.StatusActive, isStatus);
            this.activeService.updateCharacteristic(this.Characteristic.StatusFault, isFault ? GENERAL_FAULT : NO_FAULT);

            // Log the status
            const operationState = (this.device.getItem('BSH.Common.Status.OperationState') ?? '')
                .replace(/^.*\./, '');
            this.log.info((isActive ? 'Active' : 'Inactive')
                        + (isStatus ? '' : ', attention required')
                        + (isFault ? ', in error state' : '')
                        + (disconnected ? ' (disconnected)' : ` (${operationState})`));
        }
    };
}