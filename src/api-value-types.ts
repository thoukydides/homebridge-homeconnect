// Homebridge plugin for Home Connect home appliances
// Copyright © 2023 Alexander Thoukydides

// Program keys (not a comprehensive list)
export type ProgramKey =
    'ConsumerProducts.CleaningRobot.Program.Basic.GoHome'
  | 'ConsumerProducts.CleaningRobot.Program.Cleaning.CleanAll'
  | 'ConsumerProducts.CleaningRobot.Program.Cleaning.CleanMap'
  | 'ConsumerProducts.CoffeeMaker.Program.Beverage.CaffeGrande'
  | 'ConsumerProducts.CoffeeMaker.Program.Beverage.CaffeLatte'
  | 'ConsumerProducts.CoffeeMaker.Program.Beverage.Cappuccino'
  | 'ConsumerProducts.CoffeeMaker.Program.Beverage.Coffee'
  | 'ConsumerProducts.CoffeeMaker.Program.Beverage.Espresso'
  | 'ConsumerProducts.CoffeeMaker.Program.Beverage.EspressoDoppio'
  | 'ConsumerProducts.CoffeeMaker.Program.Beverage.EspressoMacchiato'
  | 'ConsumerProducts.CoffeeMaker.Program.Beverage.HotWater'
  | 'ConsumerProducts.CoffeeMaker.Program.Beverage.LatteMacchiato'
  | 'ConsumerProducts.CoffeeMaker.Program.Beverage.MilkFroth'
  | 'ConsumerProducts.CoffeeMaker.Program.Beverage.Ristretto'
  | 'ConsumerProducts.CoffeeMaker.Program.Beverage.WarmMilk'
  | 'ConsumerProducts.CoffeeMaker.Program.Beverage.XLCoffee'
  | 'ConsumerProducts.CoffeeMaker.Program.CleaningModes.ApplianceOffRinsing' // (undocumented)
  | 'ConsumerProducts.CoffeeMaker.Program.CleaningModes.ApplianceOnRinsing' // (undocumented)
  | 'ConsumerProducts.CoffeeMaker.Program.CoffeeWorld.Americano'
  | 'ConsumerProducts.CoffeeMaker.Program.CoffeeWorld.BlackEye'
  | 'ConsumerProducts.CoffeeMaker.Program.CoffeeWorld.CafeAuLait'
  | 'ConsumerProducts.CoffeeMaker.Program.CoffeeWorld.CafeConLeche'
  | 'ConsumerProducts.CoffeeMaker.Program.CoffeeWorld.CafeCortado'
  | 'ConsumerProducts.CoffeeMaker.Program.CoffeeWorld.Cortado'
  | 'ConsumerProducts.CoffeeMaker.Program.CoffeeWorld.DeadEye'
  | 'ConsumerProducts.CoffeeMaker.Program.CoffeeWorld.Doppio'
  | 'ConsumerProducts.CoffeeMaker.Program.CoffeeWorld.FlatWhite'
  | 'ConsumerProducts.CoffeeMaker.Program.CoffeeWorld.Galao'
  | 'ConsumerProducts.CoffeeMaker.Program.CoffeeWorld.Garoto'
  | 'ConsumerProducts.CoffeeMaker.Program.CoffeeWorld.GrosserBrauner'
  | 'ConsumerProducts.CoffeeMaker.Program.CoffeeWorld.Kaapi'
  | 'ConsumerProducts.CoffeeMaker.Program.CoffeeWorld.KleinerBrauner'
  | 'ConsumerProducts.CoffeeMaker.Program.CoffeeWorld.KoffieVerkeerd'
  | 'ConsumerProducts.CoffeeMaker.Program.CoffeeWorld.RedEye'
  | 'ConsumerProducts.CoffeeMaker.Program.CoffeeWorld.Verlaengerter'
  | 'ConsumerProducts.CoffeeMaker.Program.CoffeeWorld.VerlaengerterBraun'
  | 'ConsumerProducts.CoffeeMaker.Program.CoffeeWorld.WienerMelange'
  | 'Cooking.Common.Program.Hood.Automatic'
  | 'Cooking.Common.Program.Hood.DelayedShutOff'
  | 'Cooking.Common.Program.Hood.Venting'
  | 'Cooking.Oven.Program.Cleaning.Pyrolysis' // (undocumented)
  | 'Cooking.Oven.Program.HeatingMode.BottomHeating'
  | 'Cooking.Oven.Program.HeatingMode.Defrost'
  | 'Cooking.Oven.Program.HeatingMode.Desiccation'
  | 'Cooking.Oven.Program.HeatingMode.FrozenHeatupSpecial'
  | 'Cooking.Oven.Program.HeatingMode.HotAir'
  | 'Cooking.Oven.Program.HeatingMode.HotAir100Steam'
  | 'Cooking.Oven.Program.HeatingMode.HotAir30Steam'
  | 'Cooking.Oven.Program.HeatingMode.HotAir60Steam'
  | 'Cooking.Oven.Program.HeatingMode.HotAir80Steam'
  | 'Cooking.Oven.Program.HeatingMode.HotAirEco'
  | 'Cooking.Oven.Program.HeatingMode.HotAirGrilling'
  | 'Cooking.Oven.Program.HeatingMode.IntensiveHeat'
  | 'Cooking.Oven.Program.HeatingMode.KeepWarm'
  | 'Cooking.Oven.Program.HeatingMode.PizzaSetting'
  | 'Cooking.Oven.Program.HeatingMode.PreHeating'
  | 'Cooking.Oven.Program.HeatingMode.PreheatOvenware'
  | 'Cooking.Oven.Program.HeatingMode.Proof'
  | 'Cooking.Oven.Program.HeatingMode.SabbathProgramme'
  | 'Cooking.Oven.Program.HeatingMode.SlowCook'
  | 'Cooking.Oven.Program.HeatingMode.TopBottomHeating'
  | 'Cooking.Oven.Program.HeatingMode.TopBottomHeatingEco'
  | 'Cooking.Oven.Program.HeatingMode.WarmingDrawer'
  | 'Dishcare.Dishwasher.Program.Auto1'
  | 'Dishcare.Dishwasher.Program.Auto2'
  | 'Dishcare.Dishwasher.Program.Auto3'
  | 'Dishcare.Dishwasher.Program.AutoHalfLoad'
  | 'Dishcare.Dishwasher.Program.Eco50'
  | 'Dishcare.Dishwasher.Program.ExpressSparkle65'
  | 'Dishcare.Dishwasher.Program.Glas40'
  | 'Dishcare.Dishwasher.Program.GlassCare'
  | 'Dishcare.Dishwasher.Program.Intensiv45'
  | 'Dishcare.Dishwasher.Program.Intensiv70'
  | 'Dishcare.Dishwasher.Program.IntensivPower'
  | 'Dishcare.Dishwasher.Program.Kurz60'
  | 'Dishcare.Dishwasher.Program.MachineCare'
  | 'Dishcare.Dishwasher.Program.MagicDaily'
  | 'Dishcare.Dishwasher.Program.MaximumCleaning'
  | 'Dishcare.Dishwasher.Program.MixedLoad'
  | 'Dishcare.Dishwasher.Program.NightWash'
  | 'Dishcare.Dishwasher.Program.Normal45'
  | 'Dishcare.Dishwasher.Program.Normal65'
  | 'Dishcare.Dishwasher.Program.PreRinse'
  | 'Dishcare.Dishwasher.Program.Quick45'
  | 'Dishcare.Dishwasher.Program.Quick65'
  | 'Dishcare.Dishwasher.Program.SteamFresh'
  | 'Dishcare.Dishwasher.Program.Super60'
  | 'LaundryCare.Dryer.Program.AntiShrink'
  | 'LaundryCare.Dryer.Program.Blankets'
  | 'LaundryCare.Dryer.Program.BusinessShirts'
  | 'LaundryCare.Dryer.Program.Cotton'
  | 'LaundryCare.Dryer.Program.Delicates'
  | 'LaundryCare.Dryer.Program.Dessous'
  | 'LaundryCare.Dryer.Program.DownFeathers'
  | 'LaundryCare.Dryer.Program.Hygiene'
  | 'LaundryCare.Dryer.Program.InBasket'
  | 'LaundryCare.Dryer.Program.Jeans'
  | 'LaundryCare.Dryer.Program.Mix'
  | 'LaundryCare.Dryer.Program.MyTime.MyDryingTime'
  | 'LaundryCare.Dryer.Program.Outdoor'
  | 'LaundryCare.Dryer.Program.Pillow'
  | 'LaundryCare.Dryer.Program.Shirts15'
  | 'LaundryCare.Dryer.Program.Super40'
  | 'LaundryCare.Dryer.Program.Synthetic'
  | 'LaundryCare.Dryer.Program.SyntheticRefresh'
  | 'LaundryCare.Dryer.Program.TimeCold'
  | 'LaundryCare.Dryer.Program.TimeColdFix.TimeCold20'
  | 'LaundryCare.Dryer.Program.TimeColdFix.TimeCold30'
  | 'LaundryCare.Dryer.Program.TimeColdFix.TimeCold60'
  | 'LaundryCare.Dryer.Program.TimeWarm'
  | 'LaundryCare.Dryer.Program.TimeWarmFix.TimeWarm30'
  | 'LaundryCare.Dryer.Program.TimeWarmFix.TimeWarm40'
  | 'LaundryCare.Dryer.Program.TimeWarmFix.TimeWarm60'
  | 'LaundryCare.Dryer.Program.Towels'
  | 'LaundryCare.Washer.Program.Auto30'
  | 'LaundryCare.Washer.Program.Auto40'
  | 'LaundryCare.Washer.Program.Auto60'
  | 'LaundryCare.Washer.Program.Chiffon'
  | 'LaundryCare.Washer.Program.Cotton'
  | 'LaundryCare.Washer.Program.Cotton.Colour'
  | 'LaundryCare.Washer.Program.Cotton.CottonEco'
  | 'LaundryCare.Washer.Program.Cotton.Eco4060'
  | 'LaundryCare.Washer.Program.Curtains'
  | 'LaundryCare.Washer.Program.DarkWash'
  | 'LaundryCare.Washer.Program.DelicatesSilk'
  | 'LaundryCare.Washer.Program.Dessous'
  | 'LaundryCare.Washer.Program.DownDuvet.Duvet'
  | 'LaundryCare.Washer.Program.DrumClean'
  | 'LaundryCare.Washer.Program.EasyCare'
  | 'LaundryCare.Washer.Program.Mix'
  | 'LaundryCare.Washer.Program.Mix.NightWash'
  | 'LaundryCare.Washer.Program.Monsoon'
  | 'LaundryCare.Washer.Program.Outdoor'
  | 'LaundryCare.Washer.Program.PlushToy'
  | 'LaundryCare.Washer.Program.PowerSpeed59'
  | 'LaundryCare.Washer.Program.Rinse.RinseSpinDrain'
  | 'LaundryCare.Washer.Program.Sensitive'
  | 'LaundryCare.Washer.Program.ShirtsBlouses'
  | 'LaundryCare.Washer.Program.SportFitness'
  | 'LaundryCare.Washer.Program.Super153045.Super15'
  | 'LaundryCare.Washer.Program.Super153045.Super1530'
  | 'LaundryCare.Washer.Program.Towels'
  | 'LaundryCare.Washer.Program.WaterProof'
  | 'LaundryCare.Washer.Program.Wool'
  | 'LaundryCare.WasherDryer.Program.Cotton'
  | 'LaundryCare.WasherDryer.Program.Cotton.Eco4060'
  | 'LaundryCare.WasherDryer.Program.EasyCare'
  | 'LaundryCare.WasherDryer.Program.Mix'
  | 'LaundryCare.WasherDryer.Program.WashAndDry.60'
  | 'LaundryCare.WasherDryer.Program.WashAndDry.90';

