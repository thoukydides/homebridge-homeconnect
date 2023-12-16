// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2023 Alexander Thoukydides

import { Service } from 'homebridge';

import { ApplianceBase } from './appliance-generic';
import { Constructor, formatSeconds } from './utils';

// Maximum remaining program duration (Home Connect documentation specifies 38340 seconds)
const MAX_DELAY_DURATION     = 86340; // (seconds)
const MAX_PROGRAM_DURATION   = 86340; // (seconds)
const MAX_REMAINING_DURATION = MAX_DELAY_DURATION + MAX_PROGRAM_DURATION;

// Program phase used to determine the time remaining
type RemainingTimeState = 'idle' | 'delayed start' | 'active';

// Add remaining program time to an accessory
export function HasRemainingTime<TBase extends Constructor<ApplianceBase & { activeService: Service }>>(Base: TBase) {
    return class HasRemainingTime extends Base {

        // Mixin constructor
        constructor(...args: any[]) {
            super(...args);

            // Add a progress position
            this.activeService.addOptionalCharacteristic(this.Characteristic.RemainingDuration);
            this.activeService.getCharacteristic(this.Characteristic.RemainingDuration)
                .setProps({ maxValue: MAX_REMAINING_DURATION });

            // Update the status
            const updateHK = this.makeSerialised<RemainingTimeState>(value => this.updateRemainingTimeHK(value), 'idle');
            this.device.on('BSH.Common.Option.StartInRelative',      () => updateHK());
            this.device.on('BSH.Common.Option.RemainingProgramTime', () => updateHK());
            this.device.on('BSH.Common.Event.ProgramFinished',       () => updateHK('idle'));
            this.device.on('BSH.Common.Event.ProgramAborted',        () => updateHK('idle'));
            this.device.on('BSH.Common.Status.OperationState',       () =>
                updateHK(this.device.isOperationState('DelayedStart') ? 'delayed start'
                         : (!this.device.isOperationState('Inactive', 'Ready', 'Finished') ? 'active' : 'idle')));
        }

        // Deferred update of HomeKit state from Home Connect events
        updateRemainingTimeHK(state: RemainingTimeState): void {
            // Determine the remaining duration
            const timeDelay     = this.device.getItem('BSH.Common.Option.StartInRelative')      ?? 0;
            const timeRemaining = this.device.getItem('BSH.Common.Option.RemainingProgramTime') ?? 0;
            let remainingDuration = 0, description;
            switch (state) {
            case 'delayed start':
                remainingDuration = timeDelay + timeRemaining;
                description = `Program will start in ${formatSeconds(timeDelay)}`
                            + ` (total ${formatSeconds(remainingDuration)} remaining)`;
                break;
            case 'active':
                remainingDuration = timeRemaining;
                description = `Program has ${formatSeconds(remainingDuration)} remaining`;
                break;
            default:
                description = 'No program running';
                break;
            }

            // Update the characteristic if the duration has changed
            const prevRemainingDuration = this.activeService.getCharacteristic(this.Characteristic.RemainingDuration).value;
            if (remainingDuration !== prevRemainingDuration) {
                this.log.info(description);
                this.activeService.updateCharacteristic(this.Characteristic.RemainingDuration, remainingDuration);
            }
        }
    };
}