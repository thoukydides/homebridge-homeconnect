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
1. The Homebridge log output will include an authorization URL. Copy the listed URL into a web browser and login to your Home Connect account.
 
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

To use [simulated appliances](https://developer.home-connect.com/simulator/) set `clientid` to the  *Client ID* for the automatically provided API Web Client and set `"simulator": true`.

### Controlling Programs

This plugin can start and stop programs on CoffeeMaker, Dishwasher, Dryer, Washer, and WasherDryer appliances. It is also capable of monitoring (but not controlling; [see below](#no-control-of-ovens-hobs-or-fridge-freezers)) the active program on Oven appliances.

By default this plugin creates a `Switch` for each program that the appliance supports:
* Turning a switch on attempts to start the corresponding program with its default options. Most appliances need to be powered on without any active program for this to work.
* Turning a switch off stops the program.

However, it is possible to use the `config.json` file to select which programs should be presented (including none), and to provide options (e.g. for a CoffeeMaker it is possible to specify the temperature, strength, and amount of water).

#### Customising Programs

The easiest way to customise the list of programs for an appliance is to use HomeKit's **Identify** mechanism, which triggers this plugin to read details of available programs from the appliance and write a template configuration to the Homebridge log file. This can then be edited as required before being pasted into the `config.json` file.

Unfortunately, Apple's Home app in iOS 13 does not appear to provide an **Identify** feature, so use a third-party HomeKit app instead:
* Matthias Hochgatterer's [Home+](http://hochgatterer.me/home/) *(recommended)*
* Elgato's [Eve](https://www.elgato.com/en/eve/eve-app) *(free)*

The format of the `config.json` file is:

```JSON
    "platforms":
    [{
        "platform":     "HomeConnect",
        "clientid":     <Client ID>,
        <Home Appliance ID #1>: {
            "programs": [{
                "name": <Program name #1>,
                "key":  <Program key #1>,
                "options": {
                    <Option key #1>: <Option value #1>,
                    <Option key #2>: <Option value #2>,
                    ...
                    <Option key #n>: <Option value #n>
                }
            },{
                "name": <Program name #2>,
                "key":  <Program key #2>,
                "options": {
                    ...
                }
            },{
                ...
            },{
                "name": <Program name #n>,
                "key":  <Program key #n>,
                "options": {
                    ...
                }
            }]
        },
        <Home Appliance ID #2>: {
            "programs": [
                ....
            ]
        },
        ....
        <Home Appliance ID #n>: {
            "programs": [
                ....
            ]
        },
    }]
}
```
The *Home Appliance ID* is a string used by the Home Connect API to uniquely identify each appliance. It is comprised of the manufacturer's name, the appliance model number (E-Nr), and a twelve-digit hexadecimal number, each separated by hyphens (e.g. `BOSCH-HCS06COM1-846D1E984F70`). This value can be found from the **Identify** log output (or from almost any part of this plugin's log when debug is enabled by starting Homebridge with the `-D` option).

Each appliance to be customised should have an object with a single `program` key. Its value should be an array of objects, each describing a single program. The `program` array can be empty to prevent `Switch` services being added for any programs.

Each program object must include a `name` that is used to identify the HomeKit `Switch`. This should be a short human-readable description of the program. It must be unique (within the programs for that appliance), and should not contain any special characters.

Each program object must also include a `key`. This is the identifier used by the Home Connect API to select the program. The same `key` value can be used in multiple program objects, e.g. combined with different options. The supported program `key` values can be found in the **Identify** log output or the Home Connect API documentation.

Each program object may also include an `options` object to modify behaviour of the program. This contains key-value pairs for the options that should be changed from their defaults. It is not necessary to include all supported options. The **Identify** output attempts to list a valid value for each option. This is followed by a second key prefixed with an underscore (`_`) that provides details of the allowed values; either a list of supported enum values, or a description of the range and units for numeric values. (The option keys prefixed by an underscore are ignored when this plugin processes the `config.json` file so can be left as comments.)

Descriptions of the available programs and their options can be found in the Home Connect API documentation:
* [CoffeeMaker](https://developer.home-connect.com/docs/coffee-maker/supported_programs_and_options)
* [Dishwasher](https://developer.home-connect.com/docs/dishwasher/supported_programs_options)
* [Dryer](https://developer.home-connect.com/docs/dryer/supported_programs_and_options)
* [Oven](https://developer.home-connect.com/docs/oven/supported_programs_and_options)
* [Washer](https://developer.home-connect.com/docs/washing-machine/supported_programs_and_options)

Use [JSONLint](https://jsonlint.com/) to validate the modified `config.json` file before restarting Homebridge.

#### Custom Programs Example

As an example, running **Identify** against the [simulated CoffeeMaker](https://developer.home-connect.com/simulator/coffee-machine) results in the following output in the Homebridge log file:

```
[HomeConnect] [CoffeeMaker Simulator] Identify: BOSCH-HCS06COM1-846D1E984F70
[HomeConnect] [CoffeeMaker Simulator] BSH.Common.Root.SelectedProgram=ConsumerProducts.CoffeeMaker.Program.Beverage.Coffee
[HomeConnect] [CoffeeMaker Simulator] BSH.Common.Setting.PowerState=BSH.Common.EnumType.PowerState.On
[HomeConnect] [CoffeeMaker Simulator] BSH.Common.Status.DoorState=BSH.Common.EnumType.DoorState.Closed
[HomeConnect] [CoffeeMaker Simulator] BSH.Common.Status.OperationState=BSH.Common.EnumType.OperationState.Ready
[HomeConnect] [CoffeeMaker Simulator] BSH.Common.Status.RemoteControlStartAllowed=true
[HomeConnect] [CoffeeMaker Simulator] connected=true
[HomeConnect] [CoffeeMaker Simulator] 6 of 6 programs available
{
    "BOSCH-HCS06COM1-846D1E984F70": {
        "programs": [
            {
                "name": "Espresso",
                "key": "ConsumerProducts.CoffeeMaker.Program.Beverage.Espresso",
                "options": {
                    "ConsumerProducts.CoffeeMaker.Option.CoffeeTemperature": "ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.88C",
                    "_ConsumerProducts.CoffeeMaker.Option.CoffeeTemperature": [
                        "ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.88C",
                        "ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.90C",
                        "ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.92C",
                        "ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.94C",
                        "ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.95C",
                        "ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.96C"
                    ],
                    "ConsumerProducts.CoffeeMaker.Option.BeanAmount": "ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.VeryMild",
                    "_ConsumerProducts.CoffeeMaker.Option.BeanAmount": [
                        "ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.VeryMild",
                        "ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.Mild",
                        "ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.Normal",
                        "ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.Strong",
                        "ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.VeryStrong",
                        "ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.DoubleShot",
                        "ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.DoubleShotPlus",
                        "ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.DoubleShotPlusPlus"
                    ],
                    "ConsumerProducts.CoffeeMaker.Option.FillQuantity": 35,
                    "_ConsumerProducts.CoffeeMaker.Option.FillQuantity": "Int [35 .. 60] step 5 ml"
                }
            },
```
*(28 lines omitted)*
```
            {
                "name": "Coffee",
                "key": "ConsumerProducts.CoffeeMaker.Program.Beverage.Coffee",
                "options": {
                    "ConsumerProducts.CoffeeMaker.Option.CoffeeTemperature": "ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.88C",
                    "_ConsumerProducts.CoffeeMaker.Option.CoffeeTemperature": [
                        "ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.88C",
                        "ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.90C",
                        "ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.92C",
                        "ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.94C",
                        "ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.95C",
                        "ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.96C"
                    ],
                    "ConsumerProducts.CoffeeMaker.Option.BeanAmount": "ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.VeryMild",
                    "_ConsumerProducts.CoffeeMaker.Option.BeanAmount": [
                        "ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.VeryMild",
                        "ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.Mild",
                        "ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.Normal",
                        "ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.Strong",
                        "ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.VeryStrong",
                        "ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.DoubleShot",
                        "ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.DoubleShotPlus",
                        "ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.DoubleShotPlusPlus"
                    ],
                    "ConsumerProducts.CoffeeMaker.Option.FillQuantity": 60,
                    "_ConsumerProducts.CoffeeMaker.Option.FillQuantity": "Int [60 .. 250] step 10 ml"
                }
            },
```
*(84 lines omitted)*
```
        ]
    }
}
```
Ignore the first few lines which report the appliance's current state. The relevant portion is after the `6 of 6 programs available` line.


The section between (but not including) the outer-most braces (`{` and `}`) can be pasted into the `HomeConnect` platform section of the `config.json` file. However, it makes more sense to remove unwanted programs, customise the options, and remove the comments.

For example, to reduce the six CoffeeMaker programs to two:
1. Espresso, at 95°C and very strong
1. Coffee, using the program's default options

the following configuration could be used:
```JSON
{
    "platforms":
    [{
        "platform":     "HomeConnect",
        "clientid":     "0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF",
        "BOSCH-HCS06COM1-846D1E984F70": {
            "programs": [{
                "name": "My Espresso",
                "key":  "ConsumerProducts.CoffeeMaker.Program.Beverage.Espresso",
                "options": {
                    "ConsumerProducts.CoffeeMaker.Option.CoffeeTemperature": "ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.95C",
                    "ConsumerProducts.CoffeeMaker.Option.BeanAmount":        "ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.VeryStrong"
                }
            },{
                "name": "Coffee",
                "key":  "ConsumerProducts.CoffeeMaker.Program.Beverage.Coffee"
            }]
        }
    }]
}
```

## Notes

This plugin was developed and tested with a Siemens oven (HB678GBS6B/58), induction hob (EX677LYV1E/06), and dishwasher (SN678D06TG/53). Some additional testing was performed using the [Home Connect appliance simulators](https://developer.home-connect.com/simulator). It should work with all other Home Connect appliances, but functionality is currently more limited (and bugs are more likely) for other appliance types.

### Capabilities

The following general functionality is supported by this plugin for different appliance types:

|                            | CoffeeMaker | Dishwasher | Dryer/ Washer/ WasherDryer | FridgeFreezer / Freezer / Refrigerator / WineCooler | Hob    | Hood         | Oven       | CleaningRobot / CookProcessor |
| -------------------------- | :---------: | :--------: | :------------------------: | :-------------------------------------------------: | :----: | :----------: | :--------: | :---------------------------: |
| **Power on/off**           | Read/Write  | Read/Write | Read                       | Read                                                | Read   | Read/Write   | Read/Write | Read                          |
| **Door open/closed**       | Read        | Read       | Read                       | Read                                                | -      | -            | Read       | -                             |
| **Program start/stop**     | Read/Write  | Read/Write | Read/Write                 | -                                                   | -      | (Read/Write) | Read       | -                             |
| **Program finished event** | -           | Notify     | Notify                     | -                                                   | Notify | Notify       | Notify     | -                             |
| **Program aborted event**  | -           | Notify     | Notify                     | -                                                   | -      |              | -          | -                             |
| **Program time remaining** | Read        | Read       | Read                       | -                                                   | -      | Read         | Read       | -                             |
| **Operation state active** | Read        | Read       | Read                       | -                                                   | Read   | Read         | Read       | -                             |
| **Operation state error**  | Read        | -          | Read                       | -                                                   | Read   | -            | Read       | -                             |

*Starting and stopping programs on Hood appliances is implemented differently than for other types of appliance. It uses HomeKit `Fan` and `Lightbulb` services instead of a `Switch` per program.*

#### Cooking appliances

Some additional functionality is supported for cooking appliances:

|                                | CoffeeMaker | CookProcessor | Hob    | Hood                         | Oven   |
| ------------------------------ | :---------: | :-----------: | :----: | :--------------------------: | :----: |
| **Fan speed/auto control**     | -           | -             |        | Read/Write :crossed_fingers: | -      |
| **Functional light control**   | -           | -             |        | Read/Write :crossed_fingers: | -      |
| **Ambient light control**      | -           | -             |        | Read/Write :crossed_fingers: | -      |
| **Timer finished event**       | -           | -             | Notify |                              | Notify |
| **Preheat finished event**     | -           | -             | Notify |                              | Notify |
| **Bean container empty event** | Notify      | -             | -      | -                            | -      |
| **Water tank empty event**     | Notify      | -             | -      | -                            | -      |
| **Drip tray full event**       | Notify      | -             | -      | -                            | -      |

:crossed_fingers: *Control of the fan and light in Hood appliances has been implemented but not tested. Please add any feedback to [issue #2](https://github.com/thoukydides/homebridge-homeconnect/issues/2).*

#### Cleaning appliances

Some additional functionality is supported for cleaning appliances:

|                    | CleaningRobot | Dishwasher | Dryer | Washer | WasherDryer |
| ------------------ | :-----------: | :--------: | :---: | :----: | :---------: |
| *(None currently)* | -             | -          | -     | -      | -           |

#### Cooling appliances

Some additional functionality is supported for cooling appliances:

|                                     | Freezer | FridgeFreezer | Refrigerator | WineCooler |
| ----------------------------------- | :-----: | :-----------: | :----------: | :--------: |
| **Freezer door alarm event**        | Notify  | Notify        | -            | -          |
| **Refrigerator door alarm event**   | -       | Notify        | Notify       | -          |
| **Freezer temperature alarm event** | Notify  | Notify        | -            | -          |

### HomeKit Services and Characteristics

*HomeKit* does not define services and characteristics for home appliances, so the following are used: 

| Service                        | Characteristic              | Used for                                      |
| ------------------------------ | --------------------------- | --------------------------------------------- |
| `Switch`                       | `On`                        | Power on/off                                  |
| `Switch`                       | `On`                        | Program start/stop (or monitor)               |
| `Stateless Programmable Switch`| `Programmable Switch Event` | Events                                        |
| `Fan` *(v2)*                   | `Active`                    | Hood fan on/off control                       |
| `Fan` *(v2)*                   | `Current Fan State`         | Hood fan on/off indication                    |
| `Fan` *(v2)*                   | `Target Fan State`          | Hood fan manual/automatic                     |
| `Fan` *(v2)*                   | `Rotation Speed`            | Hood fan speed                                |
| `Lightbulb`                    | `On`                        | Hood light on/off (ambient or functional)     |
| `Lightbulb`                    | `Brightness`                | Hood light brightness (ambient or functional) |
| `Lightbulb`                    | `Hue`                       | Hood light colour (ambient)                   |
| `Lightbulb`                    | `Saturation`                | Hood light colour (ambient)                   |
| `Home Appliance` *(custom)*    | `Current Door State`        | Door open/closed                              |
| `Home Appliance` *(custom)*    | `Remaining Duration`        | Program progress                              |
| `Home Appliance` *(custom)*    | `Active`                    | Operation state active                        |
| `Home Appliance` *(custom)*    | `Status Active`             | Operation state active                        |
| `Home Appliance` *(custom)*    | `Status Fault`              | Operation state error                         |

For events, a `Single Press` is generated when the event occurs and is present, and a `Double Press` after it has been confirmed by the user.

Unfortunately, Apple's Home app (as of iOS 13) does not support custom services, and only shows numeric labels for `Stateless Programmable Switch` services. For full functionality use a third-party HomeKit app instead.

### No Control of Ovens, Hobs, or Fridge-Freezers

The [Home Connect Developer Agreement](https://developer.home-connect.com/developer_agreement) says (in section 7):
> Certain additional permissions to those specified at: https://developer.home-connect.com/docs/authorization/scope may be granted to Clients of selected Users upon an individual check by HC and upon agreement of a separate partner agreement between the Parties, which is based on this Agreement.

This is required for the `Hob-Control`, `Oven-Control`, and `FridgeFreezer-Images` scopes. Additionally, the appliance simulator disallows `CookProcessor-Control` and `FridgeFreezer-Control`. These scopes are therefore not supported by this plugin. Control of these appliances is limited to just power on/off (where supported by the Home Connect API), read-only status, and notification events.

IFTTT Webhooks (e.g. via [homebridge-ifttt](https://www.npmjs.com/package/homebridge-ifttt)) can be used to control these appliances.

## License

> ISC License (ISC)<br>Copyright © 2019 Alexander Thoukydides
>
> Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.
>
> THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