// Program option enumerated types
export type BeanAmount =
    'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.VeryMild'
  | 'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.Mild'
  | 'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.MildPlus'
  | 'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.Normal'
  | 'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.NormalPlus'
  | 'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.Strong'
  | 'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.StrongPlus'
  | 'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.VeryStrong'
  | 'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.VeryStrongPlus'
  | 'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.ExtraStrong'
  | 'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.DoubleShot'
  | 'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.DoubleShotPlus'
  | 'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.DoubleShotPlusPlus'
  | 'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.TripleShot'
  | 'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.TripleShotPlus'
  | 'ConsumerProducts.CoffeeMaker.EnumType.BeanAmount.CoffeeGround';
export type BeanContainerSelection =
    'ConsumerProducts.CoffeeMaker.EnumType.BeanContainerSelection.Right'
  | 'ConsumerProducts.CoffeeMaker.EnumType.BeanContainerSelection.Left';
export type CleaningMode =
    'ConsumerProducts.CleaningRobot.EnumType.CleaningModes.Silent'
  | 'ConsumerProducts.CleaningRobot.EnumType.CleaningModes.Standard'
  | 'ConsumerProducts.CleaningRobot.EnumType.CleaningModes.Power';
export type CoffeeMilkRatio =
    'ConsumerProducts.CoffeeMaker.EnumType.CoffeeMilkRatio.10Percent'
  | 'ConsumerProducts.CoffeeMaker.EnumType.CoffeeMilkRatio.20Percent'
  | 'ConsumerProducts.CoffeeMaker.EnumType.CoffeeMilkRatio.25Percent'
  | 'ConsumerProducts.CoffeeMaker.EnumType.CoffeeMilkRatio.30Percent'
  | 'ConsumerProducts.CoffeeMaker.EnumType.CoffeeMilkRatio.40Percent'
  | 'ConsumerProducts.CoffeeMaker.EnumType.CoffeeMilkRatio.50Percent'
  | 'ConsumerProducts.CoffeeMaker.EnumType.CoffeeMilkRatio.55Percent'
  | 'ConsumerProducts.CoffeeMaker.EnumType.CoffeeMilkRatio.60Percent'
  | 'ConsumerProducts.CoffeeMaker.EnumType.CoffeeMilkRatio.65Percent'
  | 'ConsumerProducts.CoffeeMaker.EnumType.CoffeeMilkRatio.67Percent'
  | 'ConsumerProducts.CoffeeMaker.EnumType.CoffeeMilkRatio.70Percent'
  | 'ConsumerProducts.CoffeeMaker.EnumType.CoffeeMilkRatio.75Percent'
  | 'ConsumerProducts.CoffeeMaker.EnumType.CoffeeMilkRatio.80Percent'
  | 'ConsumerProducts.CoffeeMaker.EnumType.CoffeeMilkRatio.85Percent'
  | 'ConsumerProducts.CoffeeMaker.EnumType.CoffeeMilkRatio.90Percent';
