# homebridge-homeconnect

[![NPM](https://nodei.co/npm/homebridge-homeconnect.png)](https://nodei.co/npm/homebridge-homeconnect/)

Home Connect home appliances plugin for [Homebridge](https://github.com/nfarina/homebridge).

[Home Connect](https://www.home-connect.com), [Bosch](https://www.bosch-home.com/), [Siemens](https://www.siemens-home.bsh-group.com/), [Gaggenau](https://www.gaggenau.com/), [NEFF](https://www.neff-home.com/), and [Thermador](https://www.thermador.com/) are trademarks of [BSH Home Appliances](https://www.bsh-group.com).

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
1. The Homebridge log output will include an authorisation URL. Copy the listed URL into a web browser and login to your Home Connect account.
 
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

For more advanced options refer to [Customising Appliance Programs](https://github.com/thoukydides/homebridge-homeconnect/wiki/Programs) and [`config.json`](https://github.com/thoukydides/homebridge-homeconnect/wiki/config.json).

## Appliance Support

The functionality supported by this plugin with different appliances types is described in:
* [Supported Home Connect Functionality](https://github.com/thoukydides/homebridge-homeconnect/wiki/Functionality)
* [HomeKit Services and Characteristics](https://github.com/thoukydides/homebridge-homeconnect/wiki/HomeKit-Mapping)

Support for Hood appliances is currently experimental. Please provide feedback (whether good or bad) to [issue #2](https://github.com/thoukydides/homebridge-homeconnect/issues/2).

Oven appliances cannot be controlled due to the required [Home Connect Authorisation Scopes](https://github.com/thoukydides/homebridge-homeconnect/wiki/Scopes) not being granted.

This plugin has only been tested with a Siemens [Dishwasher](https://www.siemens-home.bsh-group.com/uk/mysiemens/products/0004436388) (SN678D06TG/53), [Hob](https://www.siemens-home.bsh-group.com/uk/mysiemens/products/0004436379) (EX677LYV1E/06), and [Oven](https://www.siemens-home.bsh-group.com/uk/mysiemens/products/0004401572) (HB678GBS6B/58). See [Tested Appliances](https://github.com/thoukydides/homebridge-homeconnect/wiki/Testing).

## HomeKit Apps

Apple's Home app does not support all of the features of this plugin. Use one of the alternative [Recommended HomeKit Apps](https://github.com/thoukydides/homebridge-homeconnect/wiki/HomeKit-Apps) instead.

## License

> ISC License (ISC)<br>Copyright © 2019-2020 Alexander Thoukydides
>
> Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.
>
> THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
