# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [v1.2.6] - 2025-01-27
### Changed
* **Oven/Washer:** Added undocumented programs. (#331, #332)
* Updated dependencies to latest versions.

## [v1.2.5] - 2025-01-24
### Changed
* **CoffeeMaker/Dishwasher:** Added undocumented programs. (#326, #328, #330)
* Updated dependencies to latest versions.

## [v1.2.4] - 2025-01-08
### Changed
* **CoffeeMaker/Oven:** Added undocumented program options. (#322, #324, #325)
* Updated dependencies to latest versions.

## [v1.2.3] - 2024-12-05
### Changed
* **CoffeeMaker/Dryer/Washer/WasherDryer:** Added undocumented program options. (#320)
* Updated dependencies to latest versions.

## [v1.2.2] - 2024-12-05
### Changed
* **CoffeeMaker:** Added undocumented program options. (#317)
* Warn if `Identify` triggered without enabling `Log Appliance IDs` debug option.

## [v1.2.1] - 2024-12-04
### Fixed
* Workaround change to undici's handling of streaming responses. (#316)

## [v1.2.0] - 2024-12-04
### Added
* Added redaction of `haId` values in logs. (Client ID, and Access/Refresh Tokens were already redacted.) The `Log Appliance IDs` debug option leaves the full `haId` values visible.
### Changed
* Updated `README.md`.
* Updated dependencies to latest versions.

## [v1.1.2] - 2024-11-30
### Changed
* **Dishwasher/Dryer/Oven/Washer/WasherDryer:** Added undocumented programs and options. (#312, #313, #314)
* Updated dependencies.

## [v1.1.0] - 2024-11-15
### Added
* Added support for Home Connect API servers located in China. (#311)

## [v1.0.7] - 2024-11-09
### Changed
* **CoffeeMaker/Washer:** Added undocumented program options. (#305, #307, #309)
* Updated dependencies.

## [v1.0.5] - 2024-10-08
### Changed
* **Dishwasher:** Added undocumented program options. (#301)
* Restored Node 20.9.0 compatibility (for use on Synology NAS). (#300, #304)
* Updated dependencies.

## [v1.0.4] - 2024-09-17
### Fixed
* Node 22 compatibility (minimum of Node 18.20.0 now required). (#298)
### Changed
* Updated dependencies.

## [v1.0.3] - 2024-09-16
### Changed
* **Washer:**  Added undocumented program option. (#297)
* Updated dependencies.

## [v1.0.2] - 2024-09-04
### Changed
* Updated dependencies.
* Lots of internal changes for stricter eslint checking.

## [v1.0.1] - 2024-09-02
### Fixed
* Correctly handle configurations that do not specify settings for all appliances. (#294)

## [v1.0.0] - 2024-09-01
### Changed
* Changed to ESM project to support Homebridge 2.0 (and bodged around breaking change to maintain 1.x compatibility).
* **WasherDryer:**  Added undocumented programs and options. (#291)
* Updated dependencies.
* Lots of internal changes for stricter eslint checking.

## [v0.42.4] - 2024-07-16
### Changed
* **Dryer/WasherDryer:**  Added undocumented programs. (#286, #287)
* Updated dependencies.

## [v0.42.3] - 2024-06-15
### Changed
* **CoffeeMaker/Dishwasher/Oven/Washer/WasherDryer:**  Added undocumented programs and options. (#283, #284, #285)
* Updated dependencies.

## [v0.42.2] - 2024-05-15
### Changed
* **Oven:**  Added undocumented programs. (#278, #279, #281, #282)
* Updated dependencies.

## [v0.42.1] - 2024-05-04
### Changed
* **Dishwasher:**  Added undocumented program option. (#277)
* Updated dependencies.

## [v0.42.0] - 2024-04-27
### Changed
* **Dryer:**  Added undocumented program. (#272)
* Updated dependencies.

## [v0.41.4] - 2024-04-06
### Changed
* **Oven/Washer/WasherDryer:**  Added undocumented programs. (#261, #262, #265, #266)
* Updated dependencies.

## [v0.41.3] - 2024-03-09
### Changed
* **Dishwasher/Dryer/Washer/WasherDryer:** Added undocumented programs and options. (#258)
* Bumped undici version to remove SIMD requirement. (#259)

## [v0.41.2] - 2024-03-07
### Changed
* Updated dependencies.

## [v0.41.1] - 2024-02-29
### Changed
* **Dryer/Oven/Washer/WasherDryer:** Added undocumented program and options. (#252, #253, #254, #255, #257)
* Updated dependencies.

## [v0.41.0] - 2024-02-15
### Added
* **Hood:** Added support for functional lights that implement discrete enumerated colour temperature instead of a numeric percentage. (#249)
### Changed
* **Dryer/Washer/WasherDryer:** Added undocumented program and options. (#247, #248)

## [v0.40.1] - 2024-02-09
### Changed
* Disconnected appliances now indicate an error status to HomeKit, which results in a `No Response` status being shown in the Apple Home app.
* **CoffeeMaker/Oven/Washer/WasherDryer:** Added undocumented program and options. (#243, #244, #246)
* Updated dependencies.

## [v0.40.0] - 2024-01-27
### Added
* **CleaningRobot/CoffeeMaker/CookProcessor/Dishwasher/Dryer/Hob/Oven/WarmingDrawer/washer/WasherDryer:** The HomeKit `Switch` service for the active program can be enabled or disabled via the `config.json` file. This service is also used to indicate other aspects of the appliance state, including error conditions and the `Remaining Duration` characteristic, so disabling it also affects those features. (#240)
### Changed
* **Dishwasher/Oven/Washer/WasherDryer:** Added undocumented program and options. (#236, #237, #238)
* Updated dependencies.

## [v0.39.1] - 2024-01-24
### Changed
* **CoffeeMaker/Dryer/Oven:** Added undocumented programs and options. (#231, #233, #235)
* Updated dependencies.

## [v0.39.0] - 2024-01-15
### Added
* Added a check of the Home Connect API server status when the [Homebridge UI](https://github.com/homebridge/homebridge-config-ui-x) configuration editor is opened, with a warning displayed if problems are detected.
### Changed
* Tweaked appearance of appliance icons in the [Homebridge UI](https://github.com/homebridge/homebridge-config-ui-x) configuration editor.
* **Dryer:** Added undocumented programs. (#228, #230)

## [v0.38.0] - 2024-01-13
### Added
* **Dryer/WasherDryer:** Added a new event button (`Stateless Programmable Switch` service) that can trigger HomeKit automations when the drying process has finished.
### Changed
* **Dryer:** Added undocumented program options. (#223)
* Updated dependencies.

## [v0.37.12] - 2024-01-12
### Changed
* **Dishwasher:** Added undocumented program options. (#220, #221, #222)

## [v0.37.11] - 2024-01-10
### Changed
* **Dryer/Washer/WasherDryer:** Added undocumented program options. (#219)

## [v0.37.10] - 2024-01-08
### Changed
* **CoffeeMaker/Dryer/Washer/WasherDryer:** Added undocumented program options. (#216, #217)

## [v0.37.9] - 2024-01-05
### Changed
* **Dryer/Washer/WasherDryer:** Added undocumented program options and values. (#210, #212, #213, #214)

## [v0.37.8] - 2024-01-05
### Changed
* **Dryer/Oven/Washer/WasherDryer:** Added undocumented program options, and made one option more permissive. (#210, #211)

## [v0.37.7] - 2024-01-04
### Changed
* **CoffeeMaker:** Added undocumented programs. (#209)
* **Dishwasher:** Added an undocumented program option. (#207)

## [v0.37.6] - 2024-01-03
### Changed
* Treat data cached by previous plugin versions as expired.
* **Washer/WasherDryer:** Adding a couple of undocumented program option. (#205, #206)

## [v0.37.5] - 2024-01-02
### Changed
* **Oven:** Added a couple of undocumented programs. (#204)

## [v0.37.4] - 2024-01-02
### Changed
* **CoffeeMaker:** Added an undocumented program and a few undocumented options. (#203)
* **Dishwasher:** Added values for undocumented program options. (#202)

## [v0.37.3] - 2024-01-01
### Fixed
* Corrected logging of unrecognised enumerated types from the Home Connect API. (#202)

## [v0.37.2] - 2023-12-31
### Changed
* **Dishwasher:** Added another undocumented program option. (#200)

## [v0.37.1] - 2023-12-31
### Changed
* Delay reporting unrecognised or mismatched keys/values in the log if any type information is not yet known. Improved collection of values for unrecognised keys.
* **Dishwasher/Washer/WasherDryer:** Added undocumented (and incorrectly documented) program options. (#198, #199)

## [v0.37.0] - 2023-12-30
### Changed
* Significant rewrite of the [Homebridge UI](https://github.com/homebridge/homebridge-config-ui-x) configuration handling. This plugin previously implemented a [dynamic schema](https://github.com/homebridge/homebridge-config-ui-x/blob/f63405f68a55416be3f9bb3ee4d47227b78d691c/src/modules/plugins/plugins.service.ts#L767), which wrote a semi-static schema file `.homebridge/.homebridge-homeconnect-v1.schema.json`. This has been replaced by a [custom user interface](https://developers.homebridge.io/#/custom-plugin-ui) with interactive functionality running within the web interface. Home Connect client authorisation is checked each time the plugin settings are opened or the `clientid` is changed, with prompts to perform authorisation when required, and feedback of any issues and how to resolve them. Additionally, the settings for each appliance are presented as separate pages to make larger configurations more manageable.
* A new configuration option allows whole appliances to be disabled. This removes any associated HomeKit services and prevents all Home Connect API requests for that appliance. (#57)
* Enhanced naming of HomeKit services. The appliance name can be included as an optional prefix in the names of the individual services; this is disabled by default for program `Switch` services and enabled for all other services. The `Configured Name` services are now writeable, allowing the service names to be changed within HomeKit; any names changed from their plugin defaults will not be modified if the prefix configuration options are changed. (#196)
* Improved logging of unrecognised or mismatched keys/values returned by the Home Connect API. This now outputs a single summary (2 minutes after the last detected problem), with a link to raise a GitHub issue to report the unrecognised keys/values. The link will automatically complete most of the issue template; it is just necessary to copy-and-paste the relevant section from the log file. (#190)
* An optional `name` property is now accepted in the `config.json` file to change the prefix used for the plugin's messages in the Homebridge log file. This setting is only visible in the [Homebridge UI](https://github.com/homebridge/homebridge-config-ui-x) interface if not set to the default value. (#194)
* **Hob/Oven:** Added a few undocumented program keys, but almost certainly incomplete. (#190)
* Updated dependencies.
### Fixed
* **Freezer/FridgeFreezer/Refrigerator:** Correct door names are used in the Homebridge log. (#196)
* Improved handling of cached appliance operations. Overlapping requests for the same operation are now deferred until the first completes, enabling them to use its cached result instead of issuing duplicate Home Connect API requests.

## [v0.36.0] - 2023-12-24
### Added
* **Freezer/FridgeFreezer/Refrigerator:** Added separate `Door` services for each supported door type on the appliance. The additional doors that may exist are for the Bottle Cooler, Chiller Common, Chiller, Chiller Left, Chiller Right, Flex Compartment, Freezer, Refrigerator, Refrigerator 2, and Refrigerator 3. Any new separate doors are disabled by default and need to be explicitly enabled via the `config.json` file. (#193)
### Fixed
* **Freezer/FridgeFreezer/Refrigerator:** Corrected control of external lights.

## [v0.35.0] - 2023-12-18
### Added
* **Freezer/FridgeFreezer/Refrigerator:** Added control of internal/external lights.
### Changed
* **Dishwasher:** Accept the undocumented option value `Dishcare.Dishwasher.Option.VarioSpeed`. (#189)
* **Freezer/FridgeFreezer/Refrigerator:** Accept undocumented door state values. Added undocumented internal/external light settings. (#189)

## [v0.34.2] - 2023-12-18
### Changed
* **Washer/WasherDryer:** Added undocumented option value `LaundryCare.Washer.EnumType.Temperature.Auto`. Added several other undocumented program options, with guesses at their possible values. 
### Fixed
* **Dishwasher/Dryer/Oven/Washer/WasherDryer:** Corrected expected type for the `BSH.Common.Option.RemainingProgramTimeIsEstimated` program option. (#187)

## [v0.34.1] - 2023-12-18
### Changed
* Tweaked the messages that are written to the log when the supported options cannot be read for some programs. This is because some appliances advertise support for programs that cannot be selected. (#186)

## [v0.34.0] - 2023-12-17
### Added
* **CoffeeMaker:** Added new event buttons (`Stateless Programmable Switch` services) that can be used to trigger HomeKit automations. These indicate when when the milk container should be removed and put in a cool place, and when cleaning and/or descaling is required.
* Added simple mock appliances that can be used for testing the plugin without connecting to the Home Connect API. This functionality is enabled by setting the `"Mock Appliances"` debug option in the `config.json` file.
### Changed
* Improved the log messages for slow initialisation.
### Fixed
* **Dishwasher/Hood:** Restored brightness control of ambient lights which support custom colours but not explicit brightness.
* **Dryer:** Added some undocumented program options and their values to reduce warnings in the log.
* Corrected event item count in the log.

## [v0.33.1] - 2023-12-17
### Fixed
* **Hood:** Corrected control of fan speed and ambient/functional lights. (#185)

## [v0.33.0] - 2023-12-16
### Added
* **Dishwasher/Hood:** The HomeKit services for functional and ambient lights (`Lightbulb` service) can be individually enabled or disabled via the `config.json` file.
### Changed
* **Oven:** Improved workaround for appliances returning incorrect allowed Power State values.
* Additional values returned by the Home Connect API (the default and allowed value constraints) are checked against expected values.
### Fixed
* Corrected retrieval of `undefined` values from the cache.

## [v0.32.0] - 2023-12-14
### Added
* The HomeKit services for appliance doors (`Door` service), mode settings (`Switch` services), and event buttons (`Stateless Programmable Switch` services), can be individually enabled or disabled via the `config.json` file.
* Additional debug logging options can be configured via [Homebridge UI](https://github.com/homebridge/homebridge-config-ui-x). These allow logging of the raw Home Connect API requests and responses, as well as redirection of `debug` level logging to `info` level (avoiding the need to use the `homebridge -D` option).
### Fixed
* Corrected checking of keys in Home Connect API events.

## [v0.31.0] - 2023-12-13
### Changed
* Significant rewrite of the main accessory logic that bridges between Homebridge and the Home Connect API.
* Keys and values returned by the Home Connect API are checked against known and expected values. Any issues are written to the log, but otherwise ignored.
* The validity of the `config.json` plugin configuration is checked more thoroughly.
* Various log messages have been changed due to the rewrite.
* Updated dependencies.

## [v0.30.2] - 2023-11-30
### Fixed
* **CleaningRobot/CoffeeMaker/CookProcessor/Dishwasher/Dryer/Hob/Oven/Washer/WasherDryer:** Replaced delay when implicitly updating the Power State with a blackout period. Removed inference of Operation State from the Power State. (#181)

## [v0.30.1] - 2023-11-29
### Fixed
* **CleaningRobot/CoffeeMaker/CookProcessor/Dishwasher/Dryer/Hob/Oven/Washer/WasherDryer:** Avoid implicitly updating the Power State if an explicit event was received. Also infer from a change to Power State `Off` or `Standby` that the appliance Operation State is `Inactive` if no event has been been received. (#181)

## [v0.30.0] - 2023-11-10
### Changed
* Dropped Node 14 compatibility.
* Updated dependencies.
### Fixed
* Accept `selected` and/or `active` program details when requesting the list of supported or available programs. (#175)

## [v0.29.6] - 2023-07-31
### Fixed
* Accept an `access` constraint associated with an active or selected program.

## [v0.29.5] - 2023-07-03
### Fixed
* Properly corrected display of authorisation URI in the [Homebridge UI](https://github.com/homebridge/homebridge-config-ui-x). (#151)

## [v0.29.4] - 2023-07-03
### Fixed
* Corrected display of authorisation URI in the [Homebridge UI](https://github.com/homebridge/homebridge-config-ui-x). (#151)

## [v0.29.3] - 2023-05-07
### Changed
* Dropped Node 14 compatibility.
### Fixed
* Accept a `displayvalue` in an option associated with an active or selected program. (#145)

## [v0.29.2] - 2023-04-24
### Fixed
* Accept a `data` object with `CONNECTED`, `DISCONNECTED`, `PAIRED`, and `DEPAIRED` events. (#144)

## [v0.29.1] - 2023-04-24
### Fixed
* Accept `null` as the `value` in events. (#144)

## [v0.29.0] - 2023-04-20
### Added
* **Freezer/FridgeFreezer:** Added on/off control of ice water dispenser. (#94 / #141)
* Added Node 20 to the supported engines.
### Changed
* Complete rewrite of the Home Connect API client. More rigorous checking is performed on requests submitted to and responses returned from the API, which should detect problems and new features quicker.
* Authorisation of the Home Connect client is only attempted once at start-up. If the user does not complete the Device Flow interaction steps before the code expires (currently 10 minutes) then it is necessary to restart Homebridge to try again.
* Various log messages have been changed due to the rewrite.
* Updated dependencies.

## [v0.28.0] - 2023-02-03
### Added
* **Dishwasher:** Added automation triggers for when salt or rinse aid supplies are low.
### Changed
* Restored support for Node 14 LTS.

## [v0.27.0] - 2022-12-21
### Changed
* Added `Configured Name` characteristic to the `Switch`, `Stateless Programmable Switch`, and `Lightbulb` services. This appears to be necessary for HomeKit on iOS 16 to show anything other than the accessory name without manually changing all of the names within the Home app. (#102 / #108 / #116)

## [v0.26.3] - 2022-11-06
### Fixed
* Respect the returned `retry-after` value when refreshing access tokens. Also increased the minimum retry interval from 5 to 6 seconds to remain under the 10 requests per minute limit.

## [v0.26.2] - 2022-10-31
### Changed
* Bumped undici version to latest release.
### Fixed
* Always create new `Error` objects when prefixing new text to their `message`, instead of overwriting the existing property (which would fail if read-only). (#109)

## [v0.26.1] - 2022-09-23
### Fixed
* **Dryer/WasherDryer:** Restored support for these appliance types. (#107)

## [v0.26.0] - 2022-09-23
### Added
* **Hood:** Added ability to set the colour temperature of functional lights.
* **Hood:** Added automation triggers for grease filter saturation.
* **Washer/WasherDryer:** Added automation triggers for when i-Dos (1 or 2) fill levels are low.

## [v0.25.0] - 2022-07-11
### Added
* **Oven:** Added automation trigger for regular preheat finished (in addition to the existing fast preheat trigger).
* **Freezer/FridgeFreezer/Oven/Refrigerator:** Added ability to open or (Oven appliances only) partly open the appliance door, if supported by the appliance.
### Changed
* **CoffeeMaker/Dishwasher/Dryer/Freezer/FridgeFreezer/Oven/Refrigerator/Washer/WasherDryer/WineCooler:** To support opening the appliance door, the door position and lock status have been moved from the main power `Switch` to a new `Door` service. The `CurrentDoorState` characteristic has been replaced by `CurrentPosition`.

## [v0.24.6] - 2022-07-02
### Added
* Log and check version numbers of key dependencies.
### Changed
* More accurate specification of the required Node.js version.
* Bumped undici version to latest release.

## [v0.24.5] - 2022-06-17
### Changed
* Bumped undici version due to MITM vulnerability. (#90)

## [v0.24.4] - 2022-05-13
### Changed
* Workaround undocumented change to event stream format for `CONNECTED` and `DISCONNECTED` events. (#88)

## [v0.24.3] - 2022-05-05
### Fixed
* Corrected addition of `content-type` header with undici@5.1.0 and later. (#86)

## [v0.24.2] - 2022-05-04
### Fixed
* Added explicit `content-type` header to all authorization requests (Device Flow, Authorization Code Grant Flow, and Access Token refreshing). (#86)
### Changed
* If the Home Connect API reports that an appliance supports both `Off` and `Standby` then it is treated as an error, and neither are supported. (#83)
* **Dishwasher/Hood:** Set the initial value for `Brightness` characteristics at the same time as setting their allowed range. (#84)

## [v0.24.1] - 2022-04-03
### Fixed
* Bumped the minimum Node version to 16.14 (required for `AbortSignal.timeout()`. (#80)

## [v0.24.0] - 2022-04-02
### Fixed
* Fully support appliance `haID` values that are comprised of 18 decimal digits (rather than just those that include the manufacturer's name and model number). Loss of the event stream was previously ignored for these appliances, but is now treated the same as the appliance being disconnected.
### Changed
* Replaced used of `request` and `request-promise-native` (both deprecated since 11th February 2020) with `undici`. (This results in Node writing an `ExperimentalWarning: buffer.Blob is an experimental feature` message to the console, but this is safe to ignore.)
* Updated dependencies to the latest compatible versions. Node 16.5 (or later) is required.

## [v0.23.8] - 2022-03-14
### Fixed
* **CleaningRobot/Cooktop/Dishwasher:** When program options are read due to a new program being selected, the appliance's power and selected program are no longer controlled. This should prevent the appliance from being incorrectly switched off when being operated manually. (#78)

## [v0.23.7] - 2022-02-18
### Fixed
* Improved handling of appliances that are removed from and re-added to the Home Connect account. Previously, if the appliance was re-added without the plugin noticing its prior removal (via its hourly poll) then it would remain unusable until Homebridge is restarted. The `DEPAIRED` and `PAIRED` events are not treated similarly to `DISCONNECTED` and `CONNECTED`, updating the appliance's connection status appropriately.

## [v0.23.6] - 2022-02-09
### Fixed
* Improved handling of appliances that are in the `DISCONNECTED` state when Homebridge is (re)started. This should result in a more consistent state when appliances are switched off or otherwise inaccessible. (#72)

## [v0.23.5] - 2022-02-08
### Fixed
* Improved handling of `BSH.Common.Setting.PowerState` or `BSH.Common.Status.OperationState` reads that complete after a `DISCONNECTED` event. This should result in a more consistent state when appliances are switched off or otherwise inaccessible. (#72)

## [v0.23.4] - 2021-12-29
### Changed
* Removed dependency on the legacy Node.js `url` and `querystring` packages.
### Fixed
* Updated the Authorisation Code Grant Flow to work with the current implementation of the appliance simulators (the `redirect_uri` parameter is no longer optional for the Access Token Request).

## [v0.23.3] - 2021-05-16
### Fixed
* **Dishwasher/Dryer/Oven/Washer/WasherDryer:** Convert absolute times for program start (`BSH.Common.Option.StartInRelative`) or end (`BSH.Common.Option.FinishInRelative`) to the required delay in seconds every time that the program is started, rather than just the first time.

## [v0.23.2] - 2021-05-05
### Fixed
* **Dishwasher/Hood:** Fixed bug introduced in the previous version which broke all control of ambient lights. (#54)

## [v0.23.1] - 2021-05-04
### Fixed
* **Hood:** Fixed a possible race condition that may have prevented ambient light colour support from being identified correctly. (#54)

## [v0.23.0] - 2021-05-03
### Added
* **Dishwasher/Dryer/Oven/Washer/WasherDryer:** The program start time (`BSH.Common.Option.StartInRelative` for Dishwasher and Oven appliances) or end time (`BSH.Common.Option.FinishInRelative` for Dryer, Washer, and WasherDryer appliances) can now be specified as an absolute time instead of a relative time in seconds. The time should be specified in `HH:MM` format using the Homebridge server's timezone.

## [v0.22.0] - 2021-05-01
### Added
* **CoffeeMaker/Dishwasher/Dryer/Freezer/FridgeFreezer/Hob/Oven/Refrigerator/Washer/WarmingDrawer/WasherDryer/WineCooler:** Added child lock control as a `Lock Physical Controls` characteristic on the main power `Switch`.
* **CoffeeMaker:** Added control of the cup warmer.
* **Oven:** Added control of sabbath mode.
* **Hob/Oven:** Added alarm clock as a `Set Duration` characteristic on the main power `Switch`.
* **WarmingDrawer:** Added support for starting, stopping, and monitoring the `WarmingDrawer` program.

## [v0.21.0] - 2021-04-03
### Added
* **WarmingDrawer:** Added support for WarmingDrawer appliances.

## [v0.20.0] - 2021-04-02
### Added
* **Hob/Oven:** Added `Control` to the requested scopes when the plugin is authorised to access the Home Connect API. This allows Oven programs to be started and stopped, rather than just monitored. If the plugin has been previously authorised then it is necessary to force a re-authorisation for this to take effect. This can be achieved by stopping Homebridge, deleting the `~/.homebridge/homebridge-homeconnect/persist/94a08da1fecbb6e8b46990538c7b50b2` file, and then restarting Homebridge. An authorisation URL will be written to the Homebridge log output.

## [v0.19.2] - 2021-02-17
### Fixed
* If a persistent cache file cannot be read, e.g. due to being corrupt, then it is now treated as though it does not exist. (#47)

## [v0.19.1] - 2021-02-04
### Fixed
* **Oven:** Workaround for appliances reporting unsupported power states (due to be fixed in a firmware update). This restores the ability to switch the appliances to standby via this plugin.

## [v0.19.0] - 2020-12-06
### Added
* **CleaningRobot/Dishwasher/Dryer/Oven/Washer/WasherDryer:** Use Pause and/or Resume commands, if supported by the appliance. (#8)

## [v0.18.3] - 2020-10-25
### Fixed
* **CleaningRobot/CoffeeMaker/CookProcessor/Dishwasher/Dryer/Hob/Oven/Washer/WasherDryer:** Imply from a change to Operation State `Inactive` that the appliance Power State is `Standby`, even if no event has been been received. (#35)
* **CleaningRobot/CoffeeMaker/CookProcessor/Dishwasher/Dryer/Hob/Oven/Washer/WasherDryer:** Do not warn when the appliance does not have a program selected.

## [v0.18.2] - 2020-09-15
### Fixed
* **CleaningRobot/CoffeeMaker/CookProcessor/Dishwasher/Dryer/Hob/Oven/Washer/WasherDryer:** Imply from a change to Operation State `Ready` that the appliance Power State is `On`, even if no event has been been received. (#32)

## [v0.18.1] - 2020-05-24
### Fixed
* **Dishwasher/Hood:** Corrected discovery of functional or ambient light capabilities when the plugin is first started. (#24)
* **Dishwasher/Hood:** Brightness is now supported for ambient lights when set to custom colours. (#24)

## [v0.18.0] - 2020-05-09
### Fixed
* **Dishwasher/Hood:** Some appliances (such as the Bosch DWF97RW65/01 Hood) do not return information about all of the settings supported by their functional or ambient lights unless they are switched on. To cope with these appliances the plugin now attempts to switch the lights on when first started. (#24)

## [v0.17.3] - 2020-05-07
### Added
* **Dishwasher:** Added ambient light support.
* Added **[Verified By Homebridge](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)** badge to the `README.md`.
### Fixed
* **Hood:** Changes to the ambient light colour update the Hue and Saturation characteristics. (#24)

## [v0.17.2] - 2020-02-24
### Fixed
* **CleaningRobot/CoffeeMaker/CookProcessor/Dishwasher/Dryer/Hob/Oven/Washer/WasherDryer:** Further improvements to reading program options by selecting each program first. Added short delays after switching the appliance on, and after it indicates that it is ready, before attempting to select a program. Also avoid trying to restore the original program if none was selected. (#17 / #20)

## [v0.17.1] - 2020-02-24
### Fixed
* **CleaningRobot/CoffeeMaker/CookProcessor/Dishwasher/Dryer/Hob/Oven/Washer/WasherDryer:** Allow an appliance to take up to two minutes to be ready after being switched on. This is required for appliances that perform a cleaning cycle on start-up (such as the Bosch CTL636ES6/03 CoffeeMaker). (#17, #20)

## [v0.17.0] - 2020-02-23
### Changed
* **CleaningRobot/CoffeeMaker/CookProcessor/Dishwasher/Dryer/Hob/Oven/Washer/WasherDryer:** Some appliances (such as the Siemens TI9555X1DE CoffeeMaker) do not return correct information about their supported options unless the program is actually selected. To cope with these appliances the plugin now attempts to select each available program when first started and when the `Identify` routine is invoked. (#17)
* **CleaningRobot/CoffeeMaker/CookProcessor/Dishwasher/Dryer/Washer/WasherDryer:** Improved the configuration schema's handling of numeric program options with step size constraints. Options with a small number of allowed values are now enumerated explicitly, otherwise the required step size is added to the description. The schema's `multipleOf` is also set to the GCD (greatest common divisor) of the step sizes for all of the appliance's programs to allow some useful validation messages. (#18)

## [v0.16.9] - 2020-02-13
### Fixed
* **CleaningRobot/CoffeeMaker/CookProcessor/Dishwasher/Dryer/Hob/Oven/Washer/WasherDryer:** Corrected bug that prevented details of supported programs being written to the log file when the program options have not been read successfully. (#17)

## [v0.16.8] - 2020-02-10
### Fixed
* **Hood:** Fixed control of ambient and functional lights, broken in v0.16.6. (#2)

## [v0.16.7] - 2020-02-05
### Changed
* **CoffeeMaker/Dishwasher/Dryer/Hob/Hood/Oven/Washer/WasherDryer:** Avoid issuing API requests to read or change settings where they would result in errors. In particular, settings (such as power on/off) are now only changed when remote control is enabled and local control is not active. For Hood appliances the details of the functional and ambient light settings are only read after confirming that those settings are supported.
* Suppress the error that is returned when no programs are available due to an appliance's state.
* Enable timeouts for all Home Connect API requests. This ensures that event stream failures are detected reliably.

## [v0.16.6] - 2020-01-29
### Fixed
* Fixed bug that prevented retries from working when an error occurs reading the appliance state following (re)connection.

## [v0.16.5] - 2020-01-28
### Changed
* There appears to be a Home Connect server problem that sometimes introduces hexadecimal numbers (or spurious HTTP headers) into the event stream. When this is detected the event stream is now terminated and restarted.

## [v0.16.4] - 2020-01-27
### Fixed
* **Hood:** Fixed reading of fan program options, broken in v0.14.0. (#2)
* Fixed error introduced in v0.16.2 that prevented loss of the event stream from being treated as the appliance being disconnected. (#13)
* **CoffeeMaker/CookProcessor/Dryer/Hood/Oven/Washer/WasherDryer:** Increased the range of the `Remaining Duration` characteristic to allow for any delayed start in addition to the actual program duration.

## [v0.16.3] - 2020-01-26
### Fixed
* The initial state of the power `Switch` service is now set correctly when the plugin starts (or an appliance re-establishes a connection to the Home Connect servers). The last release set it to off when appliance connected (instead of just when it disconnected). (#12)

## [v0.16.2] - 2020-01-26
### Changed
* **CoffeeMaker/CookProcessor/Dryer/Hood/Oven/Washer/WasherDryer:** Set the `Remaining Duration` characteristic during any delayed start, instead of just while the program is active.
* Include pre-authorisation errors in the log output even when debug logging is not enabled (Homebridge `-D` option not specified). When logging to a destination that supports colour the authorisation URL is also highlighted in green.
* Added a `User-Agent` header to all Home Connect API requests. This is generated from the npm package name and version, e.g. `homebridge-homeconnect/0.16.2`.
* Miscellaneous improvements to the handling of incorrect Home Connect server behaviour. Invalid empty responses are now trapped explicitly. Increased maximum delay between retries after server errors from 1 minute to 10 minutes, and share the delay between all appliances. Read the appliance connection status before reading other state to reset API error count.
* Some appliances update their supported options after a program has been selected. To support these appliances the configuration schema is now updated each time that a program is selected. Previously the details of available programs were only read at plugin start-up or when `Identify` was invoked.

## [v0.16.1] - 2020-01-23
### Added
* **Dryer/Oven/Washer/WasherDryer:** Added a `Lock Current State` characteristic to indicate when the door is locked. (#3)
### Changed
* Removed workaround for a Home Connect API issue (affecting Thermador PRD486WDHU/01 Oven) that has now been fixed. (#2)
* Demoted some log messages from info to debug that are not useful in non-debug scenarios.
### Fixed
* **Dryer/Oven/Washer/WasherDryer:** Correctly handle the door locked state; previously it was treated as open instead of closed. (#3)

## [v0.16.0] - 2020-01-22
### Added
* **CleaningRobot:** Added a `Battery Service` service to indicate the battery charge level and its charging status.
### Changed
* Use the new dynamic configuration schema support in [Homebridge UI](https://github.com/homebridge/homebridge-config-ui-x) version 4.8.1. This saves the schema as `~/.homebridge/.homebridge-homeconnect-v1.schema.json` instead of overwriting `config.schema.json` in the installation directory, so works even if the plugin does not have write access to its installation directory.
* The OAuth `access_token` and `refresh_token` are now obfuscated before being written to the log file; only the first 4 and final 8 characters are recorded. This is sufficient for debugging purposes, but prevents account access if a log file is posted publicly. Note that codes used during the initial authorisation are still logged, but these have very short validity periods (the `device_code` and `user_code` for physical appliances are only valid for 5 minutes, and the `authorization_code` for the simulator is valid for 10 minutes).

## [v0.15.0] - 2020-01-21
### Changed
* A single events stream is used to monitor all appliances instead of a separate stream per appliance, reducing the number of requests issued to the Home Connect servers. This only works with physical appliances, so a separate stream is still established for each simulator appliance.
* Preparation for using the upcoming dynamic configuration schema support in [Homebridge UI](https://github.com/homebridge/homebridge-config-ui-x).
### Fixed
* **Hood:** Fixed a stupid error that prevented the `Fan` service from being initialised. (#2)
* Fixed an error that prevented accessories from being removed when no configuration is provided for this plugin.
* If a Home Connect event stream is interrupted then appliance updates may be missed, resulting in the plugin's state not matching the appliance. The plugin now polls the appliance status after the event stream is re-established. It also retries if any unexpected errors occur while reading the status.
* **CoffeeMaker/CookProcessor/Dryer/Hood/Oven/Washer/WasherDryer:** The `Remaining Duration` characteristic is now only updated while there is an active program. Some appliances generate a `RemainingProgramTime` event when a program is selected or its options changed, which previously resulted in the characteristic being set inappropriately.

## [v0.14.0] - 2020-01-18
### Added
* Added an experimental configuration schema (`config.schema.json`) for [Homebridge UI](https://github.com/homebridge/homebridge-config-ui-x). The schema is dynamically updated by the plugin to add the authorisation link and settings for appliance programs. This only works if the plugin has write access to the schema file in its installation directory.
* New configuration option `"language": { "api": "en-GB" }` enables selection of the Home Connect API language. This affects the names of program `Switch` services and options in the configuration schema.
### Changed
* **CleaningRobot/CoffeeMaker/CookProcessor/Dishwasher/Dryer/Hob/Oven/Washer/WasherDryer:** Created a new `Switch` service to indicate when a program is active. This replaces the `Active` characteristic that was previously on the main power `Switch` service (which caused problems with Siri switching the appliance power on or off). The `Remaining Duration`, `Status Active`, and `Status Fault` characteristics have also been relocated to the new `Switch`. (#10)
* **Hood:** The `Remaining Duration` characteristic has been relocated to the `Fan` service. The `Active` characteristic has been removed. (#10)
* **CoffeeMaker/Dishwasher/Dryer/Hob/Hood/Oven/Washer/WasherDryer:** Updates to the `Program Mode` characteristic are delayed until all of the state on which it depends has been updated. This prevents it from being temporarily set to an incorrect value.
* The appliance name is no longer included in HomeKit service names. This only affects newly created accessories.
* **Oven:** Program options are now hidden in the `Identify` log output for appliances without `Control` scope authorised.
* Upgraded `node-persist` from version 0.0.8 to 3.0.5. Any authorisation tokens saved by the previous version are imported and migrated to the new format.
* Cached appliance capabilities are now expired after 24 hours, or when the API language is changed. This ensures that any new API capabilities, or changes to the language configuration, are detected when Homebridge is restarted.
* **Hood/Oven:** Expected API errors are now only logged at debug log level. This includes queries for settings or programs that are not supported by a specific appliance. (#2)
### Fixed
* **Hood:** The active program is now checked when an appliance reconnects to the Home Connect servers. This was already done for other appliance types that support programs. (#2)

## [v0.13.0] - 2020-01-09
### Added
* **CleaningRobot/CoffeeMaker/Dishwasher/Dryer/Washer/WasherDryer:** New program configuration option `"selectonly": true` causes `Switch` services to select the program and its options rather than to start it. (#1 / #3)
* **Freezer/FridgeFreezer/Refrigerator/WineCooler:** Added `Switch` services to control the appliance's cooling modes.
* Created this `CHANGELOG.md` file. (#9)
### Changed
* The `Current Door State`, `Remaining Duration`, `Active`, `Status Active`, `Status Fault`, and `Program Mode` characteristics and now added to the main power `Switch` service instead of using a non-standard `Home Appliance` service. This improves how the characteristics are displayed by some HomeKit apps.
### Fixed
* **Hood:** Removed the Valid Values from the `Rotation Speed` characteristic. This descriptor is only intended to be used for enum values. (#2)
* Suppressed `EventEmitter` warning for more than ten listeners to an event. This was displayed in the log when a large number of program `Switch` services were created, but is perfectly safe. (#3)
  
## [v0.12.0] - 2020-01-05
### Changed
* **Hood:** The percentage values used for the `Rotation Speed` characteristic that correspond to low/medium/high speed from Siri are forced to 25%/50%/100%. This results in a non-linear scale, but should behave more consistently when Siri is used to change the speed. The preferred percentage values are provided to HomeKit in a Valid Values descriptor. (#2)
* Home Connect API requests are now only issued if they are expected to succeed in the appliance's current state and with the currently authorised scopes. This reduces the number of requests that result in errors, making it less likely that the API rate limits will be exceeded and the client blocked.
### Fixed
* **Hood:** The `Target Fan State` characteristic is no longer updated when a program stops (`BSH.Common.Root.ActiveProgram` reported as `null` in an event). This prevents the manual/auto setting being incorrectly changed. (#2)

## [v0.11.0] - 2020-01-05
### Added
* **CleaningRobot/CookProcessor:** Additional appliance types are now explicitly supported. Previously they just implemented a read-only `Switch` for their power status.
* **Hood:** Added support for the intensive setting (`Cooking.Common.Option.Hood.IntensiveLevel`) on appliances that support it. This is treated as an additional one or two fan speeds above the standard venting levels. (#2)
### Changed
* **Hood:** The step size for the `Rotation Speed` characteristic is now selected an an integer value that allows 25%/50%/100% to be selected (since Siri uses these percentages for low/medium/high). Previously the step size was calculated as 100% full-scale divided by the number of supported fan speeds, but that caused problems due to rounding errors with fractional values. (#2)
* **Hood:** Requesting 0% fan speed now stops the current program instead of changing the current program's options. (#2)
* The ability to switch an appliance off or place it in standby is now determined automatically (by querying the allowed values for `BSH.Common.Setting.PowerState`) instead of being hardcoded based on the appliance type.
### Fixed
* **Hood:** Cope with `FanOff` (or `IntensiveStageOff`) not being included in the `allowedvalues` for the `Cooking.Common.Program.Hood.Venting` program options (contrary to the Home Connect documentation). (#2)

## [v0.10.1] - 2020-01-04
### Fixed
* `Program Mode` (added in [v0.10.0]) is now listed as an optional characteristic for the `Home Appliance` service. This prevents `HAP Warning` messages appearing in the log file during start-up. (#2)

## [v0.10.0] - 2020-01-04
### Added
* **CoffeeMaker/Dishwasher/Dryer/Washer/WasherDryer:** Experimental support for pausing and resuming the active program using the `Active` characteristic. This feature is not supported by the appliance simulators and the Home Connect API documentation is incomplete, so additional information is written to the log file to help understand how appliances implement this feature. (#8)
* **Oven:** Added a `Stateless Programmable Switch` event to indicate when a program has been aborted.
* A new `Program Mode` characteristic indicates when the appliance is being controlled locally and when remote control/start are active.
### Changed
* **Hood:** Extra debug information captured to the log file when the appliance sends an event for an invalid fan speed. Also made this non-fatal to prevent Homebridge from crashing. (#2)
* The power `Switch` is now marked as being the appliance's primary service. (#7)
* **CoffeeMaker/Dishwasher/Dryer/Oven/Washer/WasherDryer:** The program `Switch` services are now linked to the `Home Appliance` service and to each other. (#7)
* **Hood:** The functional `Lightbulb` and ambient `Lightbulb` services are now linked to each other. (#7)
* The active program is no longer queried when the appliance is not running a program. This reduces the number of requests that result in errors, making it less likely that the API rate limits will be exceeded and the client blocked.
* Improved logging of errors to further assist with debugging.
### Removed
* `Stateless Programmable Switch` services no longer generate `Double Press` events. These were previously intended to indicate when an event had been confirmed by the user (`BSH.Common.EnumType.EventPresentState.Confirmed`) but neither the physical appliances nor the simulators generate this value. Only `Single Press` events are now triggered.
### Fixed
* **CoffeeMaker/Dishwasher/Dryer/Oven/Washer/WasherDryer:** Program options are handled better when writing them to the log file in response to `Identify`. In particular, any default values provided by the appliance are used (instead of using the minimum allowed or the first enum value), and the allowed values for `Boolean` types are also output. (#1 / #3)
* **Fridge/FridgeFreezer/Refrigerator:** The FridgeFreezer simulator uses the incorrect value for its door alarm events (`BSH.Common.EnumType.DoorState.Open` instead of `BSH.Common.EnumType.EventPresentState.Present`). These are now treated as synonymous.
* The `Status Active` characteristic is now only set to `false` under abnormal conditions (`Pause`, `ActionRequired`, `Error`, and `Aborting`). The previous behaviour of only setting it to `true` while running a program (`Run`) resulted in a misleading warning symbol and message within the Elgato Eve app when the appliance was working properly. Setting of the `Status` characteristic has also been tweaked. (#6)

## [v0.9.1] - 2020-01-01
### Changed
* Moved most documentation from the `README.md` file to the project's [Wiki].

## [v0.9.0] - 2019-12-31
### Changed
* **Hood:** Setting a new fan speed is now implemented by changing the current program's options instead of starting a new program. This makes it less likely that the API rate limits will be exceeded and the client blocked. (#2)
* **Hood:** Appended `" fan"` to the name of the `Fan` service. This only affects newly created accessories.
### Fixed
* **Hood:** Changes to multiple `Fan` or `Lightbulb` characteristics (separately for functional and ambient lights) are merged and then the Home Connect requests issued in sequence. This avoids trying to set intermediate states, as well as overlapping requests to control the same feature, resulting in more reliable behaviour. (#2)
* **CoffeeMaker/Dishwasher/Dryer/Washer/WasherDryer:** Program `Switch` services are now left writeable rather than attempting to make them read-only when remote start is not enabled. HomeKit is not designed to dynamically change the properties of characteristics in this way, so the previous behaviour did not propagate reliably. (#1 / #3)
* **Oven:** Added the error code `BSH.Common.Error.InvalidUIDValue` to the list of responses that are treated as cacheable. This undocumented error code is returned by the Thermador PRD486WDHU/01 Oven. (#2)

## [v0.8.0] - 2019-12-30
### Added
* **CoffeeMaker/Dishwasher/Dryer/Oven/Washer/WasherDryer:** Added experimental support for starting and stopping programs (or monitoring their use on Oven appliances). By default a `Switch` is added for each program that the appliance supports. This can be customised via the `config.json` file to tailor the list of programs and their options. A template configuration is written to the Homebridge log file when the appliance's `Identify` routine is triggered. (#1 / #3)
* **CoffeeMaker:** Added `Stateless Programmable Switch` events for bean container empty, water tank empty, and drip tray full.
* **Freezer/FridgeFreezer/Refrigerator:** Added `Stateless Programmable Switch` events for door open and temperature alarms.
* The authorised Home Connect scopes are now remembered. This may be used in the future to enable additional functionality for Oven appliances if the `Oven-Control` scope is granted.

## [v0.7.0] - 2019-12-29
### Changed
* **Hood:** The supported fan speeds are read from the appliance rather than being hardcoded. (#2)
* **Hood:** Only attempt to stop a program when one is running. This reduces the number of requests that result in errors, making it less likely that the API rate limits will be exceeded and the client blocked.

## [v0.6.0] - 2019-12-29
### Added
* **Hood:** Added support for controlling an ambient light, including selecting its colour (custom colours only). The appliance is now queried when the plugin is first started to determine whether it incorporates functional and/or ambient lights and their capabilities. The result is cached persistently. (#2)
### Changed
* **CoffeeMaker/Dishwasher/Dryer/Oven/Washer/WasherDryer:** Improved how available programs are displayed in the log output in response to an `Identify` routine. A warning is now output if some programs are not currently available, and hence not listed in the log output. Spaces have been added to the characters allowed in the simplified program names.
* Code significantly restructured to be more maintainable.

## [v0.5.0] - 2019-12-28
### Added
* **Hood:** Added `Fan` and `Lightbulb` services for controlling the extractor fan and functional light in Hood appliances. This is a very quick prototype to obtain feedback on how Hood appliances behave. It uses a hardcoded configuration, assuming that the fan supports 5 venting levels and that there is a functional light with brightness control. (#2)

## [v0.4.0] - 2019-12-28
### Added
* **Hood:** Added minimal support for Hood appliances (just program finished events, remaining program time, and operation state). No support for controlling the fan or light(s) yet. (#2)
* **CoffeeMaker/Dishwasher/Dryer/Oven/Washer/WasherDryer:** When the HomeKit accessory's `Identify` method is used the programs supported by the appliance are queried and written to the log file. This may form the basis of starting and stopping programs in a future release.

## [v0.3.1] - 2019-12-25
### Changed
* Additional appliance state (the selected and active programs) is read when a connection to the appliance is first established, or reestablished after being disconnected. This state is logged, but not otherwise used by the plugin currently.

## [v0.3.0] - 2019-12-25
### Added
* **Freezer/Refrigerator/WasherDryer:** Added minimal support for these appliance types (just power, door status, program aborted/finished events, remaining program time, and operation state).

## [v0.2.0] - 2019-12-25
### Added
* **CoffeeMaker/Dryer/FridgeFreezer/Washer:** Added minimal support for these appliance types (just power, door status, program aborted/finished events, remaining program time, and operation state).
### Changed
* **Dishwasher/Oven:** `Remaining Duration` characteristic is now reset to 0 when a program finishes, even if the appliance does not generate a remaining time event. Also reduced its maximum value from 86,400 to 86,340.
* Suppress warnings in the log file for event stream lines that begin with a colon (such as ":ok" from the simulators). The Server-Sent Events (SSE) specification defines these as comments, but they are not described in the Home Connect documentation.

## [v0.1.0] - 2019-12-24
* Initial version.

---

Copyright © 2019-2024 Alexander Thoukydides

[Unreleased]:       https://github.com/thoukydides/homebridge-homeconnect/compare/v1.2.6...HEAD
[v1.2.6]:           https://github.com/thoukydides/homebridge-homeconnect/compare/v1.2.5...v1.2.6
[v1.2.5]:           https://github.com/thoukydides/homebridge-homeconnect/compare/v1.2.4...v1.2.5
[v1.2.4]:           https://github.com/thoukydides/homebridge-homeconnect/compare/v1.2.3...v1.2.4
[v1.2.3]:           https://github.com/thoukydides/homebridge-homeconnect/compare/v1.2.2...v1.2.3
[v1.2.2]:           https://github.com/thoukydides/homebridge-homeconnect/compare/v1.2.1...v1.2.2
[v1.2.1]:           https://github.com/thoukydides/homebridge-homeconnect/compare/v1.2.0...v1.2.1
[v1.2.0]:           https://github.com/thoukydides/homebridge-homeconnect/compare/v1.1.2...v1.2.0
[v1.1.2]:           https://github.com/thoukydides/homebridge-homeconnect/compare/v1.1.0...v1.1.2
[v1.1.0]:           https://github.com/thoukydides/homebridge-homeconnect/compare/v1.0.7...v1.1.0
[v1.0.7]:           https://github.com/thoukydides/homebridge-homeconnect/compare/v1.0.5...v1.0.7
[v1.0.5]:           https://github.com/thoukydides/homebridge-homeconnect/compare/v1.0.4...v1.0.5
[v1.0.4]:           https://github.com/thoukydides/homebridge-homeconnect/compare/v1.0.3...v1.0.4
[v1.0.3]:           https://github.com/thoukydides/homebridge-homeconnect/compare/v1.0.2...v1.0.3
[v1.0.2]:           https://github.com/thoukydides/homebridge-homeconnect/compare/v1.0.1...v1.0.2
[v1.0.1]:           https://github.com/thoukydides/homebridge-homeconnect/compare/v1.0.0...v1.0.1
[v1.0.0]:           https://github.com/thoukydides/homebridge-homeconnect/compare/v0.42.4...v1.0.0
[v0.42.4]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.42.3...v0.42.4
[v0.42.3]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.42.2...v0.42.3
[v0.42.2]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.42.1...v0.42.2
[v0.42.1]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.42.0...v0.42.1
[v0.42.0]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.41.4...v0.42.0
[v0.41.4]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.41.3...v0.41.4
[v0.41.3]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.41.2...v0.41.3
[v0.41.2]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.41.1...v0.41.2
[v0.41.1]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.41.0...v0.41.1
[v0.41.0]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.40.1...v0.41.0
[v0.40.1]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.40.0...v0.40.1
[v0.40.0]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.39.1...v0.40.0
[v0.39.1]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.39.0...v0.39.1
[v0.39.0]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.38.0...v0.39.0
[v0.38.0]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.37.12...v0.38.0
[v0.37.12]:         https://github.com/thoukydides/homebridge-homeconnect/compare/v0.37.11...v0.37.12
[v0.37.11]:         https://github.com/thoukydides/homebridge-homeconnect/compare/v0.37.10...v0.37.11
[v0.37.10]:         https://github.com/thoukydides/homebridge-homeconnect/compare/v0.37.9...v0.37.10
[v0.37.9]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.37.8...v0.37.9
[v0.37.8]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.37.7...v0.37.8
[v0.37.7]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.37.6...v0.37.7
[v0.37.6]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.37.5...v0.37.6
[v0.37.5]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.37.4...v0.37.5
[v0.37.4]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.37.3...v0.37.4
[v0.37.3]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.37.2...v0.37.3
[v0.37.2]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.37.1...v0.37.2
[v0.37.1]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.37.0...v0.37.1
[v0.37.0]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.36.0...v0.37.0
[v0.36.0]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.35.0...v0.36.0
[v0.35.0]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.34.2...v0.35.0
[v0.34.2]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.34.1...v0.34.2
[v0.34.1]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.34.0...v0.34.1
[v0.34.0]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.33.1...v0.34.0
[v0.33.1]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.33.0...v0.33.1
[v0.33.0]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.32.0...v0.33.0
[v0.32.0]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.31.0...v0.32.0
[v0.31.0]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.30.2...v0.31.0
[v0.30.2]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.30.1...v0.30.2
[v0.30.1]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.30.0...v0.30.1
[v0.30.0]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.29.6...v0.30.0
[v0.29.6]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.29.5...v0.29.6
[v0.29.5]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.29.4...v0.29.5
[v0.29.4]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.29.3...v0.29.4
[v0.29.3]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.29.2...v0.29.3
[v0.29.2]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.29.1...v0.29.2
[v0.29.1]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.29.0...v0.29.1
[v0.29.0]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.28.0...v0.29.0
[v0.28.0]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.27.0...v0.28.0
[v0.27.0]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.26.3...v0.27.0
[v0.26.3]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.26.2...v0.26.3
[v0.26.2]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.26.1...v0.26.2
[v0.26.1]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.26.0...v0.26.1
[v0.26.0]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.25.0...v0.26.0
[v0.25.0]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.24.6...v0.25.0
[v0.24.6]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.24.5...v0.24.6
[v0.24.5]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.24.4...v0.24.5
[v0.24.4]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.24.3...v0.24.4
[v0.24.3]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.24.2...v0.24.3
[v0.24.2]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.24.1...v0.24.2
[v0.24.1]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.24.0...v0.24.1
[v0.24.0]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.23.8...v0.24.0
[v0.23.8]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.23.7...v0.23.8
[v0.23.7]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.23.6...v0.23.7
[v0.23.6]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.23.5...v0.23.6
[v0.23.5]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.23.4...v0.23.5
[v0.23.4]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.23.3...v0.23.4
[v0.23.3]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.23.2...v0.23.3
[v0.23.2]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.23.1...v0.23.2
[v0.23.1]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.23.0...v0.23.1
[v0.23.0]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.22.0...v0.23.0
[v0.22.0]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.21.0...v0.22.0
[v0.21.0]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.20.0...v0.21.0
[v0.20.0]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.19.2...v0.20.0
[v0.19.2]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.19.1...v0.19.2
[v0.19.1]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.19.0...v0.19.1
[v0.19.0]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.18.3...v0.19.0
[v0.18.3]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.18.2...v0.18.3
[v0.18.2]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.18.1...v0.18.2
[v0.18.1]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.18.0...v0.18.1
[v0.18.0]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.17.3...v0.18.0
[v0.17.3]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.17.2...v0.17.3
[v0.17.2]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.17.1...v0.17.2
[v0.17.1]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.17.0...v0.17.1
[v0.17.0]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.16.9...v0.17.0
[v0.16.9]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.16.8...v0.16.9
[v0.16.8]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.16.7...v0.16.8
[v0.16.7]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.16.6...v0.16.7
[v0.16.6]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.16.5...v0.16.6
[v0.16.5]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.16.4...v0.16.5
[v0.16.4]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.16.3...v0.16.4
[v0.16.3]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.16.2...v0.16.3
[v0.16.2]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.16.1...v0.16.2
[v0.16.1]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.16.0...v0.16.1
[v0.16.0]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.15.0...v0.16.0
[v0.15.0]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.14.0...v0.15.0
[v0.14.0]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.13.0...v0.14.0
[v0.13.0]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.12.0...v0.13.0
[v0.12.0]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.11.0...v0.12.0
[v0.11.0]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.10.1...v0.11.0
[v0.10.1]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.10.0...v0.10.1
[v0.10.0]:          https://github.com/thoukydides/homebridge-homeconnect/compare/v0.9.1...v0.10.0
[v0.9.1]:           https://github.com/thoukydides/homebridge-homeconnect/compare/v0.9.0...v0.9.1
[v0.9.0]:           https://github.com/thoukydides/homebridge-homeconnect/compare/v0.8.0...v0.9.0
[v0.8.0]:           https://github.com/thoukydides/homebridge-homeconnect/compare/v0.7.0...v0.8.0
[v0.7.0]:           https://github.com/thoukydides/homebridge-homeconnect/compare/v0.6.0...v0.7.0
[v0.6.0]:           https://github.com/thoukydides/homebridge-homeconnect/compare/v0.5.0...v0.6.0
[v0.5.0]:           https://github.com/thoukydides/homebridge-homeconnect/compare/v0.4.0...v0.5.0
[v0.4.0]:           https://github.com/thoukydides/homebridge-homeconnect/compare/v0.3.1...v0.4.0
[v0.3.1]:           https://github.com/thoukydides/homebridge-homeconnect/compare/v0.3.0...v0.3.1
[v0.3.0]:           https://github.com/thoukydides/homebridge-homeconnect/compare/v0.2.0...v0.3.0
[v0.2.0]:           https://github.com/thoukydides/homebridge-homeconnect/compare/v0.1.0...v0.2.0
[v0.1.0]:           https://github.com/thoukydides/homebridge-homeconnect/releases/tag/v0.1.0