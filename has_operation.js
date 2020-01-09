// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2020 Alexander Thoukydides

'use strict';

// Add operation state to an accessory
module.exports = {
    init() {
        // Shortcuts to useful HAP objects
        const Characteristic = this.homebridge.hap.Characteristic;

        // Add a read-only active characteristic
        const { INACTIVE, ACTIVE } = Characteristic.Active;
        this.powerService.addOptionalCharacteristic(Characteristic.Active);
        this.powerService.getCharacteristic(Characteristic.Active)
            .setProps({perms: [Characteristic.Perms.READ,
                               Characteristic.Perms.NOTIFY]});

        // Update the status
        this.device.on('BSH.Common.Status.OperationState', item => {
            const activeStates = [
                'BSH.Common.EnumType.OperationState.DelayedStart',
                'BSH.Common.EnumType.OperationState.Run',
                'BSH.Common.EnumType.OperationState.Aborting'
            ];
            let active = activeStates.includes(item.value)
                         ? ACTIVE : INACTIVE;
            this.powerService.updateCharacteristic(
                Characteristic.Active, active);
            this.log(active == ACTIVE ? 'Active' : 'Inactive');
        });
    }
}
