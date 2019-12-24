// Homebridge plugin for Home Connect home appliances
// Copyright © 2019 Alexander Thoukydides

'use strict';

// Custom Homebridge services for Home Connect appliances
module.exports = hap => {
    let Service = hap.Service;
    let Characteristic = hap.Characteristic;
    let UUID = hap.uuid;
    
    // A home appliance service
    // (excludes features supported by standard Apple-defined services)
    Service.HomeAppliance = class extends Service {
        constructor(displayName, subtype) {
            super(displayName, Service.HomeAppliance.UUID, subtype);

            // Only some home appliances have these characteristics
            this.addOptionalCharacteristic(Characteristic.CurrentDoorState);
            this.addOptionalCharacteristic(Characteristic.RemainingDuration);
            this.addOptionalCharacteristic(Characteristic.Active);
            this.addOptionalCharacteristic(Characteristic.StatusActive);
            this.addOptionalCharacteristic(Characteristic.StatusFault);
        }
    };
    Service.HomeAppliance.UUID =
        UUID.generate('homebridge-homeconnect:Service:HomeAppliance');
}
