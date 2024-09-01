// Homebridge plugin for Home Connect home appliances
// Copyright © 2023 Alexander Thoukydides

import { Service } from 'homebridge';

import { ApplianceBase } from './appliance-generic';
import { Constructor, formatSeconds } from './utils';

// Default maximum alarm clock duration (if unable to read from Home Connect API)
const MAX_ALARM_DURATION = 38340; // (seconds)

// Add an alarm clock to an accessory
export function HasAlarmClock<TBase extends Constructor<ApplianceBase & { powerService: Service }>>(Base: TBase) {
    return class HasAlarmClock extends Base {

        // Mixin constructor
        constructor(...args: any[]) {
            super(...args as ConstructorParameters<TBase>);

            // Continue initialisation asynchronously
            this.asyncInitialise('Alarm Clock', this.initHasAlarmClock());
        }

        // Asynchronous initialisation
        async initHasAlarmClock(): Promise<void> {
            // Check whether the appliance supports an alarm clock
            const allSettings = await this.getCached('settings', () => this.device.getSettings());
            if (!allSettings.some(s => s.key === 'BSH.Common.Setting.AlarmClock')) {
                this.log.info('Does not support an alarm clock');
                return;
            }

            // Check the maximum supported alarm clock duration
            const setting = await this.getCached(
                'alarmclock', () => this.device.getSetting('BSH.Common.Setting.AlarmClock'));

            // Add a set duration characteristic for the alarm clock
            this.powerService.addOptionalCharacteristic(this.Characteristic.SetDuration);
            this.powerService.getCharacteristic(this.Characteristic.SetDuration)
                .setProps({ maxValue: setting?.constraints?.max ?? MAX_ALARM_DURATION });

            // Change the alarm clock value
            this.powerService.getCharacteristic(this.Characteristic.SetDuration)
                .onSet(this.onSetNumber(async (value: number) => {
                    this.log.info(`SET Alarm clock ${value} seconds`);
                    await this.device.setSetting('BSH.Common.Setting.AlarmClock', value);
                }));

            // Update the alarm clock status
            this.device.on('BSH.Common.Setting.AlarmClock', seconds => {
                if (seconds) this.log.info(`Alarm clock ${formatSeconds(seconds)} remaining`);
                else this.log.info('Alarm clock inactive');
                this.powerService.updateCharacteristic(this.Characteristic.SetDuration, seconds);
            });
        }
    };
}