export type CoffeeTemperature =
    'ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.88C'
  | 'ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.90C'
  | 'ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.92C'
  | 'ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.94C'
  | 'ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.95C'
  | 'ConsumerProducts.CoffeeMaker.EnumType.CoffeeTemperature.96C';
export type DryingTarget =
    'LaundryCare.Dryer.EnumType.DryingTarget.IronDry'
  | 'LaundryCare.Dryer.EnumType.DryingTarget.GentleDry'
  | 'LaundryCare.Dryer.EnumType.DryingTarget.CupboardDry'
  | 'LaundryCare.Dryer.EnumType.DryingTarget.CupboardDryPlus'
  | 'LaundryCare.Dryer.EnumType.DryingTarget.ExtraDry';
export type DryingTargetAdjustment = // (undocumented)
    'LaundryCare.Dryer.EnumType.DryingTargetAdjustment.Off'
  | 'LaundryCare.Dryer.EnumType.DryingTargetAdjustment.Plus1'
  | 'LaundryCare.Dryer.EnumType.DryingTargetAdjustment.Plus2'
  | 'LaundryCare.Dryer.EnumType.DryingTargetAdjustment.Plus3';
export type FanSetting =
    'Cooking.Hood.EnumType.Stage.FanOff'
  | 'Cooking.Hood.EnumType.Stage.FanStage01'
  | 'Cooking.Hood.EnumType.Stage.FanStage02'
  | 'Cooking.Hood.EnumType.Stage.FanStage03'
  | 'Cooking.Hood.EnumType.Stage.FanStage04'
  | 'Cooking.Hood.EnumType.Stage.FanStage05';
export type FlowRate =
  'ConsumerProducts.CoffeeMaker.EnumType.FlowRate.Normal'
  | 'ConsumerProducts.CoffeeMaker.EnumType.FlowRate.Intense'
  | 'ConsumerProducts.CoffeeMaker.EnumType.FlowRate.IntensePlus';
export type HotWaterTemperature =
  'ConsumerProducts.CoffeeMaker.EnumType.HotWaterTemperature.WhiteTea'
  | 'ConsumerProducts.CoffeeMaker.EnumType.HotWaterTemperature.GreenTea'
  | 'ConsumerProducts.CoffeeMaker.EnumType.HotWaterTemperature.BlackTea'
  | 'ConsumerProducts.CoffeeMaker.EnumType.HotWaterTemperature.50C'
  | 'ConsumerProducts.CoffeeMaker.EnumType.HotWaterTemperature.55C'
  | 'ConsumerProducts.CoffeeMaker.EnumType.HotWaterTemperature.60C'
  | 'ConsumerProducts.CoffeeMaker.EnumType.HotWaterTemperature.65C'
  | 'ConsumerProducts.CoffeeMaker.EnumType.HotWaterTemperature.70C'
  | 'ConsumerProducts.CoffeeMaker.EnumType.HotWaterTemperature.75C'
  | 'ConsumerProducts.CoffeeMaker.EnumType.HotWaterTemperature.80C'
  | 'ConsumerProducts.CoffeeMaker.EnumType.HotWaterTemperature.85C'
  | 'ConsumerProducts.CoffeeMaker.EnumType.HotWaterTemperature.90C'
  | 'ConsumerProducts.CoffeeMaker.EnumType.HotWaterTemperature.95C'
  | 'ConsumerProducts.CoffeeMaker.EnumType.HotWaterTemperature.97C'
  | 'ConsumerProducts.CoffeeMaker.EnumType.HotWaterTemperature.122F'
  | 'ConsumerProducts.CoffeeMaker.EnumType.HotWaterTemperature.131F'
  | 'ConsumerProducts.CoffeeMaker.EnumType.HotWaterTemperature.140F'
  | 'ConsumerProducts.CoffeeMaker.EnumType.HotWaterTemperature.149F'
  | 'ConsumerProducts.CoffeeMaker.EnumType.HotWaterTemperature.158F'
  | 'ConsumerProducts.CoffeeMaker.EnumType.HotWaterTemperature.167F'
  | 'ConsumerProducts.CoffeeMaker.EnumType.HotWaterTemperature.176F'
  | 'ConsumerProducts.CoffeeMaker.EnumType.HotWaterTemperature.185F'
  | 'ConsumerProducts.CoffeeMaker.EnumType.HotWaterTemperature.194F'
  | 'ConsumerProducts.CoffeeMaker.EnumType.HotWaterTemperature.203F'
  | 'ConsumerProducts.CoffeeMaker.EnumType.HotWaterTemperature.Max';
export type IntensiveSetting =
    'Cooking.Hood.EnumType.IntensiveStage.IntensiveStageOff'
  | 'Cooking.Hood.EnumType.IntensiveStage.IntensiveStage1'
  | 'Cooking.Hood.EnumType.IntensiveStage.IntensiveStage2';
export type PyrolysisLevel = // (undocumented)
    'Cooking.Oven.EnumType.PyrolysisLevel.Level01'
  | 'Cooking.Oven.EnumType.PyrolysisLevel.Level02'
  | 'Cooking.Oven.EnumType.PyrolysisLevel.Level03';
export type ReferenceMapID =
    'ConsumerProducts.CleaningRobot.EnumType.AvailableMaps.TempMap'
  | 'ConsumerProducts.CleaningRobot.EnumType.AvailableMaps.Map1'
  | 'ConsumerProducts.CleaningRobot.EnumType.AvailableMaps.Map2'
  | 'ConsumerProducts.CleaningRobot.EnumType.AvailableMaps.Map3'
  | 'ConsumerProducts.CleaningRobot.EnumType.AvailableMaps.Map4'
  | 'ConsumerProducts.CleaningRobot.EnumType.AvailableMaps.Map5';
export type RinsePlus = // (undocumented)
    'LaundryCare.Washer.EnumType.RinsePlus.Off'
  | 'LaundryCare.Washer.EnumType.RinsePlus.On';
export type SpinSpeed =
    'LaundryCare.Washer.EnumType.SpinSpeed.Off'
  | 'LaundryCare.Washer.EnumType.SpinSpeed.RPM400'
  | 'LaundryCare.Washer.EnumType.SpinSpeed.RPM600'
  | 'LaundryCare.Washer.EnumType.SpinSpeed.RPM800'
  | 'LaundryCare.Washer.EnumType.SpinSpeed.RPM1000'
  | 'LaundryCare.Washer.EnumType.SpinSpeed.RPM1200'
  | 'LaundryCare.Washer.EnumType.SpinSpeed.RPM1400'
  | 'LaundryCare.Washer.EnumType.SpinSpeed.RPM1600'
  | 'LaundryCare.Washer.EnumType.SpinSpeed.UlOff'
  | 'LaundryCare.Washer.EnumType.SpinSpeed.UlLow'
  | 'LaundryCare.Washer.EnumType.SpinSpeed.UlMedium'
  | 'LaundryCare.Washer.EnumType.SpinSpeed.UlHigh';
