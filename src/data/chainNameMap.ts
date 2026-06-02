import type { ChainBuilding, ChainGood } from '../types/productionChain'
import rawChains from './production-chains.json'

const chains = rawChains as { goods: ChainGood[]; buildings: ChainBuilding[] }

// Maps catalog building name → chain building id
// Chain name is authoritative for math; catalog name is what users see in the palette.
// When chain name ≠ catalog name the entry uses the catalog name as the key.
const NAME_TO_CHAIN_ID: Record<string, string> = {
  // Farmers tier
  "Lumberjack's Hut":      'lumberjacks_hut',
  'Fishery':               'fishery',
  'Potato Farm':           'potato_farm',
  'Schnapps Distillery':   'schnapps_distillery',
  'Sheep Farm':            'sheep_farm',
  'Framework Knitters':    'framework_knitters',
  // Workers tier
  'Clay Pit':              'clay_pit',
  'Brick Factory':         'brick_factory',
  'Pig Farm':              'pig_farm',
  'Slaughterhouse':        'slaughterhouse',
  'Grain Farm':            'grain_farm',
  'Flour Mill':            'flour_mill',
  'Bakery':                'bakery',
  'Rendering Works':       'rendering_works',
  'Soap Factory':          'soap_factory',
  'Iron Mine':             'iron_mine',
  'Coal Mine':             'coal_mine',
  'Charcoal Kiln':         'charcoal_kiln',
  'Furnace':               'furnace',
  'Steelworks':            'steelworks',
  'Weapon Factory':        'weapons_factory', // catalog omits the 's'
  'Hop Farm':              'hops_farm',        // catalog is singular
  'Malthouse':             'malthouse',
  'Brewery':               'brewery',
  'Sailmakers':            'sailmakers',
  // Artisans tier
  'Cattle Farm':           'cattle_farm',
  'Red Pepper Farm':       'bell_pepper_farm',
  'Artisanal Kitchen':     'artisanal_kitchen',
  'Cannery':               'cannery',
  'Hunting Cabin':         'hunting_cabin',
  'Fur Dealer':            'fur_dealer',
  'Sewing Machine Factory':'sewing_machine_factory',
  'Glassmakers':           'glassworks',       // chain uses "Glassworks (Glassmakers)"
  'Window Makers':         'window_makers',
  // Cotton Mill has no catalog building (New World crop source) — omitted intentionally
}

export const CHAIN_NAME_MAP = new Map<string, string>(Object.entries(NAME_TO_CHAIN_ID))

export const CHAIN_BUILDING_MAP = new Map<string, ChainBuilding>(
  chains.buildings.map(b => [b.id, b])
)

export const GOODS_MAP = new Map<string, ChainGood>(
  chains.goods.map(g => [g.id, g])
)
