# Catalog Build — Reconciliation Report

Generated: 2026-06-03T06:33:27.201Z

## Summary

| | Count |
|---|---|
| Catalog buildings (input) | 156 |
| Chain buildings (input) | 35 |
| Matched (catalog → chain) | 34 |
| Unmatched catalog (non-producing) | 122 |
| Orphan chain entries | 1 |
| Output families | 133 |
| Output variants | 156 |
| Multi-variant families | 7 |

## Matched Buildings (catalog → chain)

| Catalog Name | Catalog ID | Chain ID | Verify |
|---|---|---|---|
| Grain Farm | `agriculture-01-grain-farm` | `grain_farm` | ✅ |
| Cattle Farm | `agriculture-02-cattle-farm` | `cattle_farm` | ⚠️ verify |
| Hop Farm | `agriculture-03-hop-farm` | `hops_farm` | ⚠️ verify |
| Potato Farm | `agriculture-04-potato-farm` | `potato_farm` | ✅ |
| Lumberjack's Hut | `agriculture-05-timber-yard` | `lumberjacks_hut` | ✅ |
| Sheep Farm | `agriculture-06-sheep-farm` | `sheep_farm` | ✅ |
| Pig Farm | `agriculture-08-pig-farm` | `pig_farm` | ✅ |
| Hunting Cabin | `agriculture-09-hunter-s-cabin` | `hunting_cabin` | ✅ |
| Red Pepper Farm | `agriculture-11-bell-pepper-farm` | `bell_pepper_farm` | ⚠️ verify |
| Fishery | `coastal-01-fish-coast-building` | `fishery` | ✅ |
| Soap Factory | `factory-02-soap-factory` | `soap_factory` | ✅ |
| Brick Factory | `factory-04-brick-factory` | `brick_factory` | ✅ |
| Fur Dealer | `factory-05-fur-coat-workshop` | `fur_dealer` | ✅ |
| Window Makers | `factory-07-window-factory` | `window_makers` | ⚠️ verify |
| Sailmakers | `factory-09-sailcloth-factory` | `sailmakers` | ⚠️ verify |
| Clay Pit | `factory-11-clay-pit` | `clay_pit` | ✅ |
| Bakery | `food-01-bread-maker` | `bakery` | ✅ |
| Brewery | `food-02-beer-maker` | `brewery` | ⚠️ verify |
| Artisanal Kitchen | `food-03-goulash-factory` | `artisanal_kitchen` | ⚠️ verify |
| Cannery | `food-05-canned-food-factory` | `cannery` | ✅ |
| Schnapps Distillery | `food-06-schnapps-maker` | `schnapps_distillery` | ✅ |
| Slaughterhouse | `food-07-sausage-maker` | `slaughterhouse` | ✅ |
| Steelworks | `heavy-01-beams-heavy-industry` | `steelworks` | ✅ |
| Furnace | `heavy-02-steel-heavy-industry` | `furnace` | ✅ |
| Charcoal Kiln | `heavy-03-coal-heavy-industry` | `charcoal_kiln` | ✅ |
| Weapon Factory | `heavy-04-weapons-heavy-industry` | `weapons_factory` | ✅ |
| Coal Mine | `mining-01-coal-mine` | `coal_mine` | ✅ |
| Iron Mine | `mining-02-iron-mine` | `iron_mine` | ✅ |
| Rendering Works | `processing-01-tallow-processing` | `rendering_works` | ⚠️ verify |
| Flour Mill | `processing-02-flour-processing` | `flour_mill` | ✅ |
| Malthouse | `processing-03-malt-processing` | `malthouse` | ⚠️ verify |
| Framework Knitters | `processing-04-weavery` | `framework_knitters` | ✅ |
| Glassmakers | `processing-06-glass-processing` | `glassworks` | ⚠️ verify |
| Sewing Machine Factory | `workshop-03-sewing-machines-factory` | `sewing_machine_factory` | ⚠️ verify |

## Multi-Variant Families

| Family ID | Name | Variants | Category |
|---|---|---|---|
| `1-old-world-residence` | Residence | Farmer Residence, Worker Residence, Artisan Residence, Engineer Residence, Investor Residence, Scholar Residence | residence |
| `shipyards-shipyard` | Shipyard | Sailing Shipyard, Steam Shipyard | infrastructure |
| `military-flame-tower` | Flame Tower | Flame Tower, Flame Tower | infrastructure |
| `military-anti-armour-gun` | Anti-Armour Gun | Anti-Armour Gun, Anti-Armour Gun, Anti-Armour Gun, Anti-Armour Gun | infrastructure |
| `general-small-warehouse` | Small Warehouse | Small Warehouse (Farmers), Small Warehouse (Workers), Small Warehouse (Artisans), Small Warehouse (Engineers), Small Warehouse (Investors) | production |
| `military-flak-emplacement` | Flak Emplacement | Flak Emplacement, Flak Emplacement, Flak Emplacement | infrastructure |
| `skyscraper` | Skyscraper | Skyscraper (T4 I), Skyscraper (T4 II), Skyscraper (T4 III), Skyscraper (T5 I), Skyscraper (T5 II), Skyscraper (T5 III), Skyscraper (T5 IV), Skyscraper (T5 V) | residence |