export type Stains = // (undocumented)
    'LaundryCare.Washer.EnumType.Stains.Off'
  | 'LaundryCare.Washer.EnumType.Stains.On';
export type VarioPerfect =
    'LaundryCare.Common.EnumType.VarioPerfect.Off'
  | 'LaundryCare.Common.EnumType.VarioPerfect.EcoPerfect'
  | 'LaundryCare.Common.EnumType.VarioPerfect.SpeedPerfect';
export type WarmingLevel =
    'Cooking.Oven.EnumType.WarmingLevel.Low'
  | 'Cooking.Oven.EnumType.WarmingLevel.Medium'
  | 'Cooking.Oven.EnumType.WarmingLevel.High';
export type WasherTemperature =
    'LaundryCare.Washer.EnumType.Temperature.Auto' // (undocumented)
  | 'LaundryCare.Washer.EnumType.Temperature.Cold'
  | 'LaundryCare.Washer.EnumType.Temperature.GC20'
  | 'LaundryCare.Washer.EnumType.Temperature.GC30'
  | 'LaundryCare.Washer.EnumType.Temperature.GC40'
  | 'LaundryCare.Washer.EnumType.Temperature.GC50'
  | 'LaundryCare.Washer.EnumType.Temperature.GC60'
  | 'LaundryCare.Washer.EnumType.Temperature.GC70'
  | 'LaundryCare.Washer.EnumType.Temperature.GC80'
  | 'LaundryCare.Washer.EnumType.Temperature.GC90'
  | 'LaundryCare.Washer.EnumType.Temperature.UlCold'
  | 'LaundryCare.Washer.EnumType.Temperature.UlWarm'
  | 'LaundryCare.Washer.EnumType.Temperature.UlHot'
  | 'LaundryCare.Washer.EnumType.Temperature.UlExtraHot';
export type WrinkleGuard = // (undocumented)
    'LaundryCare.Dryer.EnumType.WrinkleGuard.Off'
  | 'LaundryCare.Dryer.EnumType.WrinkleGuard.Min60'
  | 'LaundryCare.Dryer.EnumType.WrinkleGuard.Min120';

// State enumerated types
export enum BatteryChargingState {
    Discharging             = 'BSH.Common.EnumType.BatteryChargingState.Discharging',
    Charging                = 'BSH.Common.EnumType.BatteryChargingState.Charging'
}
export enum ChargingConnection {
    Disconnected            = 'BSH.Common.EnumType.ChargingConnection.Disconnected',
    Connected               = 'BSH.Common.EnumType.ChargingConnection.Connected'
}
export enum DoorState {
    Open                    = 'BSH.Common.EnumType.DoorState.Open',
    Closed                  = 'BSH.Common.EnumType.DoorState.Closed',
    Locked                  = 'BSH.Common.EnumType.DoorState.Locked'
}
export enum DoorStateRefrigeration {
    //Open                    = 'BSH.Common.EnumType.DoorState.Open',
    //Closed                  = 'BSH.Common.EnumType.DoorState.Closed',
    Open                      = 'Refrigeration.Common.EnumType.Door.States.Open', // (undocumented)
    Closed                    = 'Refrigeration.Common.EnumType.Door.States.Closed' // (undocumented)
}
export type DoorStateBottleCooler    = DoorStateRefrigeration;
export type DoorStateFlexCompartment = DoorStateRefrigeration;
export type DoorStateFreezer         = DoorStateRefrigeration;
export type DoorStateRefrigerator    = DoorStateRefrigeration;
export type DoorStateWineCompartment = DoorStateRefrigeration;
export enum OperationState {
    Inactive                = 'BSH.Common.EnumType.OperationState.Inactive',
    Ready                   = 'BSH.Common.EnumType.OperationState.Ready',
    DelayedStart            = 'BSH.Common.EnumType.OperationState.DelayedStart',
    Run                     = 'BSH.Common.EnumType.OperationState.Run',
    Pause                   = 'BSH.Common.EnumType.OperationState.Pause',
    ActionRequired          = 'BSH.Common.EnumType.OperationState.ActionRequired',
    Finished                = 'BSH.Common.EnumType.OperationState.Finished',
    Error                   = 'BSH.Common.EnumType.OperationState.Error',
    Aborting                = 'BSH.Common.EnumType.OperationState.Aborting'
}
export enum CameraState {
    Disabled                = 'BSH.Common.EnumType.Video.CameraState.Disabled',
    Sleeping                = 'BSH.Common.EnumType.Video.CameraState.Sleeping',
    Ready                   = 'BSH.Common.EnumType.Video.CameraState.Ready',
    StreamingLocal          = 'BSH.Common.EnumType.Video.CameraState.StreamingLocal',
    StreamingCloud          = 'BSH.Common.EnumType.Video.CameraState.StreamingCloud',
    StreamingLocalAndCloud  = 'BSH.Common.EnumType.Video.CameraState.StreamingLocalAndCloud',
    Error                   = 'BSH.Common.EnumType.Video.CameraState.Error'
}

