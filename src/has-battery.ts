// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2023 Alexander Thoukydides

import { Service } from 'homebridge';

import { ApplianceBase } from './appliance-generic.js';
import { Constructor } from './utils.js';
import { BatteryChargingState, ChargingConnection } from './api-value-types.js';

// Battery level to treat as low battery
const LOW_BATTERY = 15; // (percent)

// Add battery status to an accessory
export function HasBattery<TBase extends Constructor<ApplianceBase>>(Base: TBase) {
    return class HasBattery extends Base {

        // Accessory services
        readonly batteryService: Service;

        // Mixin constructor
        constructor(...args: any[]) {
            super(...args as ConstructorParameters<TBase>);

            // Add a battery service
            this.batteryService = this.makeService(this.Service.Battery, 'Battery');

            // Update the battery level (and low battery status)
            const { BATTERY_LEVEL_NORMAL, BATTERY_LEVEL_LOW } = this.Characteristic.StatusLowBattery;
            this.device.on('BSH.Common.Status.BatteryLevel', level => {
                level = Math.round(level);
                this.log.info(`Battery level ${level}%`);
                this.batteryService.updateCharacteristic(this.Characteristic.BatteryLevel, level);
                this.batteryService.updateCharacteristic(this.Characteristic.StatusLowBattery,
                    LOW_BATTERY < level ? BATTERY_LEVEL_NORMAL : BATTERY_LEVEL_LOW);
            });

            // Update the charging state
            const updateCharger = this.makeSerialised(() => { this.updateBatteryHK(); });
            this.device.on('BSH.Common.Status.BatteryChargingState', updateCharger);
            this.device.on('BSH.Common.Status.ChargingConnection',   updateCharger);
        }

        // Deferred update of HomeKit state from Home Connect events
        updateBatteryHK(): void {
            // Check the current charging status
            const charging  = this.device.getItem('BSH.Common.Status.BatteryChargingState') === BatteryChargingState.Charging;
            const connected = this.device.getItem('BSH.Common.Status.ChargingConnection')   === ChargingConnection.Connected;

            // Update the characteristic
            const { NOT_CHARGING, CHARGING, NOT_CHARGEABLE } = this.Characteristic.ChargingState;
            let chargingState;
            if (charging) {
                this.log.info('Battery is charging');
                chargingState = CHARGING;
            } else if (connected) {
                this.log.info('Connected to docking station, but not charging');
                chargingState = NOT_CHARGING;
            } else {
                this.log.info('Not connected to docking station');
                chargingState = NOT_CHARGEABLE;
            }
            this.batteryService.updateCharacteristic(this.Characteristic.ChargingState, chargingState);
        }
    };
}