// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2023 Alexander Thoukydides

import { API, Logger } from 'homebridge';

import semver from 'semver';

import { ENGINES, PLUGIN_NAME, PLUGIN_VERSION,
         REQUIRED_HOMEBRIDGE_API,
         REQUIRED_HOMEBRIDGE_HAP} from './settings';

// Log critical package and API versions
export function checkDependencyVersions(log: Logger, hb: API): void {
    const versions: [string, string | number, string | undefined][] = [
        // Name             Current version             Required version
        [PLUGIN_NAME,       PLUGIN_VERSION,             undefined              ],
        ['Node.js',         process.versions.node,      ENGINES.node           ],
        ['Homebridge',      hb.serverVersion,           ENGINES.homebridge     ],
        ['Homebridge API',  hb.version,                 REQUIRED_HOMEBRIDGE_API],
        ['Homebridge HAP',  hb.hap.HAPLibraryVersion(), REQUIRED_HOMEBRIDGE_HAP]
    ];

    // Log/check each version against the requirements
    versions.forEach(([name, current, required]) => {
        const semverCurrent = semver.coerce(current);
        if (!required) {
            log.info(`${name} version ${current}`);
        } else if (semverCurrent === null) {
            log.warn(`${name} version ${current} cannot be coerced to semver (require ${required})`);
        } else if (semver.satisfies(semverCurrent, required)) {
            log.info(`${name} version ${current} (satisfies ${required})`);
        } else {
            log.error(`${name} version ${current} is incompatible (satisfies ${required})`);
        }
    });
}