// Setting enumerated types
export enum AmbientLightColor {
    CustomColor             = 'BSH.Common.EnumType.AmbientLightColor.CustomColor',
    Color1                  = 'BSH.Common.EnumType.AmbientLightColor.Color1',
    Color2                  = 'BSH.Common.EnumType.AmbientLightColor.Color2',
    Color3                  = 'BSH.Common.EnumType.AmbientLightColor.Color3',
    Color4                  = 'BSH.Common.EnumType.AmbientLightColor.Color4',
    Color5                  = 'BSH.Common.EnumType.AmbientLightColor.Color5',
    Color6                  = 'BSH.Common.EnumType.AmbientLightColor.Color6',
    Color7                  = 'BSH.Common.EnumType.AmbientLightColor.Color7',
    Color8                  = 'BSH.Common.EnumType.AmbientLightColor.Color8',
    Color9                  = 'BSH.Common.EnumType.AmbientLightColor.Color9',
    Color10                 = 'BSH.Common.EnumType.AmbientLightColor.Color10',
    Color11                 = 'BSH.Common.EnumType.AmbientLightColor.Color11',
    Color12                 = 'BSH.Common.EnumType.AmbientLightColor.Color12',
    Color13                 = 'BSH.Common.EnumType.AmbientLightColor.Color13',
    Color14                 = 'BSH.Common.EnumType.AmbientLightColor.Color14',
    Color15                 = 'BSH.Common.EnumType.AmbientLightColor.Color15',
    Color16                 = 'BSH.Common.EnumType.AmbientLightColor.Color16',
    Color17                 = 'BSH.Common.EnumType.AmbientLightColor.Color17',
    Color18                 = 'BSH.Common.EnumType.AmbientLightColor.Color18',
    Color19                 = 'BSH.Common.EnumType.AmbientLightColor.Color19',
    Color20                 = 'BSH.Common.EnumType.AmbientLightColor.Color20',
    Color21                 = 'BSH.Common.EnumType.AmbientLightColor.Color21',
    Color22                 = 'BSH.Common.EnumType.AmbientLightColor.Color22',
    Color23                 = 'BSH.Common.EnumType.AmbientLightColor.Color23',
    Color24                 = 'BSH.Common.EnumType.AmbientLightColor.Color24',
    Color25                 = 'BSH.Common.EnumType.AmbientLightColor.Color25',
    Color26                 = 'BSH.Common.EnumType.AmbientLightColor.Color26',
    Color27                 = 'BSH.Common.EnumType.AmbientLightColor.Color27',
    Color28                 = 'BSH.Common.EnumType.AmbientLightColor.Color28',
    Color29                 = 'BSH.Common.EnumType.AmbientLightColor.Color29',
    Color30                 = 'BSH.Common.EnumType.AmbientLightColor.Color30',
    Color31                 = 'BSH.Common.EnumType.AmbientLightColor.Color31',
    Color32                 = 'BSH.Common.EnumType.AmbientLightColor.Color32',
    Color33                 = 'BSH.Common.EnumType.AmbientLightColor.Color33',
    Color34                 = 'BSH.Common.EnumType.AmbientLightColor.Color34',
    Color35                 = 'BSH.Common.EnumType.AmbientLightColor.Color35',
    Color36                 = 'BSH.Common.EnumType.AmbientLightColor.Color36',
    Color37                 = 'BSH.Common.EnumType.AmbientLightColor.Color37',
    Color38                 = 'BSH.Common.EnumType.AmbientLightColor.Color38',
    Color39                 = 'BSH.Common.EnumType.AmbientLightColor.Color39',
    Color40                 = 'BSH.Common.EnumType.AmbientLightColor.Color40',
    Color41                 = 'BSH.Common.EnumType.AmbientLightColor.Color41',
    Color42                 = 'BSH.Common.EnumType.AmbientLightColor.Color42',
    Color43                 = 'BSH.Common.EnumType.AmbientLightColor.Color43',
    Color44                 = 'BSH.Common.EnumType.AmbientLightColor.Color44',
    Color45                 = 'BSH.Common.EnumType.AmbientLightColor.Color45',
    Color46                 = 'BSH.Common.EnumType.AmbientLightColor.Color46',
    Color47                 = 'BSH.Common.EnumType.AmbientLightColor.Color47',
    Color48                 = 'BSH.Common.EnumType.AmbientLightColor.Color48',
    Color49                 = 'BSH.Common.EnumType.AmbientLightColor.Color49',
    Color50                 = 'BSH.Common.EnumType.AmbientLightColor.Color50',
    Color51                 = 'BSH.Common.EnumType.AmbientLightColor.Color51',
    Color52                 = 'BSH.Common.EnumType.AmbientLightColor.Color52',
    Color53                 = 'BSH.Common.EnumType.AmbientLightColor.Color53',
    Color54                 = 'BSH.Common.EnumType.AmbientLightColor.Color54',
    Color55                 = 'BSH.Common.EnumType.AmbientLightColor.Color55',
    Color56                 = 'BSH.Common.EnumType.AmbientLightColor.Color56',
    Color57                 = 'BSH.Common.EnumType.AmbientLightColor.Color57',
    Color58                 = 'BSH.Common.EnumType.AmbientLightColor.Color58',
    Color59                 = 'BSH.Common.EnumType.AmbientLightColor.Color59',
    Color60                 = 'BSH.Common.EnumType.AmbientLightColor.Color60',
    Color61                 = 'BSH.Common.EnumType.AmbientLightColor.Color61',
    Color62                 = 'BSH.Common.EnumType.AmbientLightColor.Color62',
    Color63                 = 'BSH.Common.EnumType.AmbientLightColor.Color63',
    Color64                 = 'BSH.Common.EnumType.AmbientLightColor.Color64',
    Color65                 = 'BSH.Common.EnumType.AmbientLightColor.Color65',
    Color66                 = 'BSH.Common.EnumType.AmbientLightColor.Color66',
    Color67                 = 'BSH.Common.EnumType.AmbientLightColor.Color67',
    Color68                 = 'BSH.Common.EnumType.AmbientLightColor.Color68',
    Color69                 = 'BSH.Common.EnumType.AmbientLightColor.Color69',
    Color70                 = 'BSH.Common.EnumType.AmbientLightColor.Color70',
    Color71                 = 'BSH.Common.EnumType.AmbientLightColor.Color71',
    Color72                 = 'BSH.Common.EnumType.AmbientLightColor.Color72',
    Color73                 = 'BSH.Common.EnumType.AmbientLightColor.Color73',
    Color74                 = 'BSH.Common.EnumType.AmbientLightColor.Color74',
    Color75                 = 'BSH.Common.EnumType.AmbientLightColor.Color75',
    Color76                 = 'BSH.Common.EnumType.AmbientLightColor.Color76',
    Color77                 = 'BSH.Common.EnumType.AmbientLightColor.Color77',
    Color78                 = 'BSH.Common.EnumType.AmbientLightColor.Color78',
    Color79                 = 'BSH.Common.EnumType.AmbientLightColor.Color79',
    Color80                 = 'BSH.Common.EnumType.AmbientLightColor.Color80',
    Color81                 = 'BSH.Common.EnumType.AmbientLightColor.Color81',
    Color82                 = 'BSH.Common.EnumType.AmbientLightColor.Color82',
    Color83                 = 'BSH.Common.EnumType.AmbientLightColor.Color83',
    Color84                 = 'BSH.Common.EnumType.AmbientLightColor.Color84',
    Color85                 = 'BSH.Common.EnumType.AmbientLightColor.Color85',
    Color86                 = 'BSH.Common.EnumType.AmbientLightColor.Color86',
    Color87                 = 'BSH.Common.EnumType.AmbientLightColor.Color87',
    Color88                 = 'BSH.Common.EnumType.AmbientLightColor.Color88',
    Color89                 = 'BSH.Common.EnumType.AmbientLightColor.Color89',
    Color90                 = 'BSH.Common.EnumType.AmbientLightColor.Color90',
    Color91                 = 'BSH.Common.EnumType.AmbientLightColor.Color91',
    Color92                 = 'BSH.Common.EnumType.AmbientLightColor.Color92',
    Color93                 = 'BSH.Common.EnumType.AmbientLightColor.Color93',
    Color94                 = 'BSH.Common.EnumType.AmbientLightColor.Color94',
    Color95                 = 'BSH.Common.EnumType.AmbientLightColor.Color95',
    Color96                 = 'BSH.Common.EnumType.AmbientLightColor.Color96',
    Color97                 = 'BSH.Common.EnumType.AmbientLightColor.Color97',
    Color98                 = 'BSH.Common.EnumType.AmbientLightColor.Color98',
    Color99                 = 'BSH.Common.EnumType.AmbientLightColor.Color99'
}
export enum AssistantForce {
    LowForce                = 'Refrigeration.Common.EnumType.Door.AssistantForce.LowForce',
    MiddleForce             = 'Refrigeration.Common.EnumType.Door.AssistantForce.MiddleForce',
    HighForce               = 'Refrigeration.Common.EnumType.Door.AssistantForce.HighForce'
}
export enum AssistantTrigger {
    Push                    = 'Refrigeration.Common.EnumType.Door.AssistantTrigger.Push',
    Pull                    = 'Refrigeration.Common.EnumType.Door.AssistantTrigger.Pull',
    PushPull                = 'Refrigeration.Common.EnumType.Door.AssistantTrigger.PushPull'
}
export enum LiquidVolumeUnit {
    FluidOunces             = 'BSH.Common.EnumType.LiquidVolumeUnit.FluidOunces',
    MilliLiter              = 'BSH.Common.EnumType.LiquidVolumeUnit.MilliLiter'
}
export enum PowerState {
    MainsOff                = 'BSH.Common.EnumType.PowerState.MainsOff', // (undocumented)
    Off                     = 'BSH.Common.EnumType.PowerState.Off',
    On                      = 'BSH.Common.EnumType.PowerState.On',
    Standby                 = 'BSH.Common.EnumType.PowerState.Standby'
}
export enum TemperatureUnit {
    Celsius                 = 'BSH.Common.EnumType.TemperatureUnit.Celsius',
    Fahrenheit              = 'BSH.Common.EnumType.TemperatureUnit.Fahrenheit'
}

