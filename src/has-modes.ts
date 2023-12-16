// Homebridge plugin for Home Connect home appliances
// Copyright © 2021-2023 Alexander Thoukydides

import { Service } from 'homebridge';

import { setImmediate as setImmediateP } from 'timers/promises';

import { ApplianceBase } from './appliance-generic';
import { Constructor } from './utils';
import { SettingKey } from './api-value';

// Add mode switches to an accessory
export function HasModes <TBase extends Constructor<ApplianceBase>>(Base: TBase, prefix: string = 'mode') {
    return class HasModes extends Base {

        // Accessory services
        readonly modeService: Partial<Record<SettingKey, Service>> = {};

        // Mode settings that may be supported by the appliance
        readonly modes: Partial<Record<SettingKey, string>> = {};

        // Mixin constructor
        constructor(...args: any[]) {
            super(...args);

            // Continue initialisation asynchronously
            this.asyncInitialise('Modes', this.initHasModes());
        }

        // Asynchronous initialisation
        async initHasModes(): Promise<void> {
            // Wait for synchronous initialisation to finish
            await setImmediateP();

            // Check which settings are supported to add appropriate services
            const allSettings = await this.getCached('settings', () => this.device.getSettings());

            // Add services for each mode setting
            for (const key of allSettings.map(s => s.key)) {
                const modeName = this.modes[key];
                if (modeName && this.hasOptionalFeature('Switch', modeName, 'Settings')) {
                    this.addModeSwitch(key, modeName);
                }
            }
        }

        // Define a mode setting that may be supported by the appliance
        hasMode(settingKey: SettingKey, name: string): void {
            this.modes[settingKey] = name;
        }

        // Add a switch for a mode setting
        addModeSwitch(key: SettingKey, name: string) {
            // Add a switch service for this mode setting
            const service = this.makeService(this.Service.Switch, name, `${prefix} ${name}`);

            // Change the setting
            service.getCharacteristic(this.Characteristic.On)
                .onSet(this.onSetBoolean(async value => {
                    this.log.info(`SET ${name} ${value ? 'on' : 'off'}`);
                    await this.device.setSetting(key, value);
                }));

            // Update the status
            this.device.on(key, enabled => {
                this.log.info(`${name} ${enabled ? 'on' : 'off'}`);
                service.updateCharacteristic(this.Characteristic.On, enabled);
            });
        }
    };
}