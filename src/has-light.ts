// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2023 Alexander Thoukydides

import { Characteristic, Service, WithUUID } from 'homebridge';

import { ApplianceBase } from './appliance-generic';
import { Constructor, Optional, assertIsNumber } from './utils';
import { AmbientLightColor } from './api-value-types';
import { SettingKV } from './api-value';
import { SerialisedOperation } from './serialised';

// HomeKit HSV representation of a colour
export interface HSV {
    hue:        number; // 0-360° hue
    saturation: number; // 0-100% saturation
    brightness: number; // 0-100% value / brightness
}

// Coalesced HomeKit light characteristic values
export interface UpdateLightHCValue extends Partial<HSV>{
    on?:        boolean;
    mirek?:     number;  //MIREK_COLD - MIREK_WARM
}
type UpdateLightHC = SerialisedOperation<UpdateLightHCValue, void>;

// Setting keys used to control the light(s)
const LIGHT_KEY = {
    'Functional Light': {
        on:         'Cooking.Common.Setting.Lighting',
        brightness: 'Cooking.Common.Setting.LightingBrightness',
        colourtemp: 'Cooking.Hood.Setting.ColorTemperaturePercent'
    },
    'Ambient Light': {
        on:         'BSH.Common.Setting.AmbientLightEnabled',
        brightness: 'BSH.Common.Setting.AmbientLightBrightness',
        colour:     'BSH.Common.Setting.AmbientLightColor',
        custom:     'BSH.Common.Setting.AmbientLightCustomColor'
    },
    'Internal Light': {
        on:         'Refrigeration.Common.Setting.Light.Internal.Power',
        brightness: 'Refrigeration.Common.Setting.Light.Internal.Brightness'
    },
    'External Light': {
        on:         'Refrigeration.Common.Setting.Light.External.Power',
        brightness: 'Refrigeration.Common.Setting.Light.External.Brightness'
    }
} as const;
type LightType = keyof typeof LIGHT_KEY;
type LightKey<TypeKey extends LightType = LightType> =
    TypeKey extends TypeKey ? keyof (typeof LIGHT_KEY)[TypeKey] : never;
type LightKeyOptional<Key extends LightKey = LightKey, TypeKey extends LightType = LightType> =
    TypeKey extends TypeKey ? (Key extends Key ? (Key extends LightKey<TypeKey> ? never : Key) : never) : never;
type LightKeyRequired<Key extends LightKey = LightKey> = Key extends LightKeyOptional ? never : Key;
type LightValue<Key extends LightKey, TypeKey extends LightType = LightType> =
    TypeKey extends TypeKey ? (Key extends LightKey<TypeKey> ? (typeof LIGHT_KEY)[TypeKey][Key] : never) : never;
type LightKeyDefinition = { [Key in LightKeyRequired]:  LightValue<Key>; }
                        & { [Key in LightKeyOptional]?: LightValue<Key>; };

// Appliance settings for a light
type LightSettingsBase = { [Key in LightKey]?: Optional<SettingKV<LightValue<Key>>, 'value'> | null; };
export type LightSettings<Keys extends LightKey = never> =
    LightSettingsBase & { [P in Keys]-?: NonNullable<LightSettingsBase[P]> };

// Test whether the settings support specific features
function hasSettings<Keys extends LightKey>(settings: LightSettings, ...keys: Keys[]): settings is LightSettings<Keys> {
    return keys.every(key => settings[key]);
}

// BSH.Common.Setting.AmbientLightColor value to specify colour as RGB
const CUSTOM_COLOR = AmbientLightColor.CustomColor;

// HomeKit colour temperature range
const MIREK_WARM = 400; //  2,500K =   0% (incandescent lamp)
const MIREK_COLD =  50; // 20,000K = 100% (clear blue sky)