// Event enumerated types
export enum EventPresentState {
    Present                 = 'BSH.Common.EnumType.EventPresentState.Present',
    Off                     = 'BSH.Common.EnumType.EventPresentState.Off',
    Confirmed               = 'BSH.Common.EnumType.EventPresentState.Confirmed'
}
export enum ProcessPhase {
    MovingToTarget          = 'ConsumerProducts.CleaningRobot.EnumType.ProcessPhase.MovingToTarget',
    Cleaning                = 'ConsumerProducts.CleaningRobot.EnumType.ProcessPhase.Cleaning',
    SearchingBaseStation    = 'ConsumerProducts.CleaningRobot.EnumType.ProcessPhase.SearchingBaseStation',
    MovingToHome            = 'ConsumerProducts.CleaningRobot.EnumType.ProcessPhase.MovingToHome',
    ChargingBreak           = 'ConsumerProducts.CleaningRobot.EnumType.ProcessPhase.ChargingBreak',
    MapValidationByUser     = 'ConsumerProducts.CleaningRobot.EnumType.ProcessPhase.MapValidationByUser',
    Exploring               = 'ConsumerProducts.CleaningRobot.EnumType.ProcessPhase.Exploring',
    Localizing              = 'ConsumerProducts.CleaningRobot.EnumType.ProcessPhase.Localizing'
}

// Program options
export interface OptionValues {
    'BSH.Common.Option.Duration'?:                                          number;
    'BSH.Common.Option.ElapsedProgramTime'?:                                number;
    'BSH.Common.Option.EnergyForecast'?:                                    number; // (undocumented)
    'BSH.Common.Option.EstimatedTotalProgramTime'?:                         number;
    'BSH.Common.Option.FinishInRelative'?:                                  number;
    'BSH.Common.Option.ProgramProgress'?:                                   number;
    'BSH.Common.Option.RemainingProgramTime'?:                              number;
    'BSH.Common.Option.RemainingProgramTimeIsEstimated'?:                   boolean;
    'BSH.Common.Option.StartInRelative'?:                                   number;
    'BSH.Common.Option.WaterForecast'?:                                     number; // (undocumented)
    'ConsumerProducts.CleaningRobot.Option.CleaningMode'?:                  CleaningMode;
    'ConsumerProducts.CleaningRobot.Option.ProcessPhase'?:                  ProcessPhase;
    'ConsumerProducts.CleaningRobot.Option.ReferenceMapId'?:                ReferenceMapID;
    'ConsumerProducts.CoffeeMaker.Option.BeanAmount'?:                      BeanAmount;
    'ConsumerProducts.CoffeeMaker.Option.BeanContainerSelection'?:          BeanContainerSelection;
    'ConsumerProducts.CoffeeMaker.Option.CoffeeMilkRatio'?:                 CoffeeMilkRatio;
    'ConsumerProducts.CoffeeMaker.Option.CoffeeTemperature'?:               CoffeeTemperature;
    'ConsumerProducts.CoffeeMaker.Option.FillQuantity'?:                    number;
    'ConsumerProducts.CoffeeMaker.Option.FlowRate'?:                        FlowRate;
    'ConsumerProducts.CoffeeMaker.Option.HotWaterTemperature'?:             HotWaterTemperature;
    'ConsumerProducts.CoffeeMaker.Option.MultipleBeverages'?:               boolean;
    'Cooking.Common.Option.Hood.IntensiveLevel'?:                           IntensiveSetting;
    'Cooking.Common.Option.Hood.VentingLevel'?:                             FanSetting;
    'Cooking.Oven.Option.FastPreHeat'?:                                     boolean;
    'Cooking.Oven.Option.PyrolysisLevel'?:                                  PyrolysisLevel; // (undocumented)
    'Cooking.Oven.Option.SetpointTemperature'?:                             number;
    'Cooking.Oven.Option.WarmingLevel'?:                                    WarmingLevel;
    'Dishcare.Dishwasher.Option.BrillianceDry'?:                            boolean;
    'Dishcare.Dishwasher.Option.EcoDry'?:                                   boolean;
    'Dishcare.Dishwasher.Option.ExtraDry'?:                                 boolean;
    'Dishcare.Dishwasher.Option.HalfLoad'?:                                 boolean;
    'Dishcare.Dishwasher.Option.HygienePlus'?:                              boolean;
    'Dishcare.Dishwasher.Option.IntensivZone'?:                             boolean;
    'Dishcare.Dishwasher.Option.SilenceOnDemand'?:                          boolean;
    'Dishcare.Dishwasher.Option.VarioSpeed'?:                               boolean; // (undocumented)
    'Dishcare.Dishwasher.Option.VarioSpeedPlus'?:                           boolean;
    'Dishcare.Dishwasher.Option.ZeoliteDry'?:                               boolean;
    'LaundryCare.Common.Option.LoadRecommendation'?:                        number; // (undocumented)
    'LaundryCare.Common.Option.ReferToProgram'?:                            number; // (undocumented)
    'LaundryCare.Common.Option.VarioPerfect'?:                              VarioPerfect;
    'LaundryCare.Dryer.Option.DryingTarget'?:                               DryingTarget;
    'LaundryCare.Dryer.Option.DryingTargetAdjustment'?:                     DryingTargetAdjustment; // (undocumented)
    'LaundryCare.Dryer.Option.Gentle'?:                                     boolean; // (undocumented)
    'LaundryCare.Dryer.Option.WrinkleGuard'?:                               WrinkleGuard; // (undocumented)
    'LaundryCare.Washer.Option.IDos1Active'?:                               boolean;
    'LaundryCare.Washer.Option.IDos2Active'?:                               boolean;
    'LaundryCare.Washer.Option.LessIroning'?:                               boolean; // (undocumented)
    'LaundryCare.Washer.Option.Prewash'?:                                   boolean; // (undocumented)
    'LaundryCare.Washer.Option.RinseHold'?:                                 boolean; // (undocumented)
    'LaundryCare.Washer.Option.RinsePlus'?:                                 RinsePlus; // (undocumented)
    'LaundryCare.Washer.Option.SilentWash'?:                                boolean; // (undocumented)
    'LaundryCare.Washer.Option.Soak'?:                                      boolean; // (undocumented)
    'LaundryCare.Washer.Option.SpinSpeed'?:                                 SpinSpeed;
    'LaundryCare.Washer.Option.Stains'?:                                    Stains; // (undocumented)
    'LaundryCare.Washer.Option.Temperature'?:                               WasherTemperature;
    'LaundryCare.Washer.Option.WaterPlus'?:                                 boolean;
}

