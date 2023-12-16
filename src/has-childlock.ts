// Homebridge plugin for Home Connect home appliances
// Copyright © 2021-2023 Alexander Thoukydides

import { Service } from 'homebridge';

import { ApplianceBase } from './appliance-generic';
import { Constructor } from './utils';

// Add a child lock to an accessory
export function HasChildLock<TBase extends Constructor<ApplianceBase & { powerService: Service }>>(Base: TBase) {
    return class HasChildLock extends Base {

        // Mixin constructor
        constructor(...args: any[]) {
            super(...args);

            // Continue initialisation asynchronously
            this.asyncInitialise('Child Lock', this.initHasChildLock());
        }

        // Asynchronous initialisation
        async initHasChildLock(): Promise<void> {
            // Check whether the appliance supports a child lock
            const allSettings = await this.getCached('settings', () => this.device.getSettings());
            if (!allSettings.some(s => s.key === 'BSH.Common.Setting.ChildLock'))
                return this.log.info('Does not support a child lock');

            // Add the lock physical controls characteristic
            const { CONTROL_LOCK_DISABLED, CONTROL_LOCK_ENABLED } = this.Characteristic.LockPhysicalControls;
            this.powerService.addOptionalCharacteristic(this.Characteristic.LockPhysicalControls);

            // Change the child lock status
            this.powerService.getCharacteristic(this.Characteristic.LockPhysicalControls)
                .onSet(this.onSetNumber(async value => {
                    const isEnabled = value === CONTROL_LOCK_ENABLED;
                    this.log.info(`SET Child lock ${isEnabled ? 'enabled' : 'disabled'}`);
                    await this.device.setSetting('BSH.Common.Setting.ChildLock', isEnabled);
                }));

            // Update the child lock status
            this.device.on('BSH.Common.Setting.ChildLock', childLock => {
                this.log.info(`Child lock ${childLock ? 'enabled' : 'disabled'}`);
                this.powerService.updateCharacteristic(this.Characteristic.LockPhysicalControls,
                                                       childLock ? CONTROL_LOCK_ENABLED : CONTROL_LOCK_DISABLED);
            });
        }
    };
}