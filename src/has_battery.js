// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2023 Alexander Thoukydides

let Service, Characteristic;

// Battery level to treat as low battery
const LOW_BATTERY = 15; // (percent)

// Add battery status to an accessory
module.exports = {
    name: 'HasBattery',

    // Initialise the mixin
    async init() {
        // Shortcuts to useful HAP objects
        Service = this.homebridge.hap.Service;
        Characteristic = this.homebridge.hap.Characteristic;

        // Add a battery service
        let service = this.accessory.getService(Service.BatteryService)
            || this.accessory.addService(Service.BatteryService, 'Battery');

        // Update the battery level (and low battery status)
        const { BATTERY_LEVEL_NORMAL, BATTERY_LEVEL_LOW } =
              Characteristic.StatusLowBattery;
        this.device.on('BSH.Common.Status.BatteryLevel', level => {
            level = Math.round(level);
            this.log('Battery level ' + level + '%');
            service.updateCharacteristic(Characteristic.BatteryLevel, level);
            service.updateCharacteristic(
                Characteristic.StatusLowBattery,
                LOW_BATTERY < level ? BATTERY_LEVEL_NORMAL : BATTERY_LEVEL_LOW);
        });

        // Update the charging state
        const { NOT_CHARGING, CHARGING, NOT_CHARGEABLE } =
              Characteristic.ChargingState;
        let scheduled;
        let updateCharger = () => {
            clearTimeout(scheduled);
            scheduled = setTimeout(() => {
                let charging = this.device.getItem('BSH.Common.Status.BatteryChargingState')
                               === 'BSH.Common.EnumType.BatteryChargingState.Charging';
                let connected = this.device.getItem('BSH.Common.Status.ChargingConnection')
                                === 'BSH.Common.EnumType.ChargingConnection.Connected';
                let chargingState;
                if (charging) {
                    this.log('Battery is charging');
                    chargingState = CHARGING;
                } else if (connected) {
                    this.log('Connected to docking station, but not charging');
                    chargingState = NOT_CHARGING;
                } else {
                    this.log('Not connected to docking station');
                    chargingState = NOT_CHARGEABLE;
                }
                service.updateCharacteristic(Characteristic.ChargingState,
                                             chargingState);
            });
        };
        this.device.on('BSH.Common.Status.BatteryChargingState', updateCharger);
        this.device.on('BSH.Common.Status.ChargingConnection',   updateCharger);
    }
};
