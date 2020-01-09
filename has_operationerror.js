// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2020 Alexander Thoukydides

'use strict';

const HasOperation = require('./has_operation.js');

// Add operation state with error condition to an accessory
module.exports = {
    init() {
        // Also add the basic operation state support
        this.mixin(HasOperation, false);

        // Shortcuts to useful HAP objects
        const Characteristic = this.homebridge.hap.Characteristic;

        // Add various status characteristics
        const { NO_FAULT, GENERAL_FAULT } = Characteristic.StatusFault;
        this.powerService
            .addOptionalCharacteristic(Characteristic.StatusActive);
        this.powerService.getCharacteristic(Characteristic.StatusActive);
        this.powerService
            .addOptionalCharacteristic(Characteristic.StatusFault);
        this.powerService.getCharacteristic(Characteristic.StatusFault);

        // Update the status
        this.device.on('BSH.Common.Status.OperationState', item => {

            const statusActiveStates = [
                'BSH.Common.EnumType.OperationState.Inactive',
                'BSH.Common.EnumType.OperationState.Ready',
                'BSH.Common.EnumType.OperationState.DelayedStart',
                'BSH.Common.EnumType.OperationState.Run',
                'BSH.Common.EnumType.OperationState.Finished'
            ];
            let statusActive = statusActiveStates.includes(item.value);
            let msg = statusActive ? 'Normal operation' : 'Attention required';
            this.powerService.updateCharacteristic(Characteristic.StatusActive,
                                                statusActive);

            let errorStates = [
                'BSH.Common.EnumType.OperationState.Error'
            ];
            let statusFault = errorStates.includes(item.value)
                              ? GENERAL_FAULT : NO_FAULT;
            if (statusFault != NO_FAULT) msg += ', in error state';
            this.powerService.updateCharacteristic(Characteristic.StatusFault,
                                                statusFault);

            this.log((statusActive ? 'Normal operation' : 'Attention required')
                     + (statusFault == NO_FAULT ? '' : ', in error state'));
        });
        this.device.on('connected', item => {
            if (!item.value) {
                // Indicate an error if the device is disconnected
                this.powerService.updateCharacteristic(
                    Characteristic.StatusActive, false);
                this.powerService.updateCharacteristic(
                    Characteristic.StatusFault, GENERAL_FAULT);
            }
        });
    }
}
