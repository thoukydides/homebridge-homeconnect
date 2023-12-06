// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2023 Alexander Thoukydides

import { DoorState, EventPresentState } from './api-value-types';

// Add events to an accessory
module.exports = {
    name: 'HasEvents',

    // Initialise the mixin
    init(events) {
        // Shortcuts to useful HAP objects
        const Service = this.homebridge.hap.Service;
        const Characteristic = this.homebridge.hap.Characteristic;

        // Create a label service if there are multiple events
        if (1 < Object.keys(events).length) {
            this.labelService =
                this.accessory.getService(Service.ServiceLabel)
                || this.accessory.addService(Service.ServiceLabel, 'Events');
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
                    Service.StatelessProgrammableSwitch, name, event);
            service.addOptionalCharacteristic(Characteristic.ConfiguredName);
            service.setCharacteristic(Characteristic.ConfiguredName, name);

            // Configure the service
            const SINGLE = Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS;
            service.getCharacteristic(Characteristic.ProgrammableSwitchEvent)
                .setProps({ minValue: SINGLE, maxValue: SINGLE,
                    validValues: [SINGLE] });

            // If there are multiple events then add a service label index
            if (this.labelService) {
                service.updateCharacteristic(Characteristic.ServiceLabelIndex,
                                             index);
                service.addLinkedService(this.labelService);
            }

            // Update the status
            this.device.on(event, eventStatus => {
                switch (eventStatus) {
                case EventPresentState.Present:
                case DoorState.Open: // (FridgeFreezer simulator workaround)
                    this.log('Event ' + name);
                    service.updateCharacteristic(
                        Characteristic.ProgrammableSwitchEvent, SINGLE);
                    break;
                case EventPresentState.Confirmed:
                    this.log('Event ' + name + ' confirmed (ignored)');
                    break;
                case EventPresentState.Off:
                    this.log('Event ' + name + ' off (ignored)');
                    break;
                default:
                    this.warn("Unsupported event status '" + eventStatus + "'");
                    break;
                }
            });
        });
    }
};
