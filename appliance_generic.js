// Homebridge plugin for Home Connect home appliances
// Copyright © 2019 Alexander Thoukydides

'use strict';

let Service, Characteristic;

// A Homebridge accessory for a generic Home Connect home appliance
module.exports = class ApplianceGeneric {

    // Initialise an appliance
    constructor(log, homebridge, device, accessory) {
        this.logRaw       = log;
        this.homebridge   = homebridge;
        this.device       = device;
        this.accessory    = accessory;
        this.name         = accessory.displayName;

        // Log some basic information about this appliance
        this.log(device.brand + ' ' + device.type
                 + ' (E-Nr: ' + device.enumber + ')');

        // Shortcuts to useful HAP objects
        Service = homebridge.hap.Service;
        Characteristic = homebridge.hap.Characteristic;

        // Log errors from the Home Connect API
        device.on('error', err => this.error(err));

        // Handle the identify request
        accessory.on('identify', (...args) => this.identify(...args));
        
        // Set the Accessory Information service characteristics
        this.informationService =
            accessory.getService(Service.AccessoryInformation);
        this.informationService
            .setCharacteristic(Characteristic.Manufacturer, device.brand)
            .setCharacteristic(Characteristic.Model,        device.enumber)
            .setCharacteristic(Characteristic.SerialNumber, device.haId)
            .setCharacteristic(Characteristic.FirmwareRevision, '0');

        // Add a Home Appliance service
        this.haService =
            accessory.getService(Service.HomeAppliance)
            || accessory.addService(Service.HomeAppliance, this.name);
        
        // Add a characteristic for the power state, initially read-only
        this.powerService =
            accessory.getService(Service.Switch)
            || accessory.addService(Service.Switch, this.name + ' power');
        this.powerService.getCharacteristic(Characteristic.On)
            .setProps({perms: [Characteristic.Perms.READ,
                               Characteristic.Perms.NOTIFY]});
        
        // Listen for connection and power events
        device.on('connected', item => this.eventConnected(item));
        device.on('BSH.Common.Setting.PowerState',
                  item => this.eventPower(item));
    }

    // The appliance no longer exists so stop updating it
    unregister() {
        this.device.stop();
        this.device.removeAllListeners();
    }

    // Identify this appliance
    identify(paired, callback) {
        this.log('Identify');
        callback();
    }

    // Add power state
    addPowerOff(offValue) {
        // Make the power state characteristic writable
        this.powerStateOff = offValue;
        this.powerService.getCharacteristic(Characteristic.On)
            .setProps({perms: [Characteristic.Perms.READ,
                               Characteristic.Perms.WRITE,
                               Characteristic.Perms.NOTIFY]})
            .on('set', (...args) => this.setPowerOn(...args));
    }

    // Connection status has changed (overrides power state when disconnected)
    eventConnected(item) {
        this.log(item.value ? 'Connected' : 'Disconnected');

        // Update reachability
        this.accessory.updateReachability(item.value);

        // Update the power state if disconnected
        if (!item.value)
            this.powerService.updateCharacteristic(Characteristic.On, false);
    }

    // Power status has changed
    eventPower(item) {
        let isOn = item.value == 'BSH.Common.EnumType.PowerState.On';
        this.log(isOn ? 'On' : 'Off');

        // Update the power state
        this.powerService.updateCharacteristic(Characteristic.On, isOn);
    }

    // Set the power state
    async setPowerOn(value, callback) {
        try {
            
            let powerState = value ? 'BSH.Common.EnumType.PowerState.On'
                                   : this.powerStateOff;
            if (!powerState) {
                // Not all appliances support turning power off
                this.warn('Appliance does not support being switched off'
                          + ' via the Home Connect API');
                throw new Error('Appliance cannot be switched off');
            }
            await this.device.setSetting('BSH.Common.Setting.PowerState',
                                         powerState);
            callback();
            
        } catch (err) {
            
            callback(err);
        }
    }

    // Add a door
    addDoor() {
        this.haService.getCharacteristic(Characteristic.CurrentDoorState)
            .setProps({ maxValue: 1, validValues: [0, 1] });

        // Update the door status
        this.device.on('BSH.Common.Status.DoorState', item => {
            let isClosed = item.value == 'BSH.Common.EnumType.DoorState.Closed';
            this.log('Door ' + (isClosed ? 'closed' : 'open'));
            this.haService.updateCharacteristic(
                Characteristic.CurrentDoorState,
                isClosed ? Characteristic.CurrentDoorState.CLOSED
                         : Characteristic.CurrentDoorState.OPEN);
        });
    }

    // Add events
    addEvents(events) {
        // Create a label service if there are multiple events
        if (1 < Object.keys(events).length) {
            this.labelService =
                this.accessory.getService(Service.ServiceLabel)
                || this.accessory.addService(Service.ServiceLabel, this.name);
            this.labelService.updateCharacteristic(
                Characteristic.ServiceLabelNamespace,
                Characteristic.ServiceLabelNamespace.ARABIC_NUMERALS);
        }

        // Create a programmable switch for each event
        let index = 0;
        Object.keys(events).forEach(event => {
            let name = events[event];
            ++index;
            let service =
                this.accessory.getServiceByUUIDAndSubType(
                    Service.StatelessProgrammableSwitch, event)
                || this.accessory.addService(
                    Service.StatelessProgrammableSwitch,
                    this.name + ' ' + name, event);

            // Configure the service
            const SINGLE = Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS;
            const DOUBLE = Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS;
            service.getCharacteristic(Characteristic.ProgrammableSwitchEvent)
                .setProps({ minValue: SINGLE, maxValue: DOUBLE,
                            validValues: [SINGLE, DOUBLE] });

            // If there are multiple events then add a service label index
            if (this.labelService) {
                service.updateCharacteristic(Characteristic.ServiceLabelIndex,
                                             index);
                service.addLinkedService(this.labelService);
            }

            // Update the status
            this.device.on(event, item => {
                switch (item.value) {
                case 'BSH.Common.EnumType.EventPresentState.Present':
                    this.log('Event ' + name);
                    service.updateCharacteristic(
                        Characteristic.ProgrammableSwitchEvent, SINGLE);
                    break;
                case 'BSH.Common.EnumType.EventPresentState.Confirmed':
                    this.log('Event ' + name + ' confirmed by user');
                    service.updateCharacteristic(
                        Characteristic.ProgrammableSwitchEvent, DOUBLE);
                    break;
                case 'BSH.Common.EnumType.EventPresentState.Off':
                    break;
                }
            });
        });
    }

    // Add remaining program time
    async addProgramRemainingTime() {
        // Add a progress position
        this.haService.getCharacteristic(Characteristic.RemainingDuration)
            .setProps({ maxValue: (24 * 60 - 1) * 60 });
        
        // Update the status
        this.device.on('BSH.Common.Option.RemainingProgramTime', item => {
            this.log('Program ' + item.value + ' seconds remaining');
            this.haService.updateCharacteristic(
                Characteristic.RemainingDuration, item.value);
        });
    }

    // Add operation state
    addOperationState(options = {}) {
        // Add active and fault status
        this.haService.getCharacteristic(Characteristic.Active)
            .setProps({perms: [Characteristic.Perms.READ,
                               Characteristic.Perms.NOTIFY]});
        this.haService.getCharacteristic(Characteristic.StatusActive);
        if (options.hasError)
            this.haService.getCharacteristic(Characteristic.StatusFault);

        // Update the status
        this.device.on('BSH.Common.Status.OperationState', item => {
            let status;
            switch (item.value) {
            case 'BSH.Common.EnumType.OperationState.Inactive':
            case 'BSH.Common.EnumType.OperationState.Ready':
            case 'BSH.Common.EnumType.OperationState.Finished':
                this.log('Inactive');
                status = { active: false, statusActive: false, fault: false };
                break;

            case 'BSH.Common.EnumType.OperationState.Run':
                this.log('Active');
                status = { active: true, statusActive: true, fault: false };
                break;
                
            case 'BSH.Common.EnumType.OperationState.DelayedStart':
            case 'BSH.Common.EnumType.OperationState.Pause':
            case 'BSH.Common.EnumType.OperationState.ActionRequired':
            case 'BSH.Common.EnumType.OperationState.Aborting':
                this.log('Delayed start / Paused / Action required / Aborting');
                status = { active: true, statusActive: false, fault: false };
                break;
                
            case 'BSH.Common.EnumType.OperationState.Error':
            default:
                this.log('Fault');
                status = { active: true, statusActive: false, fault: true };
                break;
            };
            this.haService.updateCharacteristic(Characteristic.Active,
                                                status.active);
            this.haService.updateCharacteristic(Characteristic.StatusActive,
                                                status.statusActive);
            if (options.hasError)
                this.haService.updateCharacteristic(Characteristic.StatusFault,
                                                    status.fault ? 1 : 0);
        });
    }

    // Logging
    logPrefix() { return '[' + this.name + '] '; }
    error(msg)  { this.logRaw.error(this.logPrefix() + msg); }
    warn(msg)   { this.logRaw.warn (this.logPrefix() + msg); }
    log(msg)    { this.logRaw.info (this.logPrefix() + msg); }
    debug(msg)  { this.logRaw.debug(this.logPrefix() + msg); }
}