// Statuses
export interface StatusValues {
    'BSH.Common.Status.BatteryChargingState'?:                              BatteryChargingState;
    'BSH.Common.Status.BatteryLevel'?:                                      number;
    'BSH.Common.Status.ChargingConnection'?:                                ChargingConnection;
    'BSH.Common.Status.DoorState'?:                                         DoorState;
    'BSH.Common.Status.LocalControlActive'?:                                boolean;
    'BSH.Common.Status.OperationState'?:                                    OperationState;
    'BSH.Common.Status.RemoteControlActive'?:                               boolean;
    'BSH.Common.Status.RemoteControlStartAllowed'?:                         boolean;
    'BSH.Common.Status.Video.CameraState'?:                                 CameraState;
    'ConsumerProducts.CleaningRobot.Status.DustBoxInserted'?:               boolean;
    'ConsumerProducts.CleaningRobot.Status.LastSelectedMap'?:               ReferenceMapID;
    'ConsumerProducts.CleaningRobot.Status.Lifted'?:                        boolean;
    'ConsumerProducts.CleaningRobot.Status.Lost'?:                          boolean;
    'ConsumerProducts.CoffeeMaker.Status.BeverageCounterCoffee'?:           number;
    'ConsumerProducts.CoffeeMaker.Status.BeverageCounterCoffeeAndMilk'?:    number;
    'ConsumerProducts.CoffeeMaker.Status.BeverageCounterFrothyMilk'?:       number;
    'ConsumerProducts.CoffeeMaker.Status.BeverageCounterHotMilk'?:          number;
    'ConsumerProducts.CoffeeMaker.Status.BeverageCounterHotWater'?:         number;
    'ConsumerProducts.CoffeeMaker.Status.BeverageCounterHotWaterCups'?:     number;
    'ConsumerProducts.CoffeeMaker.Status.BeverageCounterMilk'?:             number;
    'ConsumerProducts.CoffeeMaker.Status.BeverageCounterPowderCoffee'?:     number;
    'ConsumerProducts.CoffeeMaker.Status.BeverageCounterRistrettoEspresso'?:number;
    'Cooking.Oven.Status.CurrentCavityTemperature'?:                        number; // (undocumented)
    'Refrigeration.Common.Status.Door.BottleCooler'?:                       DoorStateBottleCooler;
    'Refrigeration.Common.Status.Door.Chiller'?:                            DoorStateRefrigerator;
    'Refrigeration.Common.Status.Door.ChillerCommon'?:                      DoorStateRefrigerator;
    'Refrigeration.Common.Status.Door.ChillerLeft'?:                        DoorStateRefrigerator;
    'Refrigeration.Common.Status.Door.ChillerRight'?:                       DoorStateRefrigerator;
    'Refrigeration.Common.Status.Door.FlexCompartment'?:                    DoorStateFlexCompartment;
    'Refrigeration.Common.Status.Door.Freezer'?:                            DoorStateFreezer;
    'Refrigeration.Common.Status.Door.Refrigerator'?:                       DoorStateRefrigerator;
    'Refrigeration.Common.Status.Door.Refrigerator2'?:                      DoorStateRefrigerator;
    'Refrigeration.Common.Status.Door.Refrigerator3'?:                      DoorStateRefrigerator;
    'Refrigeration.Common.Status.Door.WineCompartment'?:                    DoorStateWineCompartment;
}

// Settings
export interface SettingValues {
    'BSH.Common.Setting.AlarmClock'?:                                       number;
    'BSH.Common.Setting.AmbientLightBrightness'?:                           number;
    'BSH.Common.Setting.AmbientLightColor'?:                                AmbientLightColor;
    'BSH.Common.Setting.AmbientLightCustomColor'?:                          string;
    'BSH.Common.Setting.AmbientLightEnabled'?:                              boolean;
    'BSH.Common.Setting.ChildLock'?:                                        boolean;
    'BSH.Common.Setting.LiquidVolumeUnit'?:                                 LiquidVolumeUnit;
    'BSH.Common.Setting.PowerState'?:                                       PowerState;
    'BSH.Common.Setting.TemperatureUnit'?:                                  TemperatureUnit;
    'ConsumerProducts.CleaningRobot.Setting.CurrentMap'?:                   ReferenceMapID;
    'ConsumerProducts.CleaningRobot.Setting.NameOfMap1'?:                   string;
    'ConsumerProducts.CleaningRobot.Setting.NameOfMap2'?:                   string;
    'ConsumerProducts.CleaningRobot.Setting.NameOfMap3'?:                   string;
    'ConsumerProducts.CleaningRobot.Setting.NameOfMap4'?:                   string;
    'ConsumerProducts.CleaningRobot.Setting.NameOfMap5'?:                   string;
    'ConsumerProducts.CoffeeMaker.Setting.CupWarmer'?:                      boolean;
    'Cooking.Common.Setting.Lighting'?:                                     boolean;
    'Cooking.Common.Setting.LightingBrightness'?:                           number;
    'Cooking.Hood.Setting.ColorTemperaturePercent'?:                        number;
    'Cooking.Oven.Setting.SabbathMode'?:                                    boolean;
    'LaundryCare.Washer.Setting.IDos1BaseLevel'?:                           number;
    'LaundryCare.Washer.Setting.IDos2BaseLevel'?:                           number;
    'Refrigeration.Common.Setting.BottleCooler.SetpointTemperature'?:       number;
    'Refrigeration.Common.Setting.ChillerCommon.SetpointTemperature'?:      number;
    'Refrigeration.Common.Setting.ChillerLeft.SetpointTemperature'?:        number;
    'Refrigeration.Common.Setting.ChillerRight.SetpointTemperature'?:       number;
    'Refrigeration.Common.Setting.Dispenser.Enabled'?:                      boolean;
    'Refrigeration.Common.Setting.Door.AssistantForceFreezer'?:             AssistantForce;
    'Refrigeration.Common.Setting.Door.AssistantForceFridge'?:              AssistantForce;
    'Refrigeration.Common.Setting.Door.AssistantFreezer'?:                  boolean;
    'Refrigeration.Common.Setting.Door.AssistantFridge'?:                   boolean;
    'Refrigeration.Common.Setting.Door.AssistantTimeoutFreezer'?:           number;
    'Refrigeration.Common.Setting.Door.AssistantTimeoutFridge'?:            number;
    'Refrigeration.Common.Setting.Door.AssistantTriggerFreezer'?:           AssistantTrigger;
    'Refrigeration.Common.Setting.Door.AssistantTriggerFridge'?:            AssistantTrigger;
    'Refrigeration.Common.Setting.EcoMode'?:                                boolean;
    'Refrigeration.Common.Setting.FreshMode'?:                              boolean;
    'Refrigeration.Common.Setting.Light.External.Brightness'?:              number; // (undocumented)
    'Refrigeration.Common.Setting.Light.External.Power'?:                   boolean; // (undocumented)
    'Refrigeration.Common.Setting.Light.Internal.Brightness'?:              number; // (undocumented)
    'Refrigeration.Common.Setting.Light.Internal.Power'?:                   boolean; // (undocumented)
    'Refrigeration.Common.Setting.SabbathMode'?:                            boolean;
    'Refrigeration.Common.Setting.VacationMode'?:                           boolean;
    'Refrigeration.Common.Setting.WineCompartment.SetpointTemperature'?:    number;
    'Refrigeration.Common.Setting.WineCompartment2.SetpointTemperature'?:   number;
    'Refrigeration.Common.Setting.WineCompartment3.SetpointTemperature'?:   number;
    'Refrigeration.FridgeFreezer.Setting.SetpointTemperatureFreezer'?:      number;
    'Refrigeration.FridgeFreezer.Setting.SetpointTemperatureRefrigerator'?: number;
    'Refrigeration.FridgeFreezer.Setting.SuperModeFreezer'?:                boolean;
    'Refrigeration.FridgeFreezer.Setting.SuperModeRefrigerator'?:           boolean;
}

