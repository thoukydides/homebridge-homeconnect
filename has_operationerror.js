// Homebridge plugin for Home Connect home appliances
// Copyright © 2019 Alexander Thoukydides

'use strict';

const HasOperation = require('./has_operation.js');

// Add operation state with error condition to an accessory
module.exports = {
    init() {
        // Also add the operation state support
        this.mixin(HasOperation);

        // Shortcuts to useful HAP objects
        const Characteristic = this.homebridge.hap.Characteristic;
        const { NO_FAULT, GENERAL_FAULT } = Characteristic.StatusFault;

        // Add a status fault characteristic
        this.haService.getCharacteristic(Characteristic.StatusFault);

        // Update the status
        this.device.on('BSH.Common.Status.OperationState', item => {
            let errorStates = [
                'BSH.Common.EnumType.OperationState.Error'
            ];
            let statusFault = errorStates.includes(item.value)
                              ? GENERAL_FAULT : NO_FAULT;
            if (statusFault == GENERAL_FAULT) this.log('Error state');
            this.haService.updateCharacteristic(Characteristic.StatusFault,
                                                statusFault);
        });
    }
}
