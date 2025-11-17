<p align="center">
  <a href="https://github.com/homebridge/homebridge/wiki/Verified-Plugins"><img src="https://raw.githubusercontent.com/wiki/thoukydides/homebridge-homeconnect/homebridge-homeconnect.png" style="height: 200px; max-width: 100%;"></a>
</p>
<div align=center>

# homebridge-homeconnect

[![npm](https://img.shields.io/npm/v/homebridge-homeconnect?label=Latest)](https://www.npmjs.com/package/homebridge-homeconnect)
[![npm](https://img.shields.io/npm/dt/homebridge-homeconnect?logo=npm&label=Downloads)](https://www.npmjs.com/package/homebridge-homeconnect)
[![npm](https://img.shields.io/npm/dw/homebridge-homeconnect?label=)](https://www.npmjs.com/package/homebridge-homeconnect)
[![Build and Lint](https://github.com/thoukydides/homebridge-homeconnect/actions/workflows/build.yml/badge.svg)](https://github.com/thoukydides/homebridge-homeconnect/actions/workflows/build.yml)
[![Test](https://github.com/thoukydides/homebridge-homeconnect/actions/workflows/test.yml/badge.svg)](https://github.com/thoukydides/homebridge-homeconnect/actions/workflows/test.yml)
[![verified-by-homebridge](https://img.shields.io/badge/homebridge-verified-purple?color=%23491F59&logoColor=%23FFFFFF&logo=homebridge)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)

A [Homebridge](https://github.com/homebridge/homebridge) plugin that connects [Home Connect](https://www.home-connect.com) appliances to [Apple HomeKit](https://www.apple.com/home-app/).

</div>

## Installation

### Step 1 - Setup Home Connect Appliances

1. Connect your home appliances with Home Connect:
   1. Install Home Connect from the Apple App Store for your country (e.g. [UK](https://itunes.apple.com/gb/app/home-connect-app/id901397789) or [USA](https://itunes.apple.com/us/app/home-connect-america/id1134525430)).
   1. Create an account using your email address, click on the validation link in the email that will be received, and then return to the app and login.
   1. Connect the appliances to your home network, either via the app or using Wi-Fi Protected Setup (WPS).
   1. Connect the appliances to the app (by following the installation guide provided with the appliance).
1. If you are using a legacy Home Connect account then also create a [SingleKey ID](https://singlekey-id.com/en/sign-up/) using the same email address, ensuring that it is all in lowercase. Verify that the SingleKey ID works in the Home Connect app.

### Step 2 - Obtain a Home Connect Client ID

1. Sign-up for a free [Home Connect Developer Program](https://developer.home-connect.com/user/register) account and login.
1. [Register a new application](https://developer.home-connect.com/applications/add), ensuring that
   * *OAuth Flow* is set to **Device Flow**
   * *Home Connect User Account for Testing* is the same as the **SingleKey ID email address**
   * *Redirect URI* is **left blank**
   * *Enable One Time Token Mode* is **not ticked**
   * *Sync to China* is **ticked** if you are located within China, otherwise leave it **not ticked**
1. If the application is subsequently edited then additionally ensure that:
   * *Forces the usage of PKCE* is **not ticked**
   * *Status* is **Enabled**
   * *Client Secret Always Required* is **No**
1. Copy and save the displayed *Client ID*; it will be required to configure this plugin.
1. Wait 15 minutes for changes to the application to be deployed to the Home Connect authorisation servers.

### Step 3 - Homebridge Plugin Installation

#### Recommended approach using Homebridge UI

1. On the [Homebridge UI](https://github.com/homebridge/homebridge-config-ui-x) Plugins page search for and install the **HomeConnect** plugin.
1. Open the **HomeConnect** plugin settings and set the *Client ID* to the value obtained from the [Home Connect Developer Program](https://developer.home-connect.com/applications) for the created *Device Flow* application.
1. If you are located within China then set the *Server Location* to **China**, otherwise leave it as **Worldwide**.
1. Click on the *AUTHORISE* button to open a new Home Connect browser window. Login to your Home Connect account and approve access.
1. Save the plugin settings and restart Homebridge.

<details>
<summary>Alternative method using command line</summary>

#### Installation using Command Line

1. Install this plugin using: `npm install -g homebridge-homeconnect`
1. Edit `config.json` and add the HomeConnect platform (see example below).
1. Run (or restart) [Homebridge](https://github.com/homebridge/homebridge).
1. The Homebridge log output will include an authorisation URL. Copy the listed URL into a web browser, login to your Home Connect account, and approve access.

#### Example `config.json`
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
</details>

Additional configuration is recommended to [customise the appliance programs](https://github.com/thoukydides/homebridge-homeconnect/wiki/Programs), and to select optional features. The easiest way to configure this plugin is via the [Homebridge UI](https://github.com/homebridge/homebridge-config-ui-x) configuration editor. This plugin implements a [custom user interface](https://developers.homebridge.io/#/custom-plugin-ui) that dynamically updates with the appropriate options for the connected appliances. Manual configuration via the [`config.json`](https://github.com/thoukydides/homebridge-homeconnect/wiki/config.json) file is possible, but not recommended.

## Appliance Support

This plugin supports most capabilities of the [Home Connect API](https://developer.home-connect.com/) that can be sensibly mapped to Apple-defined [HomeKit services and characteristics](https://github.com/thoukydides/homebridge-homeconnect/wiki/Functionality). More details can be found in the [functionality summary](https://github.com/thoukydides/homebridge-homeconnect/wiki/Functionality).

Apple's Home app does not support all of the features of this plugin. Some [third-party HomeKit apps](https://github.com/thoukydides/homebridge-homeconnect/wiki/HomeKit-Apps) are recommended due to their extra functionality.

<details>
<summary>Cooking Appliances</summary>

  * **CoffeeMaker:**
    <img align="right" width="100px" height="100px" src="https://raw.githubusercontent.com/thoukydides/homebridge-homeconnect/refs/heads/master/src/homebridge-ui/public/images/icon-coffeemaker.svg">
    * Switch on/off, start/stop programs with preset options, and turn cup warmer on/off.
    * Control child lock.
    * Monitor door, program time remaining, remote control, and general operation status.
    * Automation triggers for bean container empty, water tank empty, drip tray full, milk requires cooling, and for when cleaning/descaling is needed.

  * **CookProcessor:**
    <img align="right" width="100px" height="100px" src="https://raw.githubusercontent.com/thoukydides/homebridge-homeconnect/refs/heads/master/src/homebridge-ui/public/images/icon-cookprocessor.svg">
    * Switch on/off.
    * Monitor program time remaining and general operation status.
    * Automation triggers for finished and aborted.

  * **Hob:**
    <img align="right" width="100px" height="100px" src="https://raw.githubusercontent.com/thoukydides/homebridge-homeconnect/refs/heads/master/src/homebridge-ui/public/images/icon-hob.svg">
    * Control alarm clock and child lock.
    * Monitor power, remote control, and general operation status.
    * Automation triggers for finished, alarm clock finished, and preheat finished.

  * **Hood:**
    <img align="right" width="100px" height="100px" src="https://raw.githubusercontent.com/thoukydides/homebridge-homeconnect/refs/heads/master/src/homebridge-ui/public/images/icon-hood.svg">
    * Switch on/off.
    * Switch fan on/off, set fan speed/intensive levels, select boost mode, and select manual/auto mode.
    * Switch functional light on/off, change brightness, and select colour temperature.
    * Switch ambient light on/off, change brightness, and select colour.
    * Monitor remote control and general operation status.
    * Automation triggers for finished, grease filter nearly saturated, and grease filter saturated.

  * **Microwave:**
    <img align="right" width="100px" height="100px" src="https://raw.githubusercontent.com/thoukydides/homebridge-homeconnect/refs/heads/master/src/homebridge-ui/public/images/icon-microwave.svg">
    * Switch on/off and start/stop programs with preset options.
    * Open or partly open the door.
    * Control child lock.
    * Monitor door, programs, program time remaining, remote control, and general operation status.
    * Automation triggers for finished, and aborted.

  * **Oven:**
    <img align="right" width="100px" height="100px" src="https://raw.githubusercontent.com/thoukydides/homebridge-homeconnect/refs/heads/master/src/homebridge-ui/public/images/icon-oven.svg">
    * Switch on/off and start/stop programs with preset options.
    * Open or partly open the door.
    * Set sabbath mode.
    * Control alarm clock and child lock.
    * Monitor door, programs, program time remaining, remote control, and general operation status.
    * Automation triggers for finished, aborted, alarm clock finished, fast preheat finished, and regular preheat finished.

  * **WarmingDrawer:**
    <img align="right" width="100px" height="100px" src="https://raw.githubusercontent.com/thoukydides/homebridge-homeconnect/refs/heads/master/src/homebridge-ui/public/images/icon-warmingdrawer.svg">
    * Switch on/off and start/stop programs with preset options.
    * Control child lock.
    * Monitor remote control and general operation status.

</details>
<details>
<summary>Cleaning Appliances</summary>

  * **CleaningRobot:**
    <img align="right" width="100px" height="100px" src="https://raw.githubusercontent.com/thoukydides/homebridge-homeconnect/refs/heads/master/src/homebridge-ui/public/images/icon-cleaningrobot.svg">
    * Switch on/off and start/stop programs with preset options.
    * Monitor battery level, battery charging, dock, and general operation status.
    * Automation triggers for finished, aborted, dust box full, stuck, and lost.

  * **Dishwasher:**
    <img align="right" width="100px" height="100px" src="https://raw.githubusercontent.com/thoukydides/homebridge-homeconnect/refs/heads/master/src/homebridge-ui/public/images/icon-dishwasher.svg">
    * Switch on/off and start/stop programs with preset options.
    * Switch ambient light on/off, change brightness, and select colour.
    * Control child lock.
    * Monitor door, program time remaining, remote control, and general operation status.
    * Automation triggers for finished, aborted, salt supply low, and rinse aid supply low.

  * **Dryer:**
    <img align="right" width="100px" height="100px" src="https://raw.githubusercontent.com/thoukydides/homebridge-homeconnect/refs/heads/master/src/homebridge-ui/public/images/icon-dryer.svg">
    * Start/stop programs with preset options.
    * Control child lock.
    * Monitor power, door, program time remaining, remote control, and general operation status.
    * Automation triggers for finished, aborted, and drying finished.

  * **Washer:**
    <img align="right" width="100px" height="100px" src="https://raw.githubusercontent.com/thoukydides/homebridge-homeconnect/refs/heads/master/src/homebridge-ui/public/images/icon-washer.svg">
    * Start/stop programs with preset options.
    * Control child lock.
    * Monitor power, door, program time remaining, remote control, and general operation status.
    * Automation triggers for finished, aborted, i-Dos 1 fill level low, and i-Dos 2 fill level low.

  * **WasherDryer:**
    <img align="right" width="100px" height="100px" src="https://raw.githubusercontent.com/thoukydides/homebridge-homeconnect/refs/heads/master/src/homebridge-ui/public/images/icon-washerdryer.svg">
    * Start/stop programs with preset options.
    * Control child lock.
    * Monitor power, door, program time remaining, remote control, and general operation status.
    * Automation triggers for finished, aborted, i-Dos 1 fill level low, i-Dos 2 fill level low, and drying finished.

</details>
<details>
<summary>Cooling Appliances</summary>

  * **AirConditioner:**
    <img align="right" width="100px" height="100px" src="https://raw.githubusercontent.com/thoukydides/homebridge-homeconnect/refs/heads/master/src/homebridge-ui/public/images/icon-airconditioner.svg">
    * Switch on/off.
    * Switch fan on/off, set fan speed, and select manual/auto mode.

  * **Freezer / FridgeFreezer / Refrigerator:**
    <img align="right" height="100px" src="https://raw.githubusercontent.com/thoukydides/homebridge-homeconnect/refs/heads/master/src/homebridge-ui/public/images/icon-refrigerator.svg">
    <img align="right" height="100px" src="https://raw.githubusercontent.com/thoukydides/homebridge-homeconnect/refs/heads/master/src/homebridge-ui/public/images/icon-fridgefreezer.svg">
    <img align="right" height="100px" src="https://raw.githubusercontent.com/thoukydides/homebridge-homeconnect/refs/heads/master/src/homebridge-ui/public/images/icon-freezer.svg">
    * Set freezer/refrigerator super, eco, sabbath, refrigerator vacation, refrigerator fresh, and ice dispenser modes.
    * Switch interior/exterior light on/off and change brightness.
    * Open the door.
    * Control child lock.
    * Monitor power and door.
    * Automation triggers for freezer/refrigerator door and freezer temperature alarms.

  * **WineCooler:**
    <img align="right" width="100px" height="100px" src="https://raw.githubusercontent.com/thoukydides/homebridge-homeconnect/refs/heads/master/src/homebridge-ui/public/images/icon-winecooler.svg">
    * Set sabbath mode.
    * Control child lock.
    * Monitor power and door.

</details>

## Changelog

All notable changes to this project are documented in [`CHANGELOG.md`](CHANGELOG.md).

## Reporting Issues
          
If you have discovered an issue or have an idea for how to improve this project, please [open a new issue](https://github.com/thoukydides/homebridge-homeconnect/issues/new/choose) using the appropriate issue template or start a [discussion](https://github.com/thoukydides/homebridge-homeconnect/discussions).

### Pull Requests

As explained in [`CONTRIBUTING.md`](https://github.com/thoukydides/.github/blob/master/CONTRIBUTING.md), this project does **NOT** accept pull requests. Any PRs submitted will be closed without discussion.

## Legal

[Home Connect](https://www.home-connect.com), [Balay](https://www.balay.es/), [Bosch](https://www.bosch-home.com/), [Constructa](https://www.constructa.com/), [Gaggenau](https://www.gaggenau.com/), [NEFF](https://www.neff-home.com/), [Pitsos](https://www.pitsos.gr/), [Profilo](https://www.profilo.com/), [Siemens](https://www.siemens-home.bsh-group.com/), and [Thermador](https://www.thermador.com/), are trademarks of [BSH Home Appliances](https://www.bsh-group.com).

### ISC License (ISC)

<details>
<summary>Copyright © 2019-2025 Alexander Thoukydides</summary>

> Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.
>
> THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
</details>