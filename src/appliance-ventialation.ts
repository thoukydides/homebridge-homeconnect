// Homebridge plugin for Home Connect home appliances
// Copyright © 2019-2025 Alexander Thoukydides

/* eslint indent: ["warn", 4, { "CallExpression": {"arguments": 0} }] */

import { ApplianceGeneric } from './appliance-generic.js';

// A Homebridge accessory for a Home Connect air conditioner
export class ApplianceAirConditioner extends ApplianceGeneric {}