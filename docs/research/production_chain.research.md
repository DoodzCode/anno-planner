# Production Chain Data (JSON)

Created by: Ian Deans
Created time: May 30, 2026 1:04 PM
Type: official doc

<aside>
🏭

Graph-ready production data for the AOBB planner. Every good and every building is a node; inputs/outputs are the edges. Rates are tons/min at 100% productivity so the planner can compute throughput, building counts, and balance.

</aside>

## Production model (the math)

- **Output rate (non-electric):** `ratePerMin = (productivityPercent / 100) × (60 / baseCycleSeconds)`. At 100% this is just `60 / baseCycleSeconds`.
- **Output rate (electric buildings):** the listed `baseCycleSeconds` is the 100% value; electricity pushes productivity to 200% (and items can reach 300%), so a powered building runs at 2× its base rate. Use `ratePerMin = (productivityPercent / 200) × (60 / baseCycleSeconds)` with `productivityPercent` up to 300.
- **Input rule:** producing 1 ton of output consumes exactly **1 ton of every listed input**. So at a given productivity, each input's demand (t/min) equals the building's output (t/min). This is why ratios are clean.
- **Building-count ratio between two linked buildings** = inverse ratio of their rates. Example (Ian's correction): 1 Furnace (2 t/min steel) feeds 1 Steelworks (1.33 t/min) **+** 1 Weapons Factory (0.67 t/min) → 1.33 + 0.67 = 2.0. ✅

## How to build the graph

1. Create a node for each entry in `goods` and each entry in `buildings`.
2. For each building `b`: add edge `good → b` for every input (weight = consumption t/min), and edge `b → output.good` (weight = production t/min).
3. To satisfy a target demand `D` t/min of a good: `buildingsNeeded = D / building.outputPerMin`, then propagate `D` upstream to each input (same `D`, since 1:1) and repeat.
4. Blueprint metric = sum of selected buildings' net production/consumption per good; a balanced blueprint nets ≥ 0 for every intermediate good.

<aside>
⚠️

**Confidence:** Old World raw materials + the steel branch are validated against the in-game ratios and your correction. Entries marked `"verify": true` are best-effort topology/rates (recipe is right, exact cycle seconds should be spot-checked against the in-game build menu). New World / Arctic / Enbesa and DLC goods are intentionally left as a stub to extend. `footprint` is reserved (null) — this file is scoped to **production metrics**, not grid placement.

</aside>

```json
{
  "schemaVersion": "1.0.0",
  "game": "Anno 1800",
  "scope": "Base-game Old World core chains (raw, construction, Farmers→Engineers consumer goods). New World+ stubbed for extension.",
  "productionModel": {
    "outputRatePerMin": "(productivityPercent/100) * (60 / baseCycleSeconds); for requiresElectricity=true use /200 and allow productivityPercent up to 300",
    "inputConsumption": "1 ton of output consumes 1 ton of EACH input; input t/min demand == output t/min at the same productivity",
    "buildingCountRatio": "between linked buildings, count is inversely proportional to rate"
  },
  "fields": {
    "baseCycleSeconds": "seconds to produce 1 ton at 100% productivity",
    "outputPerMin": "tons/min at 100% (60/baseCycleSeconds)",
    "inputs": "array of { good, perMin } consumed at 100%",
    "output": "{ good, perMin } produced at 100%",
    "requiresElectricity": "if true, can be boosted to 200-300%",
    "footprint": "reserved {width,height} in grid tiles; null here (placement is out of scope)",
    "verify": "true = recipe is correct but exact cycle seconds should be confirmed in-game"
  },
  "goods": [
    { "id": "timber", "name": "Timber", "category": "construction" },
    { "id": "bricks", "name": "Bricks", "category": "construction" },
    { "id": "clay", "name": "Clay", "category": "intermediate" },
    { "id": "steel_beams", "name": "Steel Beams", "category": "construction" },
    { "id": "windows", "name": "Windows", "category": "construction" },
    { "id": "reinforced_concrete", "name": "Reinforced Concrete", "category": "construction" },
    { "id": "weapons", "name": "Weapons", "category": "goods" },
    { "id": "iron", "name": "Iron", "category": "intermediate" },
    { "id": "coal", "name": "Coal", "category": "intermediate" },
    { "id": "steel", "name": "Steel", "category": "intermediate" },
    { "id": "quartz_sand", "name": "Quartz Sand", "category": "intermediate" },
    { "id": "glass", "name": "Glass", "category": "intermediate" },
    { "id": "limestone", "name": "Limestone", "category": "intermediate" },
    { "id": "cement", "name": "Cement", "category": "intermediate" },
    { "id": "fish", "name": "Fish", "category": "food" },
    { "id": "potatoes", "name": "Potatoes", "category": "crop" },
    { "id": "schnapps", "name": "Schnapps", "category": "food" },
    { "id": "wool", "name": "Wool", "category": "intermediate" },
    { "id": "work_clothes", "name": "Work Clothes", "category": "goods" },
    { "id": "pigs", "name": "Pigs", "category": "livestock" },
    { "id": "sausages", "name": "Sausages", "category": "food" },
    { "id": "grain", "name": "Grain", "category": "crop" },
    { "id": "flour", "name": "Flour", "category": "intermediate" },
    { "id": "bread", "name": "Bread", "category": "food" },
    { "id": "tallow", "name": "Tallow", "category": "intermediate" },
    { "id": "soap", "name": "Soap", "category": "goods" },
    { "id": "hops", "name": "Hops", "category": "crop" },
    { "id": "malt", "name": "Malt", "category": "intermediate" },
    { "id": "beer", "name": "Beer", "category": "food" },
    { "id": "sails", "name": "Sails", "category": "goods" },
    { "id": "goulash", "name": "Goulash", "category": "intermediate" },
    { "id": "canned_food", "name": "Canned Food", "category": "food" },
    { "id": "furs", "name": "Furs", "category": "intermediate" },
    { "id": "cotton", "name": "Cotton", "category": "crop" },
    { "id": "cotton_fabric", "name": "Cotton Fabric", "category": "intermediate" },
    { "id": "fur_coats", "name": "Fur Coats", "category": "goods" },
    { "id": "sewing_machines", "name": "Sewing Machines", "category": "goods" },
    { "id": "glasses", "name": "Glasses", "category": "goods" },
    { "id": "pocket_watches", "name": "Pocket Watches", "category": "goods" },
    { "id": "brass", "name": "Brass", "category": "intermediate" },
    { "id": "copper", "name": "Copper", "category": "intermediate" },
    { "id": "zinc", "name": "Zinc", "category": "intermediate" },
    { "id": "filaments", "name": "Filaments", "category": "intermediate" },
    { "id": "light_bulbs", "name": "Light Bulbs", "category": "goods" },
    { "id": "caoutchouc", "name": "Caoutchouc", "category": "intermediate" },
    { "id": "penny_farthings", "name": "Penny Farthings", "category": "goods" },
    { "id": "steam_motors", "name": "Steam Motors", "category": "intermediate" }
  ],
  "buildings": [
    {
      "id": "lumberjacks_hut", "name": "Lumberjack's Hut", "region": "Old World", "tier": "Farmers", "category": "forestry",
      "requiresElectricity": false, "baseCycleSeconds": 15, "footprint": null,
      "inputs": [], "output": { "good": "timber", "perMin": 4 }, "outputPerMin": 4
    },
    {
      "id": "fishery", "name": "Fishery", "region": "Old World", "tier": "Farmers", "category": "food",
      "requiresElectricity": false, "baseCycleSeconds": 30, "footprint": null,
      "inputs": [], "output": { "good": "fish", "perMin": 2 }, "outputPerMin": 2
    },
    {
      "id": "potato_farm", "name": "Potato Farm", "region": "Old World", "tier": "Farmers", "category": "farm",
      "requiresElectricity": false, "baseCycleSeconds": 30, "footprint": null,
      "inputs": [], "output": { "good": "potatoes", "perMin": 2 }, "outputPerMin": 2
    },
    {
      "id": "schnapps_distillery", "name": "Schnapps Distillery", "region": "Old World", "tier": "Farmers", "category": "factory",
      "requiresElectricity": false, "baseCycleSeconds": 30, "footprint": null,
      "inputs": [ { "good": "potatoes", "perMin": 2 } ], "output": { "good": "schnapps", "perMin": 2 }, "outputPerMin": 2
    },
    {
      "id": "sheep_farm", "name": "Sheep Farm", "region": "Old World", "tier": "Farmers", "category": "farm",
      "requiresElectricity": false, "baseCycleSeconds": 30, "footprint": null,
      "inputs": [], "output": { "good": "wool", "perMin": 2 }, "outputPerMin": 2
    },
    {
      "id": "framework_knitters", "name": "Framework Knitters", "region": "Old World", "tier": "Farmers", "category": "factory",
      "requiresElectricity": false, "baseCycleSeconds": 30, "footprint": null,
      "inputs": [ { "good": "wool", "perMin": 2 } ], "output": { "good": "work_clothes", "perMin": 2 }, "outputPerMin": 2
    },
    {
      "id": "clay_pit", "name": "Clay Pit", "region": "Old World", "tier": "Workers", "category": "extractor",
      "requiresElectricity": false, "baseCycleSeconds": 30, "footprint": null,
      "inputs": [], "output": { "good": "clay", "perMin": 2 }, "outputPerMin": 2
    },
    {
      "id": "brick_factory", "name": "Brick Factory", "region": "Old World", "tier": "Workers", "category": "factory",
      "requiresElectricity": false, "baseCycleSeconds": 30, "footprint": null,
      "inputs": [ { "good": "clay", "perMin": 2 } ], "output": { "good": "bricks", "perMin": 2 }, "outputPerMin": 2
    },
    {
      "id": "pig_farm", "name": "Pig Farm", "region": "Old World", "tier": "Workers", "category": "farm",
      "requiresElectricity": false, "baseCycleSeconds": 30, "footprint": null,
      "inputs": [], "output": { "good": "pigs", "perMin": 2 }, "outputPerMin": 2
    },
    {
      "id": "slaughterhouse", "name": "Slaughterhouse", "region": "Old World", "tier": "Workers", "category": "factory",
      "requiresElectricity": false, "baseCycleSeconds": 30, "footprint": null,
      "inputs": [ { "good": "pigs", "perMin": 2 } ], "output": { "good": "sausages", "perMin": 2 }, "outputPerMin": 2
    },
    {
      "id": "grain_farm", "name": "Grain Farm", "region": "Old World", "tier": "Workers", "category": "farm",
      "requiresElectricity": false, "baseCycleSeconds": 30, "footprint": null,
      "inputs": [], "output": { "good": "grain", "perMin": 2 }, "outputPerMin": 2
    },
    {
      "id": "flour_mill", "name": "Flour Mill", "region": "Old World", "tier": "Workers", "category": "factory",
      "requiresElectricity": false, "baseCycleSeconds": 30, "footprint": null,
      "inputs": [ { "good": "grain", "perMin": 2 } ], "output": { "good": "flour", "perMin": 2 }, "outputPerMin": 2
    },
    {
      "id": "bakery", "name": "Bakery", "region": "Old World", "tier": "Workers", "category": "factory",
      "requiresElectricity": false, "baseCycleSeconds": 60, "footprint": null,
      "inputs": [ { "good": "flour", "perMin": 1 } ], "output": { "good": "bread", "perMin": 1 }, "outputPerMin": 1
    },
    {
      "id": "rendering_works", "name": "Rendering Works", "region": "Old World", "tier": "Workers", "category": "factory",
      "requiresElectricity": false, "baseCycleSeconds": 60, "footprint": null, "verify": true,
      "inputs": [], "output": { "good": "tallow", "perMin": 1 }, "outputPerMin": 1
    },
    {
      "id": "soap_factory", "name": "Soap Factory", "region": "Old World", "tier": "Workers", "category": "factory",
      "requiresElectricity": false, "baseCycleSeconds": 30, "footprint": null,
      "inputs": [ { "good": "tallow", "perMin": 2 } ], "output": { "good": "soap", "perMin": 2 }, "outputPerMin": 2
    },
    {
      "id": "iron_mine", "name": "Iron Mine", "region": "Old World", "tier": "Workers", "category": "mine",
      "requiresElectricity": false, "baseCycleSeconds": 15, "footprint": null,
      "inputs": [], "output": { "good": "iron", "perMin": 4 }, "outputPerMin": 4
    },
    {
      "id": "coal_mine", "name": "Coal Mine", "region": "Old World", "tier": "Workers", "category": "mine",
      "requiresElectricity": false, "baseCycleSeconds": 15, "footprint": null,
      "inputs": [], "output": { "good": "coal", "perMin": 4 }, "outputPerMin": 4
    },
    {
      "id": "charcoal_kiln", "name": "Charcoal Kiln", "region": "Old World", "tier": "Workers", "category": "factory",
      "requiresElectricity": false, "baseCycleSeconds": 30, "footprint": null,
      "inputs": [], "output": { "good": "coal", "perMin": 2 }, "outputPerMin": 2
    },
    {
      "id": "furnace", "name": "Furnace", "region": "Old World", "tier": "Workers", "category": "factory",
      "requiresElectricity": false, "baseCycleSeconds": 30, "footprint": null,
      "inputs": [ { "good": "iron", "perMin": 2 }, { "good": "coal", "perMin": 2 } ], "output": { "good": "steel", "perMin": 2 }, "outputPerMin": 2
    },
    {
      "id": "steelworks", "name": "Steelworks", "region": "Old World", "tier": "Workers", "category": "factory",
      "requiresElectricity": false, "baseCycleSeconds": 45, "footprint": null,
      "inputs": [ { "good": "steel", "perMin": 1.33 } ], "output": { "good": "steel_beams", "perMin": 1.33 }, "outputPerMin": 1.33
    },
    {
      "id": "weapons_factory", "name": "Weapons Factory", "region": "Old World", "tier": "Workers", "category": "factory",
      "requiresElectricity": false, "baseCycleSeconds": 90, "footprint": null,
      "inputs": [ { "good": "steel", "perMin": 0.67 } ], "output": { "good": "weapons", "perMin": 0.67 }, "outputPerMin": 0.67,
      "note": "1 Furnace (2 t/min steel) = 1 Steelworks (1.33) + 1 Weapons Factory (0.67)"
    },
    {
      "id": "hops_farm", "name": "Hops Farm", "region": "Old World", "tier": "Workers", "category": "farm",
      "requiresElectricity": false, "baseCycleSeconds": 60, "footprint": null, "verify": true,
      "inputs": [], "output": { "good": "hops", "perMin": 1 }, "outputPerMin": 1
    },
    {
      "id": "malthouse", "name": "Malthouse", "region": "Old World", "tier": "Workers", "category": "factory",
      "requiresElectricity": false, "baseCycleSeconds": 30, "footprint": null, "verify": true,
      "inputs": [ { "good": "grain", "perMin": 2 } ], "output": { "good": "malt", "perMin": 2 }, "outputPerMin": 2
    },
    {
      "id": "brewery", "name": "Brewery", "region": "Old World", "tier": "Workers", "category": "factory",
      "requiresElectricity": false, "baseCycleSeconds": 60, "footprint": null, "verify": true,
      "inputs": [ { "good": "malt", "perMin": 1 }, { "good": "hops", "perMin": 1 } ], "output": { "good": "beer", "perMin": 1 }, "outputPerMin": 1
    },
    {
      "id": "sailmakers", "name": "Sailmakers", "region": "Old World", "tier": "Workers", "category": "factory",
      "requiresElectricity": false, "baseCycleSeconds": 30, "footprint": null, "verify": true,
      "inputs": [ { "good": "wool", "perMin": 2 } ], "output": { "good": "sails", "perMin": 2 }, "outputPerMin": 2,
      "note": "Confirm input good (wool vs cotton fabric) and cycle time in-game"
    },
    {
      "id": "artisanal_kitchen", "name": "Artisanal Kitchen", "region": "Old World", "tier": "Artisans", "category": "factory",
      "requiresElectricity": false, "baseCycleSeconds": 120, "footprint": null, "verify": true,
      "inputs": [ { "good": "red_peppers", "perMin": 0.5 }, { "good": "cattle", "perMin": 0.5 } ], "output": { "good": "goulash", "perMin": 0.5 }, "outputPerMin": 0.5,
      "note": "Inputs red_peppers + cattle are New World goods (add to goods list when extending)"
    },
    {
      "id": "cannery", "name": "Cannery", "region": "Old World", "tier": "Artisans", "category": "factory",
      "requiresElectricity": false, "baseCycleSeconds": 90, "footprint": null,
      "inputs": [ { "good": "goulash", "perMin": 0.67 }, { "good": "iron", "perMin": 0.67 } ], "output": { "good": "canned_food", "perMin": 0.67 }, "outputPerMin": 0.67
    },
    {
      "id": "hunting_cabin", "name": "Hunting Cabin", "region": "Old World", "tier": "Artisans", "category": "extractor",
      "requiresElectricity": false, "baseCycleSeconds": 60, "footprint": null,
      "inputs": [], "output": { "good": "furs", "perMin": 1 }, "outputPerMin": 1
    },
    {
      "id": "cotton_mill", "name": "Cotton Mill", "region": "Old World", "tier": "Artisans", "category": "factory",
      "requiresElectricity": false, "baseCycleSeconds": 30, "footprint": null,
      "inputs": [ { "good": "cotton", "perMin": 2 } ], "output": { "good": "cotton_fabric", "perMin": 2 }, "outputPerMin": 2,
      "note": "Cotton comes from a New World Cotton Plantation"
    },
    {
      "id": "fur_dealer", "name": "Fur Dealer", "region": "Old World", "tier": "Artisans", "category": "factory",
      "requiresElectricity": false, "baseCycleSeconds": 30, "footprint": null,
      "inputs": [ { "good": "furs", "perMin": 2 }, { "good": "cotton_fabric", "perMin": 2 } ], "output": { "good": "fur_coats", "perMin": 2 }, "outputPerMin": 2
    },
    {
      "id": "sewing_machine_factory", "name": "Sewing Machine Factory", "region": "Old World", "tier": "Artisans", "category": "factory",
      "requiresElectricity": false, "baseCycleSeconds": 30, "footprint": null, "verify": true,
      "inputs": [ { "good": "steel", "perMin": 2 }, { "good": "timber", "perMin": 2 } ], "output": { "good": "sewing_machines", "perMin": 2 }, "outputPerMin": 2
    },
    {
      "id": "glassworks", "name": "Glassworks (Glassmakers)", "region": "Old World", "tier": "Artisans", "category": "factory",
      "requiresElectricity": false, "baseCycleSeconds": 30, "footprint": null, "verify": true,
      "inputs": [ { "good": "quartz_sand", "perMin": 2 } ], "output": { "good": "glass", "perMin": 2 }, "outputPerMin": 2,
      "note": "Confirm whether base recipe is sand->glass->windows (2 buildings) or sand->windows (1)"
    },
    {
      "id": "window_makers", "name": "Window Makers", "region": "Old World", "tier": "Artisans", "category": "factory",
      "requiresElectricity": false, "baseCycleSeconds": 30, "footprint": null, "verify": true,
      "inputs": [ { "good": "glass", "perMin": 2 } ], "output": { "good": "windows", "perMin": 2 }, "outputPerMin": 2
    }
  ],
  "extend": {
    "note": "Add the following with verified cycle times when ready",
    "engineers": ["reinforced_concrete (cement<-limestone)", "glasses", "pocket_watches (brass<-copper+zinc)", "light_bulbs (filaments)", "penny_farthings (steam_motors + caoutchouc)", "steam_motors"],
    "newWorld": ["rum (sugar_cane + timber)", "cigars (tobacco)", "chocolate (cocoa + sugar)", "coffee", "cotton", "sugar", "red_peppers", "cattle"],
    "arctic": ["oil/gas, seal_oil, goose_feathers, fur_coats variants"],
    "enbesa": ["sanga_cattle (hides), wanza_timber, leather_boots, tailored_suits"]
  }
}
```

## Quick worked example

To make **0.67 t/min Steel Beams** + **0.67 t/min Weapons**: Steelworks demand 0.67 steel, Weapons demand 0.67 steel → 1.34 t/min steel total → ~0.67 Furnace... but for whole buildings use the ratio **1 Furnace : 1 Steelworks : 1 Weapons Factory** (the leftover steel above 1 Steelworks' draw is what feeds the Weapons Factory). Steel feeds: 1 Furnace ← 1 Iron Mine (½ of its output) + 1 Coal/Charcoal source.