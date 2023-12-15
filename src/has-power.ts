// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2023 Alexander Thoukydides

import { Perms, Service } from 'homebridge';

import { PowerState } from './api-value-types';
import { ApplianceBase } from './appliance-generic';
import { Constructor } from './utils';

// Add a power switch to an accessory
export function HasPower<TBase extends Constructor<ApplianceBase>>(Base: TBase) {
    return class HasPower extends Base {

        // Accessory services
        readonly powerService: Service;

        // The power off setting to use if the appliance reports multuple
        defaultOffValue?: PowerState;

        // Mixin constructor
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        constructor(...args: any[]) {
            super(...args);

            // Add power Switch service to host the appliance's main characteristics
            this.powerService = this.makeService(this.Service.Switch, 'Power', 'power');
            this.powerService.setPrimaryService(true);

            // Add a characteristic for the power state, initially read-only
            this.powerService.getCharacteristic(this.Characteristic.On)
                .setProps({ perms: [Perms.PAIRED_READ, Perms.NOTIFY] });

            // Continue initialisation asynchronously
            this.asyncInitialise('Power', this.initHasPower());
        }

        // Asynchronous initialisation
        async initHasPower(): Promise<void> {
            // Update the status
            const updateHK = this.makeSerialised(() => this.updatePowerHK());
            this.device.on('BSH.Common.Setting.PowerState', updateHK);
            this.device.on('connected',                     updateHK);

            // Check whether the appliance supports off or standby
            const setting = await this.getCached(
                'power', () => this.device.getSetting('BSH.Common.Setting.PowerState'));
            const allValues = setting?.constraints?.allowedvalues ?? [];
            let offValues = allValues.filter(value => value !== PowerState.On);
            if (!offValues.length) return this.log.info('Cannot be switched off');

            // Workaround appliances incorrectly reporting multiple off settings
            if (1 < offValues.length) {
                if (this.defaultOffValue && offValues.includes(this.defaultOffValue)) {
                    this.log.debug(`Appliance reported multiple power off settings; using default (${this.defaultOffValue})`);
                    offValues = [this.defaultOffValue];
                } else {
                    this.log.debug(`Appliance reported multiple power off settings; using the first (${offValues[0]})`);
                    offValues.length = 1;
                }
            }

            // Make the power state characteristic writable
            this.log.info(`Can be ${this.defaultOffValue === PowerState.Standby ? 'placed in standby' : 'switched off'}`);
            this.powerService.getCharacteristic(this.Characteristic.On)
                .setProps({ perms: [Perms.PAIRED_READ, Perms.PAIRED_WRITE, Perms.NOTIFY] })
                .onSet(this.onSetBoolean(async value => {
                    this.log.info(`SET ${value ? 'On' : 'Off'}`);
                    await this.device.setSetting('BSH.Common.Setting.PowerState', value ? PowerState.On : offValues[0]);
                }));
        }

        // Deferred update of HomeKit state from Home Connect events
        updatePowerHK(): void {
            const disconnected = !this.device.getItem('connected');
            const powerOn = !disconnected
                && this.device.getItem('BSH.Common.Setting.PowerState') === PowerState.On;
            this.log.info(`${powerOn ? 'On' : 'Off'}${disconnected ? ' (disconnected)' : ''}`);
            this.powerService.updateCharacteristic(this.Characteristic.On, powerOn);
        }

        // Explicitly specify the setting used to switch the appliance off
        hasPowerOff(offValue: PowerState): void {
            this.defaultOffValue = offValue;
        }
    };
}