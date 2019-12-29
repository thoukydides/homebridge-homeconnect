// Homebridge plugin for Home Connect home appliances
// Copyright © 2019 Alexander Thoukydides

'use strict';

let Service, Characteristic;

// Add program support to an accessory
module.exports = {
    init() {
        // Shortcuts to useful HAP objects
        Service = this.homebridge.hap.Service;
        Characteristic = this.homebridge.hap.Characteristic;

        // Enable polling of selected/active programs when connected
        this.device.pollPrograms();

        // Use the identify request to log details of all available programs
        // (the callback is called by the base class, so no need to do so here)
        this.accessory.on('identify', () => this.logPrograms());
    },

    // Read and log details of all available programs
    async logPrograms() {
        try {
            // Read details of the available programs
            let allPrograms = await this.device.getAllPrograms();
            let programs = await this.device.getAvailablePrograms();

            // HomeKit restricts the characters allowed in names
            function simplifyName(name) {
                return name.replace(/[^-a-z0-9.' ]/ig, '')
                           .replace(/^\W/, '')
                           .replace(/\W$/, '');
            }

            // Convert an option into a form that can be used in config.json
            function optionValue(option) {
                // If the option has an actual or default value then use that
                let value = null;
                if ('value' in option) {
                    value = option.value;
                } else if ('default' in option) {
                    value = option.default;
                }

                // Use any additional information to generate a helpful comment
                let comment;
                if (option.constraints) {
                    if (option.constraints.allowedvalues) {
                        let {allowedvalues} = option.constraints;
                        if (value === null) value = allowedvalues[0];
                        if (1 < allowedvalues.length) comment = allowedvalues;
                    } else if ('min' in option.constraints
                               && 'max' in option.constraints) {
                        let {type, unit} = option;
                        let {min, max, stepsize} = option.constraints;
                        if (value === null) value = min;
                        let commentParts = [];
                        if (type) commentParts.push(type);
                        commentParts.push('[' + min, '..', max + ']');
                        if (stepsize) commentParts.push('step ' + stepsize);
                        if (unit) commentParts.push(unit);
                        comment = commentParts.join(' ');
                    }
                }

                // Return the value and comment
                return [value, comment];
            }

            // Log details of each program
            let json = {
                [this.device.haId]: {
                    programs:       programs.map(program => ({
                        name:       simplifyName(program.name),
                        key:        program.key,
                        options:    program.options.reduce((result, option) => {
                            let [value, comment] = optionValue(option);
                            result[option.key] = value;
                            if (comment) result['_' + option.key] = comment;
                            return result;
                        }, {})
                    }))
                }
            };
            this.log(programs.length + ' of ' + allPrograms.length
                     + ' programs available\n' + JSON.stringify(json, null, 4));
            let missing = allPrograms.length - programs.length;
            if (0 < missing)
                this.warn(missing + ' programs not currently available');
        } catch (err) {
            this.warn(err);
        }
    }
}
