// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2023 Alexander Thoukydides

import { Service } from 'homebridge';

import { setImmediate as setImmediateP } from 'timers/promises';

import { DoorState, EventPresentState } from './api-value-types';
import { ApplianceBase } from './appliance-generic';
import { Constructor } from './utils';
import { EventKey } from './api-value';
import { columns } from './utils';

// All possible EVENTs
type Event = EventKey<'EVENT'>;

// Event description
export interface EventDescription {
    event:  Event;
    name:   string;
}

// Add events to an accessory
export function HasEvents<TBase extends Constructor<ApplianceBase>>(Base: TBase) {
    return class HasEvents extends Base {

        // Accessory services
        readonly eventService: Service[] = [];
        labelService?: Service;

        // Details of events
        readonly events: EventDescription[] = [];

        // Mixin constructor
        constructor(...args: any[]) {
            super(...args as ConstructorParameters<TBase>);

            // Continue initialisation asynchronously
            this.asyncInitialise('Events', this.initHasEvents());
        }

        // Asynchronous initialisation (after hasEvent called)
        async initHasEvents(): Promise<void> {
            // Wait for synchronous initialisation to finish
            await setImmediateP();

            // Check whether events should be supported
            if (this.events.length && !this.hasOptionalFeature('Stateless Programmable Switch', 'Event Buttons')) {
                this.events.length = 0;
                return;
            }

            // Add a service for each event
            this.log.info(`Adding services for ${this.events.length} events`);
            const fields = this.events.map((event, index) => [`Button ${index + 1}:`, event.name, `(${event.event})`]);
            const descriptions = columns(fields);
            for (const event of this.events) {
                this.log.info(`    ${descriptions.shift()}`);
                this.eventService.push(this.addProgrammableSwitchService(event));
            }

            // Add a label service if there are multiple events
            if (1 < this.events.length) {
                this.log.debug('Adding label service for events');
                this.labelService = this.addLabelService();
            }
        }

        // Define an event supported by the appliance
        hasEvent(event: Event, name: string): void {
            this.events.push({ event, name });
        }

        // Create a programmable switch service for an event
        addProgrammableSwitchService({event, name}: EventDescription): Service {
            // Create the programmable switch service
            const service = this.makeService(this.Service.StatelessProgrammableSwitch, name, event);
            const SINGLE = this.Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS;
            service.getCharacteristic(this.Characteristic.ProgrammableSwitchEvent)
                .setProps({ minValue: SINGLE, maxValue: SINGLE, validValues: [SINGLE] });

            // Update the status
            this.device.on(event, eventStatus => {
                switch (eventStatus) {
                case EventPresentState.Present:
                case DoorState.Open as unknown as EventPresentState: // (FridgeFreezer simulator workaround)
                    this.log.info(`Event ${name}`);
                    service.updateCharacteristic(this.Characteristic.ProgrammableSwitchEvent, SINGLE);
                    break;
                case EventPresentState.Confirmed:
                    this.log.info(`Event ${name} confirmed (ignored)`);
                    break;
                case EventPresentState.Off:
                    this.log.info(`Event ${name} off (ignored)`);
                    break;
                default:
                    this.log.warn(`Unsupported event status '${JSON.stringify(eventStatus)}'`);
                    break;
                }
            });
            return service;
        }

        // Create a label service (required when there are multiple events)
        addLabelService(): Service {
            // Create a label service
            const labelService = this.makeService(this.Service.ServiceLabel, 'Events');
            labelService.updateCharacteristic(
                this.Characteristic.ServiceLabelNamespace,
                this.Characteristic.ServiceLabelNamespace.ARABIC_NUMERALS);

            // Assign unique labels to the event services and link them to the label service
            this.eventService.forEach((eventService, index) => {
                eventService.updateCharacteristic(this.Characteristic.ServiceLabelIndex, index + 1);
                eventService.addLinkedService(labelService);
            });
            return labelService;
        }
    };
}