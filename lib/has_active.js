// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2022 Alexander Thoukydides

'use strict';

// Mapping from OperationState to the individual characteristics
const OPERATION_STATE_MAPPING ={
    Inactive:       { active: false, status: true,  fault: false },
    Ready:          { active: false, status: true,  fault: false },
    DelayedStart:   { active: true,  status: true,  fault: false },
    Run:            { active: true,  status: true,  fault: false },
    Pause:          { active: false, status: false, fault: false },
    ActionRequired: { active: false, status: false, fault: false },
    Finished:       { active: false, status: true,  fault: false },
    Error:          { active: false, status: false, fault: true  },
    Aborting:       { active: true,  status: false, fault: false },
    // Fake OperationState for when the appliance is disconnected
    Disconnected:   { active: false, status: false, fault: true  }
};

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
                let state = isDisconnected ? 'Disconnected' : operationState;
                if (state === undefined) return;
                let mappedState = OPERATION_STATE_MAPPING[state];
                if (!mappedState)
                    return this.warn('Unsupported OperationState: '
                                     + operationState);

                // Update the characteristics
                this.activeService.updateCharacteristic(
                    Characteristic.On, mappedState.active);
                this.activeService.updateCharacteristic(
                    Characteristic.StatusActive, mappedState.status);
                this.activeService.updateCharacteristic(
                    Characteristic.StatusFault,
                    mappedState.fault ? GENERAL_FAULT : NO_FAULT);

                // Log the status
                this.log((mappedState.active ? 'Active' : 'Inactive')
                         + (mappedState.status ? '' : ', attention required')
                         + (mappedState.fault ? ', in error state' : '')
                         + (isDisconnected ? ' (disconnected)'
                                           : ' (' + operationState + ')'));
            });
        };
        this.device.on('BSH.Common.Status.OperationState', item => {
            // Remove the enum prefix from the value
            operationState = item.value.replace(
                    /^BSH\.Common\.EnumType\.OperationState\./, '');
            update();
        });
        this.device.on('connected', item => {
            isDisconnected = !item.value;
            update();
        });
    }
}
