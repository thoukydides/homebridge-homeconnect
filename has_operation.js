// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2020 Alexander Thoukydides

'use strict';

// Add operation state to an accessory
module.exports = {
    init(removeStatusActive = true) {
        // Shortcuts to useful HAP objects
        const Characteristic = this.homebridge.hap.Characteristic;

        // The original implementation had a StatusActive characteristic
        if (removeStatusActive) {
            let characteristic = this.haService.characteristics.find(
                c => c.UUID == Characteristic.StatusActive.UUID);
            if (characteristic)
                this.haService.removeCharacteristic(characteristic);
        }

        // Add a read-only active characteristic
        const { INACTIVE, ACTIVE } = Characteristic.Active;
        this.haService.getCharacteristic(Characteristic.Active)
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
            this.haService.updateCharacteristic(Characteristic.Active, active);

            this.log(active == ACTIVE ? 'Active' : 'Inactive');
        });
    }
}
