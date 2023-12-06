// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2023 Alexander Thoukydides

// Add operation state to an accessory
module.exports = {
    name: 'HasActive',

    // Initialise the mixin
    init() {
        // Shortcuts to useful HAP objects
        const Service = this.homebridge.hap.Service;
        const Characteristic = this.homebridge.hap.Characteristic;

        // Create a Switch service for the active program
        let subtype = 'active';
        this.activeService =
            this.accessory.getServiceByUUIDAndSubType(Service.Switch, subtype)
            || this.accessory.addService(Service.Switch,
                                         'Active Program', subtype);
        this.activeService
            .addOptionalCharacteristic(Characteristic.ConfiguredName);
        this.activeService
            .setCharacteristic(Characteristic.ConfiguredName, 'Active Program');

        // Make On characteristic read-only unless programs can be controlled
        this.activeService.getCharacteristic(Characteristic.On)
            .setProps({perms: [Characteristic.Perms.READ,
                               Characteristic.Perms.NOTIFY]});

        // Add additional status characteristics
        const { NO_FAULT, GENERAL_FAULT } = Characteristic.StatusFault;
        this.activeService
            .addOptionalCharacteristic(Characteristic.StatusActive);
        this.activeService.getCharacteristic(Characteristic.StatusActive);
        this.activeService
            .addOptionalCharacteristic(Characteristic.StatusFault);
        this.activeService.getCharacteristic(Characteristic.StatusFault);

        // Update the status
        let isDisconnected, operationState, scheduled;
        let update = () => {
            clearTimeout(scheduled);
            scheduled = setTimeout(() => {
                // Map the OperationState to the individual characteristics
                let isActive = !isDisconnected && this.device.isOperationState('DelayedStart', 'Run', 'Aborting');
                let isStatus = !isDisconnected && this.device.isOperationState('Inactive', 'Ready', 'DelayedStart', 'Run', 'Finished');
                let isFault  =  isDisconnected || this.device.isOperationState('Error');

                // Update the characteristics
                this.activeService.updateCharacteristic(
                    Characteristic.On, isActive);
                this.activeService.updateCharacteristic(
                    Characteristic.StatusActive, isStatus);
                this.activeService.updateCharacteristic(
                    Characteristic.StatusFault, isFault ? GENERAL_FAULT : NO_FAULT);

                // Log the status
                this.log((isActive ? 'Active' : 'Inactive')
                         + (isStatus ? '' : ', attention required')
                         + (isFault ? ', in error state' : '')
                         + (isDisconnected ? ' (disconnected)'
                                           : ' (' + operationState + ')'));
            });
        };
        this.device.on('BSH.Common.Status.OperationState', state => {
            // Remove the enum prefix from the value
            operationState = state.replace(/^.*\./, '');
            update();
        });
        this.device.on('connected', connected => {
            isDisconnected = !connected;
            update();
        });
    }
};
