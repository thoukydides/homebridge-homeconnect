# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

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

Copyright © 2019-2020 Alexander Thoukydides

[Wiki]:             https://github.com/thoukydides/homebridge-homeconnect/wiki
[config.json]:      https://github.com/thoukydides/homebridge-homeconnect/wiki/config.json      "Wiki: config.json"
[Programs]:         https://github.com/thoukydides/homebridge-homeconnect/wiki/Programs         "Wiki: Customising Appliance Programs"
[HomeKit Apps]:     https://github.com/thoukydides/homebridge-homeconnect/wiki/HomeKit-Apps     "Wiki: HomeKit Apps"
[Functionality]:    https://github.com/thoukydides/homebridge-homeconnect/wiki/Functionality    "Wiki: Supported Home Connect Functionality"
[HomeKit Mapping]:  https://github.com/thoukydides/homebridge-homeconnect/wiki/HomeKit-Mapping  "Wiki: HomeKit Services and Characteristics"
[IFTTT]:            https://github.com/thoukydides/homebridge-homeconnect/wiki/IFTTT            "Wiki: If This Then That (IFTTT)"
[Scopes]:           https://github.com/thoukydides/homebridge-homeconnect/wiki/Scopes           "Wiki: Home Connect Authorisation Scopes"
[Rate Limits]:      https://github.com/thoukydides/homebridge-homeconnect/wiki/Rate-Limits      "Wiki: Rate Limits"
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

[Unreleased]:       https://github.com/thoukydides/homebridge-homeconnect/compare/v0.13.0...HEAD
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
