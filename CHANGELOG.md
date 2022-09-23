# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [v0.26.1] - 2022-09-23
### Fixed
* **Dryer/WasherDryer:** Restored support for these appliance types. ([#107])

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
* Bumped undici version due to MITM vulnerability. ([#90])

## [v0.24.4] - 2022-05-13
### Changed
* Workaround undocumented change to event stream format for `CONNECTED` and `DISCONNECTED` events. ([#88])

## [v0.24.3] - 2022-05-05
### Fixed
* Corrected addition of `content-type` header with undici@5.1.0 and later. ([#86])

## [v0.24.2] - 2022-05-04
### Fixed
* Added explicit `content-type` header to all authorization requests (Device Flow, Authorization Code Grant Flow, and Access Token refreshing). ([#86])
### Changed
* If the Home Connect API reports that an appliance supports both `Off` and `Standby` then it is treated as an error, and neither are supported. ([#83])
* **Dishwasher/Hood:** Set the initial value for `Brightness` characteristics at the same time as setting their allowed range. ([#84])

## [v0.24.1] - 2022-04-03
### Fixed
* Bumped the minimum Node version to 16.14 (required for `AbortSignal.timeout()`. ([#80])

## [v0.24.0] - 2022-04-02
### Fixed
* Fully support appliance `haID` values that are comprised of 18 decimal digits (rather than just those that include the manufacturer's name and model number). Loss of the event stream was previously ignored for these appliances, but is now treated the same as the appliance being disconnected.
### Changed
* Replaced used of `request` and `request-promise-native` (both deprecated since 11th February 2020) with `undici`. (This results in Node writing an `ExperimentalWarning: buffer.Blob is an experimental feature` message to the console, but this is safe to ignore.)
* Updated dependencies to the latest compatible versions. Node 16.5 (or later) is required.

## [v0.23.8] - 2022-03-14
### Fixed
* **CleaningRobot/Cooktop/Dishwasher:** When program options are read due to a new program being selected, the appliance's power and selected program are no longer controlled. This should prevent the appliance from being incorrectly switched off when being operated manually. ([#78])

## [v0.23.7] - 2022-02-18
### Fixed
* Improved handling of appliances that are removed from and re-added to the Home Connect account. Previously, if the appliance was re-added without the plugin noticing its prior removal (via its hourly poll) then it would remain unusable until Homebridge is restarted. The `DEPAIRED` and `PAIRED` events are not treated similarly to `DISCONNECTED` and `CONNECTED`, updating the appliance's connection status appropriately.

## [v0.23.6] - 2022-02-09
### Fixed
* Improved handling of appliances that are in the `DISCONNECTED` state when Homebridge is (re)started. This should result in a more consistent state when appliances are switched off or otherwise inaccessible. ([#72])

## [v0.23.5] - 2022-02-08
### Fixed
* Improved handling of `BSH.Common.Setting.PowerState` or `BSH.Common.Status.OperationState` reads that complete after a `DISCONNECTED` event. This should result in a more consistent state when appliances are switched off or otherwise inaccessible. ([#72])

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
* **Dishwasher/Hood:** Fixed bug introduced in the previous version which broke all control of ambient lights. ([#54])

## [v0.23.1] - 2021-05-04
### Fixed
* **Hood:** Fixed a possible race condition that may have prevented ambient light colour support from being identified correctly. ([#54])

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
* **Hob/Oven:** Added `Control` to the requested scopes when the plugin is authorised to access the Home Connect API. This allows Oven programs to be started and stopped, rather than just monitored. If the plugin has been previously authorised then it is necessary to force a re-authorisation for this to take effect. This can be achieved by stopping Homebridge, deleting the `~/.homebridge/homebridge-homeconnect/persist/94a08da1fecbb6e8b46990538c7b50b2` file, and then restarting Homebridge. An authorisation URL will be written to the Homebridge log output. ([Scopes] / [Files])

## [v0.19.2] - 2021-02-17
### Fixed
* If a persistent cache file cannot be read, e.g. due to being corrupt, then it is now treated as though it does not exist. ([Files] / [#47])

## [v0.19.1] - 2021-02-04
### Fixed
* **Oven:** Workaround for appliances reporting unsupported power states (due to be fixed in a firmware update). This restores the ability to switch the appliances to standby via this plugin.

## [v0.19.0] - 2020-12-06
### Added
* **CleaningRobot/Dishwasher/Dryer/Oven/Washer/WasherDryer:** Use Pause and/or Resume commands, if supported by the appliance. ([#8])

## [v0.18.3] - 2020-10-25
### Fixed
* **CleaningRobot/CoffeeMaker/CookProcessor/Dishwasher/Dryer/Hob/Oven/Washer/WasherDryer:** Imply from a change to Operation State `Inactive` that the appliance Power State is `Standby`, even if no event has been been received. ([#35])
* **CleaningRobot/CoffeeMaker/CookProcessor/Dishwasher/Dryer/Hob/Oven/Washer/WasherDryer:** Do not warn when the appliance does not have a program selected.

## [v0.18.2] - 2020-09-15
### Fixed
* **CleaningRobot/CoffeeMaker/CookProcessor/Dishwasher/Dryer/Hob/Oven/Washer/WasherDryer:** Imply from a change to Operation State `Ready` that the appliance Power State is `On`, even if no event has been been received. ([#32])

## [v0.18.1] - 2020-05-24
### Fixed
* **Dishwasher/Hood:** Corrected discovery of functional or ambient light capabilities when the plugin is first started. ([#24])
* **Dishwasher/Hood:** Brightness is now supported for ambient lights when set to custom colours. ([#24])

## [v0.18.0] - 2020-05-09
### Fixed
* **Dishwasher/Hood:** Some appliances (such as the Bosch DWF97RW65/01 Hood) do not return information about all of the settings supported by their functional or ambient lights unless they are switched on. To cope with these appliances the plugin now attempts to switch the lights on when first started. ([#24])

## [v0.17.3] - 2020-05-07
### Added
* **Dishwasher:** Added ambient light support.
* Added **[Verified By Homebridge](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)** badge to the `README.md`.
### Fixed
* **Hood:** Changes to the ambient light colour update the Hue and Saturation characteristics. ([#24])

## [v0.17.2] - 2020-02-24
### Fixed
* **CleaningRobot/CoffeeMaker/CookProcessor/Dishwasher/Dryer/Hob/Oven/Washer/WasherDryer:** Further improvements to reading program options by selecting each program first. Added short delays after switching the appliance on, and after it indicates that it is ready, before attempting to select a program. Also avoid trying to restore the original program if none was selected. ([#17], [#20])

## [v0.17.1] - 2020-02-24
### Fixed
* **CleaningRobot/CoffeeMaker/CookProcessor/Dishwasher/Dryer/Hob/Oven/Washer/WasherDryer:** Allow an appliance to take up to two minutes to be ready after being switched on. This is required for appliances that perform a cleaning cycle on start-up (such as the Bosch CTL636ES6/03 CoffeeMaker). ([#17], [#20])

## [v0.17.0] - 2020-02-23
### Changed
* **CleaningRobot/CoffeeMaker/CookProcessor/Dishwasher/Dryer/Hob/Oven/Washer/WasherDryer:** Some appliances (such as the Siemens TI9555X1DE CoffeeMaker) do not return correct information about their supported options unless the program is actually selected. To cope with these appliances the plugin now attempts to select each available program when first started and when the `Identify` routine is invoked. ([#17])
* **CleaningRobot/CoffeeMaker/CookProcessor/Dishwasher/Dryer/Washer/WasherDryer:** Improved the configuration schema's handling of numeric program options with step size constraints. Options with a small number of allowed values are now enumerated explicitly, otherwise the required step size is added to the description. The schema's `multipleOf` is also set to the GCD (greatest common divisor) of the step sizes for all of the appliance's programs to allow some useful validation messages. ([#18])

## [v0.16.9] - 2020-02-13
### Fixed
* **CleaningRobot/CoffeeMaker/CookProcessor/Dishwasher/Dryer/Hob/Oven/Washer/WasherDryer:** Corrected bug that prevented details of supported programs being written to the log file when the program options have not been read successfully. ([#17])

## [v0.16.8] - 2020-02-10
### Fixed
* **Hood:** Fixed control of ambient and functional lights, broken in v0.16.6. ([#2])

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
* **Hood:** Fixed reading of fan program options, broken in v0.14.0. ([#2])
* Fixed error introduced in v0.16.2 that prevented loss of the event stream from being treated as the appliance being disconnected. ([#13])
* **CoffeeMaker/CookProcessor/Dryer/Hood/Oven/Washer/WasherDryer:** Increased the range of the `Remaining Duration` characteristic to allow for any delayed start in addition to the actual program duration.

## [v0.16.3] - 2020-01-26
### Fixed
* The initial state of the power `Switch` service is now set correctly when the plugin starts (or an appliance re-establishes a connection to the Home Connect servers). The last release set it to off when appliance connected (instead of just when it disconnected). ([#12])

## [v0.16.2] - 2020-01-26
### Changed
* **CoffeeMaker/CookProcessor/Dryer/Hood/Oven/Washer/WasherDryer:** Set the `Remaining Duration` characteristic during any delayed start, instead of just while the program is active.
* Include pre-authorisation errors in the log output even when debug logging is not enabled (Homebridge `-D` option not specified). When logging to a destination that supports colour the authorsation URL is also highlighted in green.
* Added a `User-Agent` header to all Home Connect API requests. This is generated from the npm package name and version, e.g. `homebridge-homeconnect/0.16.2`.
* Miscellaneous improvements to the handling of incorrect Home Connect server behaviour. Invalid empty responses are now trapped explicitly. Increased maximum delay between retries after server errors from 1 minute to 10 minutes, and share the delay between all appliances. Read the appliance connection status before reading other state to reset API error count. ([Errors] / [Rate Limits])
* Some appliances update their supported options after a program has been selected. To support these appliances the configuration schema is now updated each time that a program is selected. Previously the details of available programs were only read at plugin start-up or when `Identify` was invoked. ([config.json] / [Programs])

## [v0.16.1] - 2020-01-23
### Added
* **Dryer/Oven/Washer/WasherDryer:** Added a `Lock Current State` characteristic to indicate when the door is locked. ([#3])
### Changed
* Removed workaround for a Home Connect API issue (affecting Thermador PRD486WDHU/01 Oven) that has now been fixed. ([#2])
* Demoted some log messages from info to debug that are not useful in non-debug scenarios.
### Fixed
* **Dryer/Oven/Washer/WasherDryer:** Correctly handle the door locked state; previously it was treated as open instead of closed. ([#3])

## [v0.16.0] - 2020-01-22
### Added
* **CleaningRobot:** Added a `Battery Service` service to indicate the battery charge level and its charging status.
### Changed
* Use the new dynamic configuration schema support in [homebridge-config-ui-x](https://github.com/oznu/homebridge-config-ui-x) version 4.8.1. This saves the schema as `~/.homebridge/.homebridge-homeconnect-v1.schema.json` instead of overwriting `config.schema.json` in the installation directory, so works even if the plugin does not have write access to its installation directory. ([config.json] / [Programs])
* The OAuth `access_token` and `refresh_token` are now obfuscated before being written to the log file; only the first 4 and final 8 characters are recorded. This is sufficient for debugging purposes, but prevents account access if a log file is posted publicly. Note that codes used during the initial authorisation are still logged, but these have very short validity periods (the `device_code` and `user_code` for physical appliances are only valid for 5 minutes, and the `authorization_code` for the simulator is valid for 10 minutes).

## [v0.15.0] - 2020-01-21
### Changed
* A single events stream is used to monitor all appliances instead of a separate stream per appliance, reducing the number of requests issued to the Home Connect servers. This only works with physical appliances, so a separate stream is still established for each simulator appliance. ([Rate Limits])
* Preparation for using the upcoming dynamic configuration schema support in [homebridge-config-ui-x](https://github.com/oznu/homebridge-config-ui-x).
### Fixed
* **Hood:** Fixed a stupid error that prevented the `Fan` service from being initialised. ([#2])
* Fixed an error that prevented accessories from being removed when no configuration is provided for this plugin.
* If a Home Connect event stream is interrupted then appliance updates may be missed, resulting in the plugin's state not matching the appliance. The plugin now polls the appliance status after the event stream is re-established. It also retries if any unexpected errors occur while reading the status. ([Errors])
* **CoffeeMaker/CookProcessor/Dryer/Hood/Oven/Washer/WasherDryer:** The `Remaining Duration` characteristic is now only updated while there is an active program. Some appliances generate a `RemainingProgramTime` event when a program is selected or its options changed, which previously resulted in the characteristic being set inappropriately.

## [v0.14.0] - 2020-01-18
### Added
* Added an experimental configuration schema (`config.schema.json`) for [homebridge-config-ui-x](https://github.com/oznu/homebridge-config-ui-x). The schema is dynamically updated by the plugin to add the authorisation link and settings for appliance programs. This only works if the plugin has write access to the schema file in its installation directory. ([config.json] / [Programs])
* New configuration option `"language": { "api": "en-GB" }` enables selection of the Home Connect API language. This affects the names of program `Switch` services and options in the configuration schema. ([config.json] / [Programs])
### Changed
* **CleaningRobot/CoffeeMaker/CookProcessor/Dishwasher/Dryer/Hob/Oven/Washer/WasherDryer:** Created a new `Switch` service to indicate when a program is active. This replaces the `Active` characteristic that was previously on the main power `Switch` service (which caused problems with Siri switching the appliance power on or off). The `Remaining Duration`, `Status Active`, and `Status Fault` characteristics have also been relocated to the new `Switch`. ([HomeKit Mapping] / [#10])
* **Hood:** The `Remaining Duration` characteristic has been relocated to the `Fan` service. The `Active` characteristic has been removed. ([HomeKit Mapping] / [#10])
* **CoffeeMaker/Dishwasher/Dryer/Hob/Hood/Oven/Washer/WasherDryer:** Updates to the `Program Mode` characteristic are delayed until all of the state on which it depends has been updated. This prevents it from being temporarily set to an incorrect value.
* The appliance name is no longer included in HomeKit service names. This only affects newly created accessories.
* **Oven:** Program options are now hidden in the `Identify` log output for appliances without `Control` scope authorised. ([Programs] / [Scopes])
* Upgraded `node-persist` from version 0.0.8 to 3.0.5. Any authorisation tokens saved by the previous version are imported and migrated to the new format.
* Cached appliance capabilities are now expired after 24 hours, or when the API language is changed. This ensures that any new API capabilities, or changes to the language configuration, are detected when Homebridge is restarted.
* **Hood/Oven:** Expected API errors are now only logged at debug log level. This includes queries for settings or programs that are not supported by a specific appliance. ([#2])
### Fixed
* **Hood:** The active program is now checked when an appliance reconnects to the Home Connect servers. This was already done for other appliance types that support programs. ([#2])

## [v0.13.0] - 2020-01-09
### Added
* **CleaningRobot/CoffeeMaker/Dishwasher/Dryer/Washer/WasherDryer:** New program configuration option `"selectonly": true` causes `Switch` services to select the program and its options rather than to start it. ([config.json] / [#1] / [#3])
* **Freezer/FridgeFreezer/Refrigerator/WineCooler:** Added `Switch` services to control the appliance's cooling modes. ([Functionality])
* Created this `CHANGELOG.md` file. ([#9])
### Changed
* The `Current Door State`, `Remaining Duration`, `Active`, `Status Active`, `Status Fault`, and `Program Mode` characteristics and now added to the main power `Switch` service instead of using a non-standard `Home Appliance` service. This improves how the characteristics are displayed by some HomeKit apps. ([HomeKit Mapping])
### Fixed
* **Hood:** Removed the Valid Values from the `Rotation Speed` characteristic. This descriptor is only intended to be used for enum values. ([#2])
* Suppressed `EventEmitter` warning for more than ten listeners to an event. This was displayed in the log when a large number of program `Switch` services were created, but is perfectly safe. ([#3])
  
## [v0.12.0] - 2020-01-05
### Changed
* **Hood:** The percentage values used for the `Rotation Speed` characteristic that correspond to low/medium/high speed from Siri are forced to 25%/50%/100%. This results in a non-linear scale, but should behave more consistently when Siri is used to change the speed. The preferred percentage values are provided to HomeKit in a Valid Values descriptor. ([#2])
* Home Connect API requests are now only issued if they are expected to succeed in the appliance's current state and with the currently authorised scopes. This reduces the number of requests that result in errors, making it less likely that the API rate limits will be exceeded and the client blocked. ([Rate Limits])
### Fixed
* **Hood:** The `Target Fan State` characteristic is no longer updated when a program stops (`BSH.Common.Root.ActiveProgram` reported as `null` in an event). This prevents the manual/auto setting being incorrectly changed. ([#2])

## [v0.11.0] - 2020-01-05
### Added
* **CleaningRobot/CookProcessor:** Additional appliance types are now explicitly supported. Previously they just implemented a read-only `Switch` for their power status. ([Functionality])
* **Hood:** Added support for the intensive setting (`Cooking.Common.Option.Hood.IntensiveLevel`) on appliances that support it. This is treated as an additional one or two fan speeds above the standard venting levels. ([#2])
### Changed
* **Hood:** The step size for the `Rotation Speed` characteristic is now selected an an integer value that allows 25%/50%/100% to be selected (since Siri uses these percentages for low/medium/high). Previously the step size was calculated as 100% full-scale divided by the number of supported fan speeds, but that caused problems due to rounding errors with fractional values. ([#2])
* **Hood:** Requesting 0% fan speed now stops the current program instead of changing the current program's options. ([#2])
* The ability to switch an appliance off or place it in standby is now determined automatically (by querying the allowed values for `BSH.Common.Setting.PowerState`) instead of being hardcoded based on the appliance type.
### Fixed
* **Hood:** Cope with `FanOff` (or `IntensiveStageOff`) not being included in the `allowedvalues` for the `Cooking.Common.Program.Hood.Venting` program options (contrary to the Home Connect documentation). ([#2])

## [v0.10.1] - 2020-01-04
### Fixed
* `Program Mode` (added in [v0.10.0]) is now listed as an optional characteristic for the `Home Appliance` service. This prevents `HAP Warning` messages appearing in the log file during start-up. ([#2])

## [v0.10.0] - 2020-01-04
### Added
* **CoffeeMaker/Dishwasher/Dryer/Washer/WasherDryer:** Experimental support for pausing and resuming the active program using the `Active` characteristic. This feature is not supported by the appliance simulators and the Home Connect API documentation is incomplete, so additional information is written to the log file to help understand how appliances implement this feature. ([#8])
* **Oven:** Added a `Stateless Programmable Switch` event to indicate when a program has been aborted. ([Functionality])
* A new `Program Mode` characteristic indicates when the appliance is being controlled locally and when remote control/start are active. ([HomeKit Mapping])
### Changed
* **Hood:** Extra debug information captured to the log file when the appliance sends an event for an invalid fan speed. Also made this non-fatal to prevent Homebridge from crashing. ([#2])
* The power `Switch` is now marked as being the appliance's primary service. ([#7])
* **CoffeeMaker/Dishwasher/Dryer/Oven/Washer/WasherDryer:** The program `Switch` services are now linked to the `Home Appliance` service and to each other. ([#7])
* **Hood:** The functional `Lightbulb` and ambient `Lightbulb` services are now linked to each other. ([#7])
* The active program is no longer queried when the appliance is not running a program. This reduces the number of requests that result in errors, making it less likely that the API rate limits will be exceeded and the client blocked. ([Rate Limits])
* Improved logging of errors to further assist with debugging.
### Removed
* `Stateless Programmable Switch` services no longer generate `Double Press` events. These were previously intended to indicate when an event had been confirmed by the user (`BSH.Common.EnumType.EventPresentState.Confirmed`) but neither the physical appliances nor the simulators generate this value. Only `Single Press` events are now triggered. ([HomeKit Mapping])
### Fixed
* **CoffeeMaker/Dishwasher/Dryer/Oven/Washer/WasherDryer:** Program options are handled better when writing them to the log file in response to `Identify`. In particular, any default values provided by the appliance are used (instead of using the minimum allowed or the first enum value), and the allowed values for `Boolean` types are also output. ([Programs] / [#1] / [#3])
* **Fridge/FridgeFreezer/Refrigerator:** The FridgeFreezer simulator uses the incorrect value for its door alarm events (`BSH.Common.EnumType.DoorState.Open` instead of `BSH.Common.EnumType.EventPresentState.Present`). These are now treated as synonymous.
* The `Status Active` characteristic is now only set to `false` under abnormal conditions (`Pause`, `ActionRequired`, `Error`, and `Aborting`). The previous behaviour of only setting it to `true` while running a program (`Run`) resulted in a misleading warning symbol and message within the Elgato Eve app when the appliance was working properly. Setting of the `Status` characteristic has also been tweaked. ([#6])

## [v0.9.1] - 2020-01-01
### Changed
* Moved most documentation from the `README.md` file to the project's [Wiki].

## [v0.9.0] - 2019-12-31
### Changed
* **Hood:** Setting a new fan speed is now implemented by changing the current program's options instead of starting a new program. This makes it less likely that the API rate limits will be exceeded and the client blocked. ([Rate Limits] / [#2])
* **Hood:** Appended `" fan"` to the name of the `Fan` service. This only affects newly created accessories.
### Fixed
* **Hood:** Changes to multiple `Fan` or `Lightbulb` characteristics (separately for functional and ambient lights) are merged and then the Home Connect requests issued in sequence. This avoids trying to set intermediate states, as well as overlapping requests to control the same feature, resulting in more reliable behaviour. ([#2])
* **CoffeeMaker/Dishwasher/Dryer/Washer/WasherDryer:** Program `Switch` services are now left writeable rather than attempting to make them read-only when remote start is not enabled. HomeKit is not designed to dynamically change the properties of characteristics in this way, so the previous behaviour did not propagate reliably. ([#1] / [#3])
* **Oven:** Added the error code `BSH.Common.Error.InvalidUIDValue` to the list of responses that are treated as cacheable. This undocumented error code is returned by the Thermador PRD486WDHU/01 Oven. ([#2])

## [v0.8.0] - 2019-12-30
### Added
* **CoffeeMaker/Dishwasher/Dryer/Oven/Washer/WasherDryer:** Added experimental support for starting and stopping programs (or monitoring their use on Oven appliances). By default a `Switch` is added for each program that the appliance supports. This can be customised via the `config.json` file to tailor the list of programs and their options. A template configuration is written to the Homebridge log file when the appliance's `Identify` routine is triggered. ([config.json] / [Programs] / [#1] / [#3])
* **CoffeeMaker:** Added `Stateless Programmable Switch` events for bean container empty, water tank empty, and drip tray full. ([Functionality])
* **Freezer/FridgeFreezer/Refrigerator:** Added `Stateless Programmable Switch` events for door open and temperature alarms. ([Functionality])
* The authorised Home Connect scopes are now remembered. This may be used in the future to enable additional functionality for Oven appliances if the `Oven-Control` scope is granted. ([Scopes])

## [v0.7.0] - 2019-12-29
### Changed
* **Hood:** The supported fan speeds are read from the appliance rather than being hardcoded. ([#2])
* **Hood:** Only attempt to stop a program when one is running. This reduces the number of requests that result in errors, making it less likely that the API rate limits will be exceeded and the client blocked. ([Rate Limits])

## [v0.6.0] - 2019-12-29
### Added
* **Hood:** Added support for controlling an ambient light, including selecting its colour (custom colours only). The appliance is now queried when the plugin is first started to determine whether it incorporates functional and/or ambient lights and their capabilities. The result is cached persistently. ([#2])
### Changed
* **CoffeeMaker/Dishwasher/Dryer/Oven/Washer/WasherDryer:** Improved how available programs are displayed in the log output in response to an `Identify` routine. A warning is now output if some programs are not currently available, and hence not listed in the log output. Spaces have been added to the characters allowed in the simplified program names.
* Code significantly restructured to be more maintainable.

## [v0.5.0] - 2019-12-28
### Added
* **Hood:** Added `Fan` and `Lightbulb` services for controlling the extractor fan and functional light in Hood appliances. This is a very quick prototype to obtain feedback on how Hood appliances behave. It uses a hardcoded configuration, assuming that the fan supports 5 venting levels and that there is a functional light with brightness control. ([#2])

## [v0.4.0] - 2019-12-28
### Added
* **Hood:** Added minimal support for Hood appliances (just program finished events, remaining program time, and operation state). No support for controlling the fan or light(s) yet. ([#2])
* **CoffeeMaker/Dishwasher/Dryer/Oven/Washer/WasherDryer:** When the HomeKit accessory's `Identify` method is used the programs supported by the appliance are queried and written to the log file. This may form the basis of starting and stopping programs in a future release.

## [v0.3.1] - 2019-12-25
### Changed
* Additional appliance state (the selected and active programs) is read when a connection to the appliance is first established, or reestablished after being disconnected. This state is logged, but not otherwise used by the plugin currently.

## [v0.3.0] - 2019-12-25
### Added
* **Freezer/Refrigerator/WasherDryer:** Added minimal support for these appliance types (just power, door status, program aborted/finished events, remaining program time, and operation state). ([Functionality])

## [v0.2.0] - 2019-12-25
### Added
* **CoffeeMaker/Dryer/FridgeFreezer/Washer:** Added minimal support for these appliance types (just power, door status, program aborted/finished events, remaining program time, and operation state). ([Functionality])
### Changed
* **Dishwasher/Oven:** `Remaining Duration` characteristic is now reset to 0 when a program finishes, even if the appliance does not generate a remaining time event. Also reduced its maximum value from 86,400 to 86,340.
* Suppress warnings in the log file for event stream lines that begin with a colon (such as ":ok" from the simulators). The Server-Sent Events (SSE) specification defines these as comments, but they are not described in the Home Connect documentation.

## [v0.1.0] - 2019-12-24
* Initial version.

---

Copyright © 2019-2022 Alexander Thoukydides

[Wiki]:             https://github.com/thoukydides/homebridge-homeconnect/wiki
[config.json]:      https://github.com/thoukydides/homebridge-homeconnect/wiki/config.json      "Wiki: config.json"
[Programs]:         https://github.com/thoukydides/homebridge-homeconnect/wiki/Programs         "Wiki: Customising Appliance Programs"
[HomeKit Apps]:     https://github.com/thoukydides/homebridge-homeconnect/wiki/HomeKit-Apps     "Wiki: HomeKit Apps"
[Functionality]:    https://github.com/thoukydides/homebridge-homeconnect/wiki/Functionality    "Wiki: Supported Home Connect Functionality"
[HomeKit Mapping]:  https://github.com/thoukydides/homebridge-homeconnect/wiki/HomeKit-Mapping  "Wiki: HomeKit Services and Characteristics"
[IFTTT]:            https://github.com/thoukydides/homebridge-homeconnect/wiki/IFTTT            "Wiki: If This Then That (IFTTT)"
[Scopes]:           https://github.com/thoukydides/homebridge-homeconnect/wiki/Scopes           "Wiki: Home Connect Authorisation Scopes"
[Rate Limits]:      https://github.com/thoukydides/homebridge-homeconnect/wiki/Rate-Limits      "Wiki: Rate Limits"
[Errors]:           https://github.com/thoukydides/homebridge-homeconnect/wiki/Errors           "Wiki: Error Messages"
[Files]:            https://github.com/thoukydides/homebridge-homeconnect/wiki/Errors           "Wiki: Files Storing Plugin State"
[Testing]:          https://github.com/thoukydides/homebridge-homeconnect/wiki/Testing          "Wiki: Tested Appliances"

[#1]:               https://github.com/thoukydides/homebridge-homeconnect/issues/1              "Issue #1"
[#2]:               https://github.com/thoukydides/homebridge-homeconnect/issues/2              "Issue #2"
[#3]:               https://github.com/thoukydides/homebridge-homeconnect/issues/3              "Issue #3"
[#4]:               https://github.com/thoukydides/homebridge-homeconnect/issues/4              "Issue #4"
[#5]:               https://github.com/thoukydides/homebridge-homeconnect/issues/5              "Issue #5"
[#6]:               https://github.com/thoukydides/homebridge-homeconnect/issues/6              "Issue #6"
[#7]:               https://github.com/thoukydides/homebridge-homeconnect/issues/7              "Issue #7"
[#8]:               https://github.com/thoukydides/homebridge-homeconnect/issues/8              "Issue #8"
[#9]:               https://github.com/thoukydides/homebridge-homeconnect/issues/9              "Issue #9"
[#10]:              https://github.com/thoukydides/homebridge-homeconnect/issues/10             "Issue #10"
[#11]:              https://github.com/thoukydides/homebridge-homeconnect/issues/11             "Issue #11"
[#12]:              https://github.com/thoukydides/homebridge-homeconnect/issues/12             "Issue #12"
[#13]:              https://github.com/thoukydides/homebridge-homeconnect/issues/13             "Issue #13"
[#14]:              https://github.com/thoukydides/homebridge-homeconnect/issues/14             "Issue #14"
[#15]:              https://github.com/thoukydides/homebridge-homeconnect/issues/15             "Issue #15"
[#16]:              https://github.com/thoukydides/homebridge-homeconnect/issues/16             "Issue #16"
[#17]:              https://github.com/thoukydides/homebridge-homeconnect/issues/17             "Issue #17"
[#18]:              https://github.com/thoukydides/homebridge-homeconnect/issues/18             "Issue #18"
[#19]:              https://github.com/thoukydides/homebridge-homeconnect/issues/19             "Issue #19"
[#20]:              https://github.com/thoukydides/homebridge-homeconnect/issues/20             "Issue #20"
[#21]:              https://github.com/thoukydides/homebridge-homeconnect/issues/21             "Issue #21"
[#22]:              https://github.com/thoukydides/homebridge-homeconnect/issues/22             "Issue #22"
[#23]:              https://github.com/thoukydides/homebridge-homeconnect/issues/23             "Issue #23"
[#24]:              https://github.com/thoukydides/homebridge-homeconnect/issues/24             "Issue #24"
[#25]:              https://github.com/thoukydides/homebridge-homeconnect/issues/25             "Issue #25"
[#26]:              https://github.com/thoukydides/homebridge-homeconnect/issues/26             "Issue #26"
[#27]:              https://github.com/thoukydides/homebridge-homeconnect/issues/27             "Issue #27"
[#28]:              https://github.com/thoukydides/homebridge-homeconnect/issues/28             "Issue #28"
[#29]:              https://github.com/thoukydides/homebridge-homeconnect/issues/29             "Issue #29"
[#30]:              https://github.com/thoukydides/homebridge-homeconnect/issues/30             "Issue #30"
[#31]:              https://github.com/thoukydides/homebridge-homeconnect/issues/31             "Issue #31"
[#32]:              https://github.com/thoukydides/homebridge-homeconnect/issues/32             "Issue #32"
[#33]:              https://github.com/thoukydides/homebridge-homeconnect/issues/33             "Issue #33"
[#34]:              https://github.com/thoukydides/homebridge-homeconnect/issues/34             "Issue #34"
[#35]:              https://github.com/thoukydides/homebridge-homeconnect/issues/35             "Issue #35"
[#36]:              https://github.com/thoukydides/homebridge-homeconnect/issues/36             "Issue #36"
[#37]:              https://github.com/thoukydides/homebridge-homeconnect/issues/37             "Issue #37"
[#38]:              https://github.com/thoukydides/homebridge-homeconnect/issues/38             "Issue #38"
[#39]:              https://github.com/thoukydides/homebridge-homeconnect/issues/39             "Issue #39"
[#40]:              https://github.com/thoukydides/homebridge-homeconnect/issues/40             "Issue #40"
[#41]:              https://github.com/thoukydides/homebridge-homeconnect/issues/41             "Issue #41"
[#42]:              https://github.com/thoukydides/homebridge-homeconnect/issues/42             "Issue #42"
[#43]:              https://github.com/thoukydides/homebridge-homeconnect/issues/43             "Issue #43"
[#44]:              https://github.com/thoukydides/homebridge-homeconnect/issues/44             "Issue #44"
[#45]:              https://github.com/thoukydides/homebridge-homeconnect/issues/45             "Issue #45"
[#46]:              https://github.com/thoukydides/homebridge-homeconnect/issues/46             "Issue #46"
[#47]:              https://github.com/thoukydides/homebridge-homeconnect/issues/47             "Issue #47"
[#48]:              https://github.com/thoukydides/homebridge-homeconnect/issues/48             "Issue #48"
[#49]:              https://github.com/thoukydides/homebridge-homeconnect/issues/49             "Issue #49"
[#50]:              https://github.com/thoukydides/homebridge-homeconnect/issues/50             "Issue #50"
[#51]:              https://github.com/thoukydides/homebridge-homeconnect/issues/51             "Issue #51"
[#52]:              https://github.com/thoukydides/homebridge-homeconnect/issues/52             "Issue #52"
[#53]:              https://github.com/thoukydides/homebridge-homeconnect/issues/53             "Issue #53"
[#54]:              https://github.com/thoukydides/homebridge-homeconnect/issues/54             "Issue #54"
[#55]:              https://github.com/thoukydides/homebridge-homeconnect/issues/55             "Issue #55"
[#56]:              https://github.com/thoukydides/homebridge-homeconnect/issues/56             "Issue #56"
[#57]:              https://github.com/thoukydides/homebridge-homeconnect/issues/57             "Issue #57"
[#58]:              https://github.com/thoukydides/homebridge-homeconnect/issues/58             "Issue #58"
[#59]:              https://github.com/thoukydides/homebridge-homeconnect/issues/59             "Issue #59"
[#60]:              https://github.com/thoukydides/homebridge-homeconnect/issues/60             "Issue #60"
[#61]:              https://github.com/thoukydides/homebridge-homeconnect/issues/61             "Issue #61"
[#62]:              https://github.com/thoukydides/homebridge-homeconnect/issues/62             "Issue #62"
[#63]:              https://github.com/thoukydides/homebridge-homeconnect/issues/63             "Issue #63"
[#64]:              https://github.com/thoukydides/homebridge-homeconnect/issues/64             "Issue #64"
[#65]:              https://github.com/thoukydides/homebridge-homeconnect/issues/65             "Issue #65"
[#66]:              https://github.com/thoukydides/homebridge-homeconnect/issues/66             "Issue #66"
[#67]:              https://github.com/thoukydides/homebridge-homeconnect/issues/67             "Issue #67"
[#68]:              https://github.com/thoukydides/homebridge-homeconnect/issues/68             "Issue #68"
[#69]:              https://github.com/thoukydides/homebridge-homeconnect/pull/69               "Pull #69"
[#70]:              https://github.com/thoukydides/homebridge-homeconnect/issues/70             "Issue #70"
[#71]:              https://github.com/thoukydides/homebridge-homeconnect/issues/71             "Issue #71"
[#72]:              https://github.com/thoukydides/homebridge-homeconnect/issues/72             "Issue #72"
[#73]:              https://github.com/thoukydides/homebridge-homeconnect/issues/73             "Issue #73"
[#74]:              https://github.com/thoukydides/homebridge-homeconnect/issues/74             "Issue #74"
[#75]:              https://github.com/thoukydides/homebridge-homeconnect/issues/75             "Issue #75"
[#76]:              https://github.com/thoukydides/homebridge-homeconnect/issues/76             "Issue #76"
[#77]:              https://github.com/thoukydides/homebridge-homeconnect/issues/77             "Issue #77"
[#78]:              https://github.com/thoukydides/homebridge-homeconnect/issues/78             "Issue #78"
[#79]:              https://github.com/thoukydides/homebridge-homeconnect/issues/79             "Issue #79"
[#80]:              https://github.com/thoukydides/homebridge-homeconnect/issues/80             "Issue #80"
[#81]:              https://github.com/thoukydides/homebridge-homeconnect/issues/81             "Issue #81"
[#82]:              https://github.com/thoukydides/homebridge-homeconnect/issues/82             "Issue #82"
[#83]:              https://github.com/thoukydides/homebridge-homeconnect/issues/83             "Issue #83"
[#84]:              https://github.com/thoukydides/homebridge-homeconnect/issues/84             "Issue #84"
[#85]:              https://github.com/thoukydides/homebridge-homeconnect/issues/85             "Issue #85"
[#86]:              https://github.com/thoukydides/homebridge-homeconnect/issues/86             "Issue #86"
[#87]:              https://github.com/thoukydides/homebridge-homeconnect/pull/87               "Pull #87"
[#88]:              https://github.com/thoukydides/homebridge-homeconnect/pull/88               "Pull #88"
[#89]:              https://github.com/thoukydides/homebridge-homeconnect/issues/89             "Issue #88"
[#90]:              https://github.com/thoukydides/homebridge-homeconnect/pull/90               "Pull #90"
[#91]:              https://github.com/thoukydides/homebridge-homeconnect/issues/91             "Issue #91"
[#92]:              https://github.com/thoukydides/homebridge-homeconnect/discussions/92        "Discussion #92"
[#93]:              https://github.com/thoukydides/homebridge-homeconnect/issues/93             "Issue #93"
[#94]:              https://github.com/thoukydides/homebridge-homeconnect/issues/94             "Issue #94"
[#95]:              https://github.com/thoukydides/homebridge-homeconnect/issues/95             "Issue #95"
[#96]:              https://github.com/thoukydides/homebridge-homeconnect/discussions/96        "Discussion #96"
[#97]:              https://github.com/thoukydides/homebridge-homeconnect/issues/97             "Issue #97"
[#98]:              https://github.com/thoukydides/homebridge-homeconnect/pull/98               "Pull #98"
[#99]:              https://github.com/thoukydides/homebridge-homeconnect/issues/99             "Issue #99"
[#100]:             https://github.com/thoukydides/homebridge-homeconnect/pull/100              "Pull #100"
[#101]:             https://github.com/thoukydides/homebridge-homeconnect/issues/101            "Issue #101"
[#102]:             https://github.com/thoukydides/homebridge-homeconnect/discussions/102       "Discussion #102"
[#103]:             https://github.com/thoukydides/homebridge-homeconnect/issues/103            "Issue #103"
[#104]:             https://github.com/thoukydides/homebridge-homeconnect/discussions/104       "Discussion #104"
[#105]:             https://github.com/thoukydides/homebridge-homeconnect/issues/105            "Issue #105"
[#106]:             https://github.com/thoukydides/homebridge-homeconnect/discussions/106       "Discussion #106"
[#107]:             https://github.com/thoukydides/homebridge-homeconnect/issues/107            "Issue #107"

[Unreleased]:       https://github.com/thoukydides/homebridge-homeconnect/compare/v0.26.1...HEAD
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
