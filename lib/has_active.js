// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2020 Alexander Thoukydides

'use strict';

// Add operation state to an accessory
module.exports = {
    init() {
        // Shortcuts to useful HAP objects
        const Service = this.homebridge.hap.Service;
        const Characteristic = this.homebridge.hap.Characteristic;

        // Create a Switch service for the active program
        let subtype = 'active';
        this.activeService =
            this.accessory.getServiceByUUIDAndSubType(Service.Switch, subtype)
            || this.accessory.addService(Service.Switch,
                                       this.name + ' active program', subtype);

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

        // Update the HomeKit status when the OperationState changes
        this.device.on('BSH.Common.Status.OperationState', item => {
            // Remove the enum prefix from the value
            let value = item.value.replace(
                    /^BSH\.Common\.EnumType\.OperationState\./, '');
            
            // Map the operation state to the three characteristics
            let mappedState = {
                Inactive:       { active: false, status: true,  fault: false },
                Ready:          { active: false, status: true,  fault: false },
                DelayedStart:   { active: true,  status: true,  fault: false },
                Run:            { active: true,  status: true,  fault: false },
                Pause:          { active: false, status: false, fault: false },
                ActionRequired: { active: false, status: false, fault: false },
                Finished:       { active: false, status: true,  fault: false },
                Error:          { active: false, status: false, fault: true  },
                Aborting:       { active: true,  status: false, fault: false }
            }[value];
            if (!mappedState)
                throw new Error('Unsupported OperationState: ' + item.value);

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
                     + ' (' + value + ')');
        });

        // Indicate an error if the device is disconnected
        this.device.on('connected', item => {
            if (!item.value) {
                this.activeService.updateCharacteristic(
                    Characteristic.On, false);
                this.activeService.updateCharacteristic(
                    Characteristic.StatusActive, false);
                this.activeService.updateCharacteristic(
                    Characteristic.StatusFault, GENERAL_FAULT);
            }
        });
    }
}
