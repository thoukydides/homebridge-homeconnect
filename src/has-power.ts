// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2023 Alexander Thoukydides

import { HAPStatus, Perms, Service } from 'homebridge';

import { PowerState } from './api-value-types.js';
import { ApplianceBase } from './appliance-generic.js';
import { Constructor } from './utils.js';

// Add a power switch to an accessory
export function HasPower<TBase extends Constructor<ApplianceBase>>(Base: TBase) {
    return class HasPower extends Base {

        // Accessory services
        readonly powerService: Service;

        // The power off setting to use if the appliance reports multiple
        defaultOffValue?: PowerState;

        // Mixin constructor
        constructor(...args: any[]) {
            super(...args as ConstructorParameters<TBase>);

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
            const updateHK = this.makeSerialised(() => { this.updatePowerHK(); });
            this.device.on('BSH.Common.Setting.PowerState', updateHK);
            this.device.on('connected',                     updateHK);

            // Check whether the appliance supports off or standby
            const setting = await this.getCached(
                'power', () => this.device.getSetting('BSH.Common.Setting.PowerState'));
            const allValues = setting?.constraints?.allowedvalues ?? [];
            const offValues: PowerState[] = allValues.filter(value => value !== PowerState.On);
            let powerStateOff = offValues[0];
            if (powerStateOff === undefined) {
                this.log.info('Cannot be switched off');
                return;
            }

            // Workaround appliances incorrectly reporting multiple off settings
            if (1 < offValues.length) {
                if (this.defaultOffValue && offValues.includes(this.defaultOffValue)) {
                    this.log.debug(`Appliance reported multiple power off settings; using default (${this.defaultOffValue})`);
                    powerStateOff = this.defaultOffValue;
                } else {
                    this.log.debug(`Appliance reported multiple power off settings; using the first (${powerStateOff})`);
                }
            }

            // Make the power state characteristic writable
            this.log.info(`Can be ${this.defaultOffValue === PowerState.Standby ? 'placed in standby' : 'switched off'}`);
            this.powerService.getCharacteristic(this.Characteristic.On)
                .setProps({ perms: [Perms.PAIRED_READ, Perms.PAIRED_WRITE, Perms.NOTIFY] })
                .onSet(this.onSetBoolean(async value => {
                    this.log.info(`SET ${value ? 'On' : 'Off'}`);
                    await this.device.setSetting('BSH.Common.Setting.PowerState', value ? PowerState.On : powerStateOff);
                }));
        }

        // Deferred update of HomeKit state from Home Connect events
        updatePowerHK(): void {
            if (this.device.getItem('connected')) {
                const powerOn = this.device.getItem('BSH.Common.Setting.PowerState') === PowerState.On;
                this.log.info(powerOn ? 'On' : 'Off');
                this.powerService.updateCharacteristic(this.Characteristic.On, powerOn);
            } else {
                const powerOn = new this.platform.hb.hap.HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE);
                this.log.info('Disconnected (setting On error status)');
                this.powerService.updateCharacteristic(this.Characteristic.On, powerOn);
            }
        }

        // Explicitly specify the setting used to switch the appliance off
        hasPowerOff(offValue: PowerState): void {
            this.defaultOffValue = offValue;
        }
    };
}