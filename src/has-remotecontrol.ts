// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2023 Alexander Thoukydides

import { Service } from 'homebridge';

import { ApplianceBase } from './appliance-generic.js';
import { Constructor, formatList } from './utils.js';
import { StatusKey, StatusValue } from './api-value.js';

// Add local and remote control state to an accessory
export function HasRemoteControl<TBase extends Constructor<ApplianceBase & { powerService: Service }>>(Base: TBase) {
    return class HasRemoteControl extends Base {

        // Mixin constructor
        constructor(...args: any[]) {
            super(...args as ConstructorParameters<TBase>);

            // Use ProgramMode characteristic to indicate local and remote control
            this.powerService.addOptionalCharacteristic(this.Characteristic.ProgramMode);
            this.powerService.getCharacteristic(this.Characteristic.ProgramMode);

            // Update the status
            const updateHK = this.makeSerialised(() => { this.updateRemoteControlHK(); });
            this.device.on('BSH.Common.Status.RemoteControlActive',       updateHK);
            this.device.on('BSH.Common.Status.RemoteControlStartAllowed', updateHK);
            this.device.on('BSH.Common.Status.LocalControlActive',        updateHK);
        }

        // Deferred update of HomeKit state from Home Connect events
        updateRemoteControlHK(): void {
            // Read the most recent state and generate a description
            const detailBits: string[] = [];
            const read = <Key extends StatusKey>(key: Key, values: Record<string, string>, prefix?: string):
            StatusValue<Key> | undefined => {
                const state = this.device.getItem(key);
                let detail = values[`${state}`];
                if (detail) {
                    if (prefix) detail = `${prefix} ${detail}`;
                    detailBits.push(detail);
                }
                return state;
            };
            const remoteControl = read('BSH.Common.Status.RemoteControlActive',
                                       { true: 'activated', false: 'not activated' }, 'remote control');
            const remoteStart   = read('BSH.Common.Status.RemoteControlStartAllowed',
                                       { true: 'allowed',   false: 'disallowed'    }, 'remote start');
            const localControl  = read('BSH.Common.Status.LocalControlActive',
                                       { true: 'being operated locally' });
            const detail = `(${formatList(detailBits)})`;

            // Map the state to the most appropriate Program Mode characteristic
            const { NO_PROGRAM_SCHEDULED, PROGRAM_SCHEDULED, PROGRAM_SCHEDULED_MANUAL_MODE_ } = this.Characteristic.ProgramMode;
            let programMode;
            if (localControl) {
                // Local control takes priority (reverts after a few seconds)
                this.log.info(`Manual mode ${detail}`);
                programMode = PROGRAM_SCHEDULED_MANUAL_MODE_;
            } else if (remoteControl === false || remoteStart === false) {
                this.log.info(`Remote operation NOT enabled ${detail}`);
                programMode = NO_PROGRAM_SCHEDULED;
            } else {
                this.log.info(`Remote operation enabled ${detail}`);
                programMode = PROGRAM_SCHEDULED;
            }
            this.powerService.updateCharacteristic(this.Characteristic.ProgramMode, programMode);
        }
    };
}