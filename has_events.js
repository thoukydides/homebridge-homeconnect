// Homebridge plugin for Home Connect home appliances
// Copyright © 2019 Alexander Thoukydides

'use strict';

// Add events to an accessory
module.exports = {
    init(events) {
        // Shortcuts to useful HAP objects
        const Service = this.homebridge.hap.Service;
        const Characteristic = this.homebridge.hap.Characteristic;
        
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
}
