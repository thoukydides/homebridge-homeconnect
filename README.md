<p align="center">
  <a href="https://github.com/homebridge/homebridge/wiki/Verified-Plugins"><img src="https://raw.githubusercontent.com/wiki/thoukydides/homebridge-homeconnect/homebridge-homeconnect.png" height="200"></a>
</p>
<span align=center>

# homebridge-homeconnect

[![npm](https://badgen.net/npm/v/homebridge-homeconnect)](https://www.npmjs.com/package/homebridge-homeconnect)
[![npm](https://badgen.net/npm/dt/homebridge-homeconnect)](https://www.npmjs.com/package/homebridge-homeconnect)
[![npm](https://badgen.net/npm/dw/homebridge-homeconnect)](https://www.npmjs.com/package/homebridge-homeconnect)
[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)

Home Connect home appliances plugin for [Homebridge](https://github.com/nfarina/homebridge).

</span>

[Home Connect](https://www.home-connect.com), [Balay](https://www.balay.es/), [Bosch](https://www.bosch-home.com/), [Constructa](https://www.constructa.com/), [Gaggenau](https://www.gaggenau.com/), [NEFF](https://www.neff-home.com/), [Pitsos](https://www.pitsos.gr/), [Profilo](https://www.profilo.com/), [Siemens](https://www.siemens-home.bsh-group.com/), and [Thermador](https://www.thermador.com/) are trademarks of [BSH Home Appliances](https://www.bsh-group.com).

## Installation

1. Connect your home appliances with Home Connect:
   1. Install Home Connect from the Apple App Store for your country (e.g. [UK](https://itunes.apple.com/gb/app/home-connect-app/id901397789) or [USA](https://itunes.apple.com/us/app/home-connect-america/id1134525430)).
   1. Create an account using your email address, click on the validation link in the email that will be received, and then return to the app and login.
   1. Connect the appliances to your home network, either via the app or using Wi-Fi Protected Setup (WPS).
   1. Connect the appliances to the app (by following the installation guide provided with the appliance).
1. Obtain a Home Connect application *Client ID*:
   1. Sign-up for a free [Home Connect Developer Program](https://developer.home-connect.com/user/register) account and login.
   1. [Register a new application](https://developer.home-connect.com/applications/add), ensuring that the *OAuth Flow* is set to *Device Flow*, and the *Home Connect User Account* is the same as the email address that was used within the Home Connect app.
   1. Save the displayed *Client ID* to include in the Homebridge `config.json` file.
1. Install this plugin using: `npm install -g homebridge-homeconnect`
1. Edit `config.json` and add the HomeConnect platform (see example below).
1. Run [Homebridge](https://github.com/nfarina/homebridge).
1. The Homebridge log output will include an authorisation URL. Copy the listed URL into a web browser and login to your Home Connect account. (The authorisation URL can also be found in the [homebridge-config-ui-x](https://github.com/oznu/homebridge-config-ui-x) graphical settings editor.)
 
### Example `config.json`
```JSON
{
    "platforms":
    [{
        "platform":     "HomeConnect",
        "clientid":     "0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF"
    }]
}
```
The `clientid` should be set to the *Client ID* obtained from the [Home Connect Developer Program](https://developer.home-connect.com/applications) for the created *Device Flow* application.

Additional configuration is recommended to [customise the appliance programs](https://github.com/thoukydides/homebridge-homeconnect/wiki/Programs). The easiest way to do this is via the [homebridge-config-ui-x](https://github.com/oznu/homebridge-config-ui-x) (version 4.8.1 or later) graphical settings editor. This plugin dynamically updates its configuration schema with the appropriate options for the connected appliances.

See [`config.json`](https://github.com/thoukydides/homebridge-homeconnect/wiki/config.json) for a description of all supported configuration options.

## Appliance Support

This plugin supports most capabilities of the [Home Connect API](https://developer.home-connect.com/) that can be sensibly mapped to Apple-defined [HomeKit services and characteristics](https://github.com/thoukydides/homebridge-homeconnect/wiki/Functionality). More details can be found in the [functionality summary](https://github.com/thoukydides/homebridge-homeconnect/wiki/Functionality).

Apple's Home app does not support all of the features of this plugin. Some [third-party HomeKit apps](https://github.com/thoukydides/homebridge-homeconnect/wiki/HomeKit-Apps) are recommended due to their extra functionality.

### Cooking Appliances

  * **CoffeeMaker:**
    * Switch on/off, start/stop programs with preset options, and turn cup warmer on/off.
    * Control child lock.
    * Monitor door, program time remaining, remote control, and general operation status.
    * Automation triggers for bean container empty, water tank empty, and drip tray full.
  * **CookProcessor:**
    * Switch on/off.
    * Monitor program time remaining and general operation status.
    * Automation triggers for finished and aborted.
    * *(The [Home Connect API](https://developer.home-connect.com/docs/cook-processor/supported_programs_and_options) documentation states that* "Program support is planned to be released in 2022"*.)*
  * **Hob:**
    * Control alarm clock and child lock.
    * Monitor power, remote control, and general operation status.
    * Automation triggers for finished, alarm clock finished, and preheat finished.
    * *(The [Home Connect API](https://developer.home-connect.com/docs/cooktop/supported_programs_and_options) documentation states that* "Program support is planned to be released in 2022"*.)*
  * **Hood:**
    * Switch on/off.
    * Switch fan on/off, set fan speed/intensive levels, and select manual/auto mode.
    * Switch functional light on/off, change brightness, and select colour temperature.
    * Switch ambient light on/off, change brighness, and select colour.
    * Monitor remote control and general operation status.
    * Automation triggers for finished, grease filter nearly saturated, and grease filter saturated.
  * **Oven:**
    * Switch on/off and start/stop programs with preset options.
    * Open or partly open the door.
    * Set sabbath mode.
    * Control alarm clock and child lock.
    * Monitor door, programs, program time remaining, remote control, and general operation status.
    * Automation triggers for finished, aborted, alarm clock finished, fast preheat finished, and regular preheat finished,
  * **WarmingDrawer:**
    * Switch on/off and start/stop programs with preset options.
    * Control child lock.
    * Monitor remote control and general operation status.

### Cleaning Appliances

  * **CleaningRobot:**
    * Switch on/off and start/stop programs with preset options.
    * Monitor battery level, battery charging, dock, and general operation status.
    * Automation triggers for finished, aborted, dust box full, stuck, and lost.
  * **Dishwasher:**
    * Switch on/off and start/stop programs with preset options.
    * Switch ambient light on/off, change brighness, and select colour.
    * Control child lock.
    * Monitor door, program time remaining, remote control, and general operation status.
    * Automation triggers for finished and aborted.
  * **Dryer:**
    * Start/stop programs with preset options.
    * Control child lock.
    * Monitor power, door, program time remaining, remote control, and general operation status.
    * Automation triggers for finished and aborted.
  * **Washer / WasherDryer:**
    * Start/stop programs with preset options.
    * Control child lock.
    * Monitor power, door, program time remaining, remote control, and general operation status.
    * Automation triggers for finished, aborted, i-Dos 1 fill level low, and i-Dos 2 fill level low.
    
### Cooling Appliances

  * **Freezer / FridgeFreezer / Refrigerator:**
    * Set freezer/refrigerator super, eco, sabbath, refrigerator vacation, and refrigerator fresh modes.
    * Open the door.
    * Control child lock.
    * Monitor power and door.
    * Automation triggers for freezer/refrigerator door and freezer temperature alarms.
  * **WineCooler:**
    * Set sabbath mode.
    * Control child lock.
    * Monitor power and door.

## Changelog

All notable changes to this project are documented in the [CHANGELOG.md](CHANGELOG.md) file.

**Version 0.20.0 of this plugin requests authorisation of additional Home Connect API scopes to allow control of Oven appliance programs. When upgrading from version 0.19.2 or earlier force a re-authorisation by deleting the `~/.homebridge/homebridge-homeconnect/persist/94a08da1fecbb6e8b46990538c7b50b2` file while Homebridge is stopped.**

## Reporting Issues

Report any issues on [GitHub](https://github.com/thoukydides/homebridge-homeconnect/issues/new/choose).

Before raising an issue please check whether it relates to an expected [error message](https://github.com/thoukydides/homebridge-homeconnect/wiki/Errors) and whether any similar [issues already exist](https://github.com/thoukydides/homebridge-homeconnect/issues?utf8=%E2%9C%93&q=). If the issue relates to a problem connecting to the Home Connect servers or with controlling an appliance then please also:

  * Using the official Home Connect app:
    * Confirm that the appliance can be properly controlled as expected.
    * Open the appliance Settings, scroll to the Network section, and verify that all three lines (for the links between the appliance, cloud, and phone) and green.
  * Check the status of the Home Connect servers using:
    * The official [Home Connect System Status](https://www.home-connect.com/global/help-support/system-status) page.
    * The unofficial [Home Connect Server Status](https://homeconnect.thouky.co.uk) page.

Please attach the relevant section of the Homebridge log file, either pasted into the issue or attached as a text file (*not a screenshot*). Extra debug should be enabled and captured if appropriate:

  * **Homebridge debug logging:** Start Homebridge with the `-D` option to capture the *debug* level messages. These are used by this plugin to log basic information about each request to the Home Connect servers (but not the actual contents of the requests or responses) and other internal state. Please enable this for any issues that involve problems connecting to the Home Connect servers, API errors, or other problems with appliance state or control.
  * **HomeKit Accessory Protocol (HAP) logging:** Setting the `DEBUG=*` environment variable before starting Homebridge results in verbose logging of all [HAP-NodeJS](https://github.com/KhaosT/HAP-NodeJS) HomeKit exchanges. Please enable this for any issues that involve problems controlling appliances from HomeKit or Siri.

## License

> ISC License (ISC)<br>Copyright © 2019-2022 Alexander Thoukydides
>
> Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.
>
> THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