## Category Assignment Edge Calls

- Trade Union (guild-house): cat=public → public_service (buff-radius building)
- Town Hall (town-hall): cat=public → public_service (buff-radius building)
- Gas-Fired Power Plant (electricity-03-gas-power-plant): cat=public → public_service (radius is primary function)
- Oil Power Plant (electricity-02-oil-power-plant): cat=public → public_service (radius is primary function)
- Local Department (palace-ministry): cat=public → public_service (buff-radius building)

| Old Category | New Category | Count |
|---|---|---|
| residence | residence | 14 |
| production | production | 86 |
| public | public_service | 26 |
| harbor | infrastructure | 30 |

## Unmatched Catalog Buildings (non-producing — expected)

- `dockland-main` — Docklands Main Wharf (harbor)
- `residence-old-world` — Farmer Residence (residence)
- `residence-tier02` — Worker Residence (residence)
- `residence-tier03` — Artisan Residence (residence)
- `residence-tier04` — Engineer Residence (residence)
- `residence-tier05` — Investor Residence (residence)
- `guild-house` — Trade Union (public)
- `town-hall` — Town Hall (public)
- `harbor-office` — Harbourmaster's Office (harbor)
- `kontor-imperial-01` — Small Trading Post (harbor)
- `harbor-01-depot` — Depot (harbor)
- `harbor-02-sailing-shipyard` — Sailing Shipyard (harbor)
- `harbor-03-steam-shipyard` — Steam Shipyard (harbor)
- `harbor-04-tower-01-puckle-gun` — Mounted Guns (harbor)
- `harbor-05-tower-02-cannon-tower` — Cannon Tower (harbor)
- `harbor-17-tower-04-fire-tower` — Flame Tower (harbor)
- `harbor-18-tower-06-armor-pierce-tower` — Anti-Armour Gun (harbor)
- `harbor-06-tower-03-monster-gun` — Big Betty (harbor)
- `harbor-07-repair-crane` — Repair Crane (harbor)
- `harbor-08-pier` — Pier (harbor)
- `harbor-09-tourism-pier-01` — Public Mooring (harbor)
- `harbor-14a-oil-harbor-i` — Small Oil Harbour (harbor)
- `harbor-15-oil-storage` — Oil Store (harbor)
- `harbor-16-commuter-pier` — Commuter Pier (harbor)
- `harbor-colony01-17-tower-03-fire-tower` — Flame Tower (harbor)
- `harbor-colony01-18-tower-06-armor-pierce-tower` — Anti-Armour Gun (harbor)
- `electricity-03-gas-power-plant` — Gas-Fired Power Plant (public)
- `harbor-arctic18-tower-06-armor-pierce-tower` — Anti-Armour Gun (harbor)
- `palace` — Palace (public)
- `dockland-module-pier` — Pier (harbor)
- `dockland-module-item` — Harbourmaster (harbor)
- `dockland-module-export` — Exports Office (harbor)
- `dockland-module-storage` — Depot (harbor)
- `dockland-module-repaircrane` — Repair Crane (harbor)
- `dockland-module-speedup` — Loading Wharf (harbor)
- `farm-fertilizer-module-moderate` — Fertiliser Silo (production)
- `agriculture-10-vineyard` — Vineyard (production)
- `coastal-02-niter-coast-building` — Saltpetre Works (production)
- `coastal-03-quartz-sand-coast-building` — Sand Mine (production)
- `factory-01-concrete-factory` — Concrete Factory (production)
- `factory-03-timber-factory` — Sawmill (production)
- `factory-06-light-bulb-factory` — Light Bulb Factory (production)
- `factory-10-chassis-factory` — Coachmakers (production)
- `food-08-champagne-maker` — Champagne Cellar (production)
- `heavy-06-advanced-weapons-heavy-industry` — Heavy Weapons Factory (production)
- `heavy-07-steam-motors-heavy-industry` — Motor Assembly Line (production)
- `heavy-08-steam-carriages-heavy-industry` — Cab Assembly Line (production)
- `heavy-09-brass-heavy-industry` — Brass Smeltery (production)
- `heavy-10-oil-heavy-industry` — Oil Refinery (production)
- `mining-04-zinc-mine` — Zinc Mine (production)
- `mining-05-copper-mine` — Copper Mine (production)
- `mining-06-cement-mine` — Limestone Quarry (production)
- `mining-08-gold-ore-mine` — Gold Mine (production)
- `processing-05-dynamite-processing` — Dynamite Factory (production)
- `processing-07-inlay-processing` — Marquetry Workshop (production)
- `processing-08-carbon-filament-processing` — Filament Factory (production)
- `workshop-01-high-wheeler-workshop` — Bicycle Factory (production)
- `workshop-02-pocket-watch-workshop` — Clockmakers (production)
- `workshop-04-phonographs-workshop` — Gramophone Factory (production)
- `workshop-05-gold-workshop` — Goldsmiths (production)
- `workshop-06-jewelry-workshop` — Jewellers (production)
- `workshop-07-glasses-workshop` — Spectacle Factory (production)
- `agriculture-01-field-grain-field` — Grain Field (production)
- `agriculture-02-field-pasture` — Pasture (production)
- `agriculture-03-field-hop-field` — Hop Field (production)
- `agriculture-04-field-potato-field` — Potato Field (production)
- `agriculture-06-field-sheepfold` — Sheepfold (production)
- `agriculture-08-field-pig-sty` — Pig Sty (production)
- `agriculture-10-field-vines` — Vines (production)
- `agriculture-11-field-pepper-field` — Pepper Crop (production)
- `heavy-10-field-oil-pump` — Oil Well (production)
- `service-01-pub` — Pub (public)
- `service-02-school` — School (public)
- `service-03-bank` — Bank (public)
- `service-04-church` — Church (public)
- `service-05-cabaret` — Variety Theatre (public)
- `service-07-university` — University (public)
- `service-09-club-house` — Members Club (public)
- `institution-01-police` — Police Station (public)
- `institution-02-fire-department` — Fire Station (public)
- `institution-03-hospital` — Hospital (public)
- `logistic-01-marketplace` — Marketplace (public)
- `logistic-02-warehouse-farmers` — Small Warehouse (Farmers) (production)
- `electricity-02-oil-power-plant` — Oil Power Plant (public)
- `palace-module-01-straight` — Palace Wing (public)
- `palace-module-02-angle` — Palace Wing - Corner (public)
- `palace-module-03-crossing` — Palace Wing - Cross (public)
- `palace-module-04-end` — Palace Wing - End (public)
- `palace-module-05-gate` — Palace Wing - Gate (public)
- `palace-module-06-junction` — Palace Wing - Junction (public)
- `palace-ministry` — Local Department (public)
- `moderate-fuel-station-01-fuelstation` — Fuel Station (production)
- `tractor-module-01-tractor` — Tractor Barn (production)
- `silo-grain` — Silo (production)
- `harbor-colony02-18-tower-06-armor-pierce-tower` — Anti-Armour Gun (harbor)
- `residence-tier05b` — Scholar Residence (residence)
- `harbor-18-tower-05-flak` — Flak Emplacement (harbor)
- `airship-landing-platform` — Airship Platform (public)
- `platform-module-item-storage` — Item Transfer Depot (production)
- `platform-module-post` — Airmail Sorting Office (production)
- `post-office` — Post Office (public)
- `post-box` — Post Box (public)
- `multifactory-magazin-dropgoods-moderate-blank` — Supply Factory (production)
- `multifactory-magazin-dropgoods-moderate-bombs` — Bomb Factory (production)
- `multifactory-magazin-dropgoods-moderate-seamines` — Sea Mine Factory (production)
- `multifactory-magazin-dropgoods-moderate-flyers` — Pamphlet Printer (production)
- `multifactory-magazin-dropgoods-moderate-care-packages` — Care Package Factory (production)
- `multifactory-magazin-dropgoods-moderate-waterdrop` — Water Drop Factory (production)
- `harbor-18-colony01-tower-05-flak` — Flak Emplacement (harbor)
- `harbor-03-colony02-tower-05-flak` — Flak Emplacement (harbor)
- `logistic-02-warehouse-workers` — Small Warehouse (Workers) (production)
- `logistic-02-warehouse-artisans` — Small Warehouse (Artisans) (production)
- `logistic-02-warehouse-engineers` — Small Warehouse (Engineers) (production)
- `logistic-02-warehouse-investors` — Small Warehouse (Investors) (production)
- `a7-residence-skyscraper-4lvl1` — Skyscraper (T4 I) (residence)
- `a7-residence-skyscraper-4lvl2` — Skyscraper (T4 II) (residence)
- `a7-residence-skyscraper-4lvl3` — Skyscraper (T4 III) (residence)
- `a7-residence-skyscraper-5lvl1` — Skyscraper (T5 I) (residence)
- `a7-residence-skyscraper-5lvl2` — Skyscraper (T5 II) (residence)
- `a7-residence-skyscraper-5lvl3` — Skyscraper (T5 III) (residence)
- `a7-residence-skyscraper-5lvl4` — Skyscraper (T5 IV) (residence)
- `a7-residence-skyscraper-5lvl5` — Skyscraper (T5 V) (residence)

## Orphan Chain Entries

- `cotton_mill` — Cotton Mill
