// Homebridge plugin for Home Connect home appliances
// Copyright © 2023 Alexander Thoukydides

// Add an alarm clock to an accessory
module.exports = {
    name: 'HasAlarmClock',

    // Initialise the mixin
    async init() {
        // Shortcuts to useful HAP objects
        const Characteristic = this.homebridge.hap.Characteristic;

        // Check whether the appliance supports an alarm clock
        let allSettings = await this.getCached('settings',
                                               () => this.device.getSettings());
        if (!allSettings.some(s => s.key === 'BSH.Common.Setting.AlarmClock'))
            return this.log('Does not support an alarm clock');

        // Check the maximum supported alarm clock duration
        let setting = await this.getCached('alarmclock',
                                           () => this.device.getSetting('BSH.Common.Setting.AlarmClock'));

        // Add a set duration characteristic for the alarm clock
        this.powerService
            .addOptionalCharacteristic(Characteristic.SetDuration);
        this.powerService.getCharacteristic(Characteristic.SetDuration)
            .setProps({ maxValue: setting.constraints.max });

        // Change the alarm clock value
        this.powerService.getCharacteristic(Characteristic.SetDuration)
            .on('set', this.callbackify(async value => {
                this.log('SET Alarm clock ' + value + ' seconds');
                await this.device.setSetting('BSH.Common.Setting.AlarmClock',
                                             value);
            }));

        // Update the alarm clock status
        this.device.on('BSH.Common.Setting.AlarmClock', item => {
            this.log('Alarm clock '
                     + (item.value
                        ? this.prettySeconds(item.value) + ' remaining'
                        : 'inactive'));
            this.powerService.updateCharacteristic(
                Characteristic.SetDuration, item.value);
        });
    }
};
