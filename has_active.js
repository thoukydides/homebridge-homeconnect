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

        // Make the switch read-only unless programs can be controlled
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
        this.device.on('BSH.Common.Status.OperationState', item => {
            const activeStates = [
                'BSH.Common.EnumType.OperationState.DelayedStart',
                'BSH.Common.EnumType.OperationState.Run',
                'BSH.Common.EnumType.OperationState.Aborting'
            ];
            let active = activeStates.includes(item.value);
            this.activeService.updateCharacteristic(Characteristic.On, active);

            const statusActiveStates = [
                'BSH.Common.EnumType.OperationState.Inactive',
                'BSH.Common.EnumType.OperationState.Ready',
                'BSH.Common.EnumType.OperationState.DelayedStart',
                'BSH.Common.EnumType.OperationState.Run',
                'BSH.Common.EnumType.OperationState.Finished'
            ];
            let statusActive = statusActiveStates.includes(item.value);
            this.activeService.updateCharacteristic(Characteristic.StatusActive,
                                                statusActive);

            let errorStates = [
                'BSH.Common.EnumType.OperationState.Error'
            ];
            let statusFault = errorStates.includes(item.value)
                              ? GENERAL_FAULT : NO_FAULT;
            if (statusFault != NO_FAULT) msg += ', in error state';
            this.activeService.updateCharacteristic(Characteristic.StatusFault,
                                                statusFault);

            this.log((statusActive ? 'Normal operation' : 'Attention required')
                     + (active ? ', active' : ', inactive')
                     + (statusFault == NO_FAULT ? '' : ', in error state'));
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