// Add a light to an accessory
export function HasLight<TBase extends Constructor<ApplianceBase>>(Base: TBase, lightTypes: LightType[]) {
    return class HasLight extends Base {

        // Accessory services
        lightService: Service[] = [];

        // Mixin constructor
        constructor(...args: any[]) {
            super(...args);

            // Continue initialisation asynchronously
            this.asyncInitialise('Light', this.initHasLight());
        }

        // Asynchronous initialisation
        async initHasLight(): Promise<void> {
            // Add all supported light types
            for (const type of lightTypes)
                await this.addLightIfSupported(type, LIGHT_KEY[type]);

            // If multiple lights are supported then link their services
            if (1 < this.lightService.length) {
                for (const service of this.lightService.slice(1))
                    service.addLinkedService(this.lightService[0]);
            }
        }

        // Check whether the appliance supports a light and then add it
        async addLightIfSupported(type: string, keys: LightKeyDefinition): Promise<Service | undefined> {
            // Check which settings are supported
            const allSettings = await this.getCached('settings', () => this.device.getSettings());

            // A light must at least support being switched on and off
            if (!allSettings.some(setting => setting.key === keys.on)) {
                this.log.info(`Does not support ${type}`);
                return;
            }
            if (!this.hasOptionalFeature('Lightbulb', type, 'Light')) return;

            // Retrieve any previously cached light details
            const settings: LightSettings = await this.cache.get<LightSettings>(type) ?? {};

            // Attempt to update the details of this light
            await this.device.waitConnected(true);
            await this.refreshLight(type, keys, settings, !settings.on);

            // Add the light
            this.lightService.push(this.addLight(type, settings));
        }

        // Refresh details of a light
        async refreshLight(type: string, keys: LightKeyDefinition, settings: LightSettings,
                           active: boolean = false): Promise<void> {
            // Some settings may not be readable in certain states
            const initialSettings: SettingKV[] = [];
            try {
                // Switch the light on, if necessary, to read its supported settings
                settings.on = { key: keys.on };
                const on = this.device.getItem(keys.on);
                if (!on) {
                    if (!active) return;
                    this.log.warn(`Temporarily switching ${type} on to read its settings`);
                    await this.device.setSetting(keys.on, true);
                    if (on === false) initialSettings.unshift({ key: keys.on, value: on });
                }

                // Special handling for lights that support colour temperature
                const keyColourtemp = keys.colourtemp;
                if (keyColourtemp) {
                    settings.colourtemp = await this.getCached(`${type} colourtemp`, () => this.device.getSetting(keyColourtemp));
                }

                // Special handling for lights that support colour
                const keyColour = keys.colour;
                const keyCustom = keys.custom;
                if (keyColour && keyCustom) {
                    settings.colour = await this.getCached(`${type} colour`, () => this.device.getSetting(keyColour));
                    if (settings.colour) {
                        // Check whether the light supports custom colours
                        const colour = settings.colour.value;
                        const colours = settings.colour.constraints?.allowedvalues ?? [];
                        if (colours.includes(CUSTOM_COLOR)) settings.custom = { key: keyCustom };

                        // Check whether the light supports non-custom colours
                        const nonCustomColour = colours.find(c => c !== CUSTOM_COLOR);
                        if (nonCustomColour) {
                            // Select a non-custom colour, if necessary, to read range
                            if (colour === CUSTOM_COLOR) {
                                if (!active) return;
                                this.log.warn(`Temporarily setting ${type} to a non-custom colour to read its settings`);
                                await this.device.setSetting(keyColour, nonCustomColour);
                                initialSettings.unshift({ key: keyColour, value: colour });
                            }
                        }
                    }
                }

                // Read the supported brightness range
                settings.brightness = await this.getCached(
                    `${type} brightness`, () => this.device.getSetting(keys.brightness));

                // Update the cache
                await this.cache.set(type, settings);
            } finally {
                // Best-effort attempt to restore the original light settings
                for (const setting of initialSettings) {
                    try {
                        await this.device.setSetting(setting.key, setting.value);
                    } catch (err) { /* empty */ }
                }
            }
        }

        // Add a light
        addLight(type: string, settings: LightSettings): Service {
            // Add a Lightbulb service
            const service = this.makeService(this.Service.Lightbulb, type, type);

            // Control the light
            const updateHC = this.makeSerialisedObject<UpdateLightHCValue>(
                value => this.updateLightHC(type, settings, service, value));

            // Add the appropriate characteristics
            if (hasSettings(settings, 'on'))
                this.addLightOn        (type, settings, service, updateHC);
            if (hasSettings(settings, 'brightness') || hasSettings(settings, 'colour', 'custom'))
                this.addLightBrightness(type, settings, service, updateHC);
            if (hasSettings(settings, 'colourtemp'))
                this.addLightColourTemp(type, settings, service, updateHC);
            if (hasSettings(settings, 'colour', 'custom'))
                this.addLightColour    (type, settings, service, updateHC);

            // Return the service
            return service;
        }

        // Deferred update of Home Connect state from HomeKit characteristics
        async updateLightHC(type: string, settings: LightSettings, service: Service,
                            value: UpdateLightHCValue): Promise<void> {
            // Switch the light on or off
            if (hasSettings(settings, 'on') && value.on !== undefined) {
                await this.setLightOn(type, settings, value.on);
            }
            if (value.on === false) return;

            // Set the colour temperature
            if (hasSettings(settings, 'colourtemp') && value.mirek !== undefined) {
                await this.setLightColourTemp(type, settings, value.mirek);
            }

            // Either set the colour (including brightness) or just brightness
            const isCustom = settings.colour && this.device.getItem(settings.colour.key) === CUSTOM_COLOR;
            if (hasSettings(settings, 'colour', 'custom')
                && (value.hue !== undefined || value.saturation !== undefined
                    || (value.brightness !== undefined && isCustom))) {
                await this.setLightColour(type, settings, service,
                                          value.hue, value.saturation, value.brightness);
            } else if (hasSettings(settings, 'brightness') && value.brightness !== undefined) {
                await this.setLightBrightness(type, settings, value.brightness);
            }
        }

        // Add on/off control of a light
        addLightOn(type: string, settings: LightSettings<'on'>, service: Service, updateLightHC: UpdateLightHC): void {
            // Update whether the light is on or off
            this.device.on(settings.on.key, on => {
                this.log.info(`Light ${type} ${on ? 'on' : 'off'}`);
                service.updateCharacteristic(this.Characteristic.On, on);
            });
            service.getCharacteristic(this.Characteristic.On)
                .onSet(this.onSetBoolean(value => updateLightHC({ on: value })));
        }

        // Set whether a light is on
        async setLightOn(type: string, settings: LightSettings<'on'>, on: boolean): Promise<void> {
            this.log.info(`SET Light ${type} ${on ? 'on' : 'off'}`);
            await this.device.setSetting(settings.on.key, on);
        }

        // Add brightness control of a light
        addLightBrightness(type: string, settings: LightSettings<'brightness'> | LightSettings<'colour' | 'custom'>,
                           service: Service, updateLightHC: UpdateLightHC): void {
            if (hasSettings(settings, 'brightness')) {
                // The light has explicit brightness support
                const constraints = settings.brightness.constraints;
                service.getCharacteristic(this.Characteristic.Brightness)
                    .updateValue(Math.round(settings.brightness.value ?? 100))
                    .setProps({ minValue: constraints?.min ?? 10, maxValue: constraints?.max ?? 100 });

                // Update the brightness
                this.device.on(settings.brightness.key, percent => {
                    percent = Math.round(percent);
                    this.log.info(`Light ${type} ${percent}% brightness`);
                    service.updateCharacteristic(this.Characteristic.Brightness, percent);
                });
            } else {
                // Using a custom colour to set arbitrary brightness
                service.getCharacteristic(this.Characteristic.Brightness)
                    .setProps({ minValue: 0, maxValue: 100 });
            }

            // Update the light's brightness when it changes in HomeKit
            service.getCharacteristic(this.Characteristic.Brightness)
                .onSet(this.onSetNumber(value => updateLightHC({ brightness: value })));
        }

        // Set the brightness of a light
        async setLightBrightness(type: string, settings: LightSettings<'brightness'>, brightness: number): Promise<void> {
            this.log.info(`SET Light ${type} ${brightness}% brightness`);
            await this.device.setSetting(settings.brightness.key, brightness);
        }

        // Add colour temperature control of a light
        addLightColourTemp(type: string, settings: LightSettings<'colourtemp'>, service: Service, updateLightHC: UpdateLightHC): void {
            // Convert from Home Connect's percentage to reciprocal megakelvin
            this.device.on(settings.colourtemp.key, percent => {
                percent = Math.round(percent);
                const mirek = Math.round(MIREK_WARM + (percent / 100.0) * (MIREK_COLD - MIREK_WARM));
                this.log.info(`Light ${type} ${mirek}MK^-1 (${percent}% cold)`);
                service.updateCharacteristic(this.Characteristic.ColorTemperature, mirek);
            });

            // Convert from reciprocal megakelvin to Home Connect's percentage
            service.getCharacteristic(this.Characteristic.ColorTemperature)
                .onSet(this.onSetNumber(value => updateLightHC({ mirek: value })));
        }

        // Set the colour temperature of a light
        async setLightColourTemp(type: string, settings: LightSettings<'colourtemp'>, mirek: number): Promise<void> {
            // Convert from reciprocal megakelvin to percent cold
            const percent = 100.0 * (mirek - MIREK_WARM) / (MIREK_COLD - MIREK_WARM);
            this.log.info(`SET Light ${type} ${percent}% cold (${mirek}MK^-1)`);
            await this.device.setSetting(settings.colourtemp.key, percent);
        }

        // Add colour control of a light
        addLightColour(type: string, settings: LightSettings<'colour' | 'custom'>, service: Service, updateLightHC: UpdateLightHC): void {
            // Convert from Home Connect's RGB to HomeKit's hue and saturation
            // (ignore changes to 'BSH.Common.Setting.AmbientLightColor')
            this.device.on(settings.custom.key, rgb => {
                const { hue, saturation, brightness: value } = this.fromRGB(rgb);
                this.log.info(`Light ${type} ${rgb} (hue=${hue}, saturation=${saturation}%, value=${value}%)`);
                service.updateCharacteristic(this.Characteristic.Hue, hue);
                service.updateCharacteristic(this.Characteristic.Saturation, saturation);
                service.updateCharacteristic(this.Characteristic.Brightness, value);
            });

            // Convert from HomeKit's hue and saturation to Home Connect's RGB
            // (value is handled separately, as brightness)
            service.getCharacteristic(this.Characteristic.Hue)
                .onSet(this.onSetNumber(value => updateLightHC({ hue: value })));
            service.getCharacteristic(this.Characteristic.Saturation)
                .onSet(this.onSetNumber(value => updateLightHC({ saturation: value })));
        }

        // Set the colour of a light
        async setLightColour(type: string, settings: LightSettings<'colour' | 'custom'>, service: Service,
                             hue?: number, saturation?: number, value?: number): Promise<void> {
            // Read any missing parameters from the characteristics
            const read = (characteristic: WithUUID<new () => Characteristic>): number => {
                const value = service.getCharacteristic(characteristic).value;
                assertIsNumber(value);
                return value;
            };
            hue        ??= read(this.Characteristic.Hue);
            saturation ??= read(this.Characteristic.Saturation);
            value      ??= read(this.Characteristic.Brightness);

            // Set the colour
            const rgb = this.toRGB(hue, saturation, value);
            this.log.info(`SET Light ${type} ${rgb} (hue=${hue}, saturation=${saturation}%, value=${value}%)`);
            await this.device.setSetting(settings.colour.key, CUSTOM_COLOR);
            await this.device.setSetting(settings.custom.key, rgb);
        }

        // Convert a colour from from hue/saturation to RGB
        toRGB(hue: number, saturation: number, value: number): string {
            const maxRgb = value * 255 / 100;
            const chroma = maxRgb * saturation / 100;
            const minRgb = maxRgb - chroma;
            const deltaRgb = chroma * ((hue / 60) % 1);
            let rgb;
            if (hue < 60)        rgb = [maxRgb, minRgb + deltaRgb, minRgb];
            else if (hue < 120)  rgb = [maxRgb - deltaRgb, maxRgb, minRgb];
            else if (hue < 180)  rgb = [minRgb, maxRgb, minRgb + deltaRgb];
            else if (hue < 240)  rgb = [minRgb, maxRgb - deltaRgb, maxRgb];
            else if (hue < 300)  rgb = [minRgb + deltaRgb, minRgb, maxRgb];
            else /* (h < 360) */ rgb = [maxRgb, minRgb, maxRgb - deltaRgb];

            // Convert the RGB value to hex
            const [r, g, b] = rgb.map(v => Math.round(v));
            const numeric = 0x1000000 + r * 0x10000 + g * 0x100 + b;
            return '#' + Number(numeric).toString(16).substring(1);
        }

        // Convert a colour from RGB to hue/saturation
        fromRGB(rgbHex: string): HSV {
            // Convert from hex to individual RGB components
            const rgb = [
                parseInt(rgbHex.substring(1, 3), 16),
                parseInt(rgbHex.substring(3, 5), 16),
                parseInt(rgbHex.substring(5, 7), 16)
            ];

            // Perform the conversion
            const minRgb = Math.min(...rgb);
            const maxRgb = Math.max(...rgb);
            const chroma = maxRgb - minRgb;
            let sector;
            if (chroma === 0) {
                sector = 0; // (dummy value for white, i.e. R=G=B=V)
            } else if (maxRgb === rgb[0]) { // 0-60° or 300-360°
                sector = (rgb[1] - rgb[2]) / chroma;
                if (sector < 0) sector += 6;
            } else if (maxRgb === rgb[1]) { // 60-180°
                sector = (rgb[2] - rgb[0]) / chroma + 2;
            } else { // (maxRgb === rgb[2])    180-300°
                sector = (rgb[0] - rgb[1]) / chroma + 4;
            }

            // Scale and return the hue, saturation, and value
            return {
                hue:        Math.round(sector * 60),
                saturation: maxRgb ? Math.round((chroma / maxRgb) * 100) : 0,
                brightness: Math.round(maxRgb * 100 / 255)
            };
        }
    };
}

// Limit the types of light for different appliances
export const HasCleaningLight = <TBase extends Constructor<ApplianceBase>>(Base: TBase) =>
    HasLight(Base, ['Ambient Light']);
export const HasHoodLight = <TBase extends Constructor<ApplianceBase>>(Base: TBase) =>
    HasLight(Base, ['Ambient Light', 'Functional Light']);
export const HasRefrigerationLight = <TBase extends Constructor<ApplianceBase>>(Base: TBase) =>
    HasLight(Base, ['Internal Light', 'External Light']);