// Events
export interface EventConnectedValues {
    'BSH.Common.Appliance.Connected'?:                                      true;
}
export interface EventDisconnectedValues {
    'BSH.Common.Appliance.Disconnected'?:                                   true;
}
export interface EventPairedValues {
    'BSH.Common.Appliance.Paired'?:                                         true;
}
export interface EventDepairedValues {
    'BSH.Common.Appliance.Depaired'?:                                       true;
}
export interface EventNotifyValues extends OptionValues, SettingValues {
    // Program changes
    'BSH.Common.Root.SelectedProgram'?:                                     ProgramKey | null;
    'BSH.Common.Root.ActiveProgram'?:                                       ProgramKey | null;
}
export interface EventStatusValues extends StatusValues {}
export interface EventEventValues {
    // Program progress events
    'BSH.Common.Event.AlarmClockElapsed'?:                                  EventPresentState;
    'BSH.Common.Event.ProgramAborted'?:                                     EventPresentState;
    'BSH.Common.Event.ProgramFinished'?:                                    EventPresentState;
    'Cooking.Oven.Event.PreheatFinished'?:                                  EventPresentState;
    'Cooking.Oven.Event.RegularPreheatFinished'?:                           EventPresentState;
    // Home appliance state changes
    'ConsumerProducts.CleaningRobot.Event.DockingStationNotFound'?:         EventPresentState;
    'ConsumerProducts.CleaningRobot.Event.EmptyDustBoxAndCleanFilter'?:     EventPresentState;
    'ConsumerProducts.CleaningRobot.Event.RobotIsStuck'?:                   EventPresentState;
    'ConsumerProducts.CoffeeMaker.Event.BeanContainerEmpty'?:               EventPresentState;
    'ConsumerProducts.CoffeeMaker.Event.CalcNCleanIn10Cups'?:               EventPresentState;
    'ConsumerProducts.CoffeeMaker.Event.CalcNCleanIn15Cups'?:               EventPresentState;
    'ConsumerProducts.CoffeeMaker.Event.CalcNCleanIn20Cups'?:               EventPresentState;
    'ConsumerProducts.CoffeeMaker.Event.CalcNCleanIn5Cups'?:                EventPresentState;
    'ConsumerProducts.CoffeeMaker.Event.DescalingIn10Cups'?:                EventPresentState;
    'ConsumerProducts.CoffeeMaker.Event.DescalingIn15Cups'?:                EventPresentState;
    'ConsumerProducts.CoffeeMaker.Event.DescalingIn20Cups'?:                EventPresentState;
    'ConsumerProducts.CoffeeMaker.Event.DescalingIn5Cups'?:                 EventPresentState;
    'ConsumerProducts.CoffeeMaker.Event.DeviceCalcNCleanBlockage'?:         EventPresentState;
    'ConsumerProducts.CoffeeMaker.Event.DeviceCalcNCleanOverdue'?:          EventPresentState;
    'ConsumerProducts.CoffeeMaker.Event.DeviceCleaningOverdue'?:            EventPresentState;
    'ConsumerProducts.CoffeeMaker.Event.DeviceDescalingBlockage'?:          EventPresentState;
    'ConsumerProducts.CoffeeMaker.Event.DeviceDescalingOverdue'?:           EventPresentState;
    'ConsumerProducts.CoffeeMaker.Event.DeviceShouldBeCalcNCleaned'?:       EventPresentState;
    'ConsumerProducts.CoffeeMaker.Event.DeviceShouldBeCleaned'?:            EventPresentState;
    'ConsumerProducts.CoffeeMaker.Event.DeviceShouldBeDescaled'?:           EventPresentState;
    'ConsumerProducts.CoffeeMaker.Event.DripTrayFull'?:                     EventPresentState;
    'ConsumerProducts.CoffeeMaker.Event.KeepMilkTankCool'?:                 EventPresentState;
    'ConsumerProducts.CoffeeMaker.Event.WaterTankEmpty'?:                   EventPresentState;
    'Cooking.Common.Event.Hood.GreaseFilterMaxSaturationNearlyReached'?:    EventPresentState;
    'Cooking.Common.Event.Hood.GreaseFilterMaxSaturationReached'?:          EventPresentState;
    'Dishcare.Dishwasher.Event.RinseAidNearlyEmpty'?:                       EventPresentState;
    'Dishcare.Dishwasher.Event.SaltNearlyEmpty'?:                           EventPresentState;
    'LaundryCare.Washer.Event.IDos1FillLevelPoor'?:                         EventPresentState;
    'LaundryCare.Washer.Event.IDos2FillLevelPoor'?:                         EventPresentState;
    'Refrigeration.FridgeFreezer.Event.DoorAlarmFreezer'?:                  EventPresentState;
    'Refrigeration.FridgeFreezer.Event.DoorAlarmRefrigerator'?:             EventPresentState;
    'Refrigeration.FridgeFreezer.Event.TemperatureAlarmFreezer'?:           EventPresentState;
}
export interface EventMapValues {
    CONNECTED:    EventConnectedValues;
    DISCONNECTED: EventDisconnectedValues;
    PAIRED:       EventPairedValues;
    DEPAIRED:     EventDepairedValues;
    NOTIFY:       EventNotifyValues;
    STATUS:       EventStatusValues;
    EVENT:        EventEventValues;
}
export type EventValues =
    EventConnectedValues & EventDisconnectedValues & EventPairedValues & EventDepairedValues
  & EventNotifyValues & EventStatusValues & EventEventValues;

// Commands
export interface CommandValues {
    'BSH.Common.Command.AcknowledgeEvent'?:                                 true; // (undocumented)
    'BSH.Common.Command.OpenDoor'?:                                         true;
    'BSH.Common.Command.PartlyOpenDoor'?:                                   true;
    'BSH.Common.Command.PauseProgram'?:                                     true;
    'BSH.Common.Command.ResumeProgram'?:                                    true;
}
