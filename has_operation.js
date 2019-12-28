// Homebridge plugin for Home Connect home appliances
// Copyright © 2019 Alexander Thoukydides

'use strict';

// Add operation state to an accessory
module.exports = {
    init() {
        // Shortcuts to useful HAP objects
        const Characteristic = this.homebridge.hap.Characteristic;
        const { INACTIVE, ACTIVE } = Characteristic.Active;

        // Add active and fault status
        this.haService.getCharacteristic(Characteristic.Active)
            .setProps({perms: [Characteristic.Perms.READ,
                               Characteristic.Perms.NOTIFY]});
        this.haService.getCharacteristic(Characteristic.StatusActive);

        // Update the status
        this.device.on('BSH.Common.Status.OperationState', item => {
            
            const inactiveStates = [
                'BSH.Common.EnumType.OperationState.Inactive',
                'BSH.Common.EnumType.OperationState.Ready',
                'BSH.Common.EnumType.OperationState.Finished'
            ];
            let active = inactiveStates.includes(item.value)
                         ? INACTIVE : ACTIVE;
            this.haService.updateCharacteristic(Characteristic.Active,
                                                active);

            const runStates = [
                'BSH.Common.EnumType.OperationState.Run'
            ];
            let statusActive = runStates.includes(item.value);
            this.haService.updateCharacteristic(Characteristic.StatusActive,
                                                statusActive);

            this.log((active == ACTIVE ? 'Active' : 'Inactive')
                     + (statusActive ? ' and program running' : ''));
        });
    }
}
