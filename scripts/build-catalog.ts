#!/usr/bin/env tsx
/**
 * scripts/build-catalog.ts
 *
 * Produces src/data/building-catalog.json (BuildingFamily[]) by auditing,
 * categorising, grouping, and merging:
 *   - src/data/buildings-1800.json   (156 buildings — footprints, icons, groups)
 *   - src/data/production-chains.json (35 chain buildings — recipes, workforce)
 *
 * Also writes docs/reconciliation-report.md.
 * Archives source files to src/data/archive/ (does NOT delete them — deletion
 * happens only after the test suite passes, per plan).
 *
 * Run: npx tsx scripts/build-catalog.ts
 */

import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')

// ── Inline types (script is standalone — no src/ imports) ──────────────────

type BuildingCategory = 'residence' | 'production' | 'public_service' | 'infrastructure'
type Region = 'old_world' | 'new_world' | 'arctic' | 'enbesa'

interface ProductionStats {
  requiresElectricity: boolean
  baseCycleSeconds: number
  output: { good: string; perMin: number }
  inputs: { good: string; perMin: number }[]
  workforce?: { tier: string; count: number }[]
  verify?: boolean
}

interface BuildingVariant {
  id: string
  name: string
  iconFile?: string
  footprint: { w: number; h: number }
  tier?: string
  order: number
  overlayType?: string
  workRadius?: number
  influenceRadius?: number
  roadRequired?: boolean
  production?: ProductionStats
}

interface BuildingFamily {
  id: string
  name: string
  category: BuildingCategory
  region: Region
  dlc?: string
  defaultVariantId: string
  variants: BuildingVariant[]
}

// ── Source types ────────────────────────────────────────────────────────────

interface OldBuilding {
  id: string
  name: string
  tier: string
  footprint: { w: number; h: number }
  category: string
  color: string
  group?: string
  iconFile?: string
  influenceRadius?: number
  workRadius?: number
  overlayType?: string
  roadRequired?: boolean
  dlc?: string
}

interface ChainBuilding {
  id: string
  name: string
  region: string
  tier: string
  requiresElectricity: boolean
  baseCycleSeconds: number
  outputPerMin: number
  inputs: { good: string; perMin: number }[]
  output: { good: string; perMin: number }
  workforce?: { tier: string; count: number }[]
  verify?: boolean
}

// ── Name → chain-id map (from src/data/chainNameMap.ts) ────────────────────

const NAME_TO_CHAIN_ID: Record<string, string> = {
  "Lumberjack's Hut":       'lumberjacks_hut',
  'Fishery':                'fishery',
  'Potato Farm':            'potato_farm',
  'Schnapps Distillery':    'schnapps_distillery',
  'Sheep Farm':             'sheep_farm',
  'Framework Knitters':     'framework_knitters',
  'Clay Pit':               'clay_pit',
  'Brick Factory':          'brick_factory',
  'Pig Farm':               'pig_farm',
  'Slaughterhouse':         'slaughterhouse',
  'Grain Farm':             'grain_farm',
  'Flour Mill':             'flour_mill',
  'Bakery':                 'bakery',
  'Rendering Works':        'rendering_works',
  'Soap Factory':           'soap_factory',
  'Iron Mine':              'iron_mine',
  'Coal Mine':              'coal_mine',
  'Charcoal Kiln':          'charcoal_kiln',
  'Furnace':                'furnace',
  'Steelworks':             'steelworks',
  'Weapon Factory':         'weapons_factory',
  'Hop Farm':               'hops_farm',
  'Malthouse':              'malthouse',
  'Brewery':                'brewery',
  'Sailmakers':             'sailmakers',
  'Cattle Farm':            'cattle_farm',
  'Red Pepper Farm':        'bell_pepper_farm',
  'Artisanal Kitchen':      'artisanal_kitchen',
  'Cannery':                'cannery',
  'Hunting Cabin':          'hunting_cabin',
  'Fur Dealer':             'fur_dealer',
  'Sewing Machine Factory': 'sewing_machine_factory',
  'Glassmakers':            'glassworks',
  'Window Makers':          'window_makers',
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const TIER_ORDER: Record<string, number> = {
  farmers: 0, workers: 1, artisans: 2, engineers: 3, investors: 4,
  scholars: 5, jornaleros: 6, obreros: 7, shepherds: 8, explorers: 9,
  elders: 10, harbor: 11, all: 12,
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Strip tier-word prefixes and variant suffixes to find a shared base name. */
function getBaseName(name: string): string {
  return name
    .replace(/^(Farmer|Worker|Artisan|Engineer|Investor|Scholar)\s+/i, '')
    .replace(/^(Sailing|Steam)\s+/i, '')
    .replace(/\s+\((Farmers|Workers|Artisans|Engineers|Investors|Scholars)\)\s*$/i, '')
    .replace(/\s+\(T\d+\s+[IVX]+\)\s*$/i, '')
    .trim()
}

const ROMAN: Record<string, number> = { I: 0, II: 1, III: 2, IV: 3, V: 4, VI: 5 }

/** Extract 0-based level from Skyscraper names like "(T4 I)" → tier*10 + level */
function skyscraperOrder(name: string): number {
  const m = name.match(/\(T(\d+)\s+([IVX]+)\)/)
  if (!m) return 0
  const tierNum = parseInt(m[1], 10) - 4  // T4 → 0, T5 → 1
  const level = ROMAN[m[2]] ?? 0
  return tierNum * 10 + level
}

function mapCategory(oldCat: string): BuildingCategory {
  switch (oldCat) {
    case 'residence':  return 'residence'
    case 'production': return 'production'
    case 'public':     return 'public_service'
    case 'harbor':     return 'infrastructure'
    default:           return 'infrastructure'
  }
}

function mapRegion(_b: OldBuilding): Region {
  // All buildings in buildings-1800.json are Old World or DLC (no NW tiers present)
  return 'old_world'
}

// ── Phase A: Load data ───────────────────────────────────────────────────────

const buildings: OldBuilding[] = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'src/data/buildings-1800.json'), 'utf8')
)
const chainData: { buildings: ChainBuilding[] } = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'src/data/production-chains.json'), 'utf8')
)
const chainBuildings = chainData.buildings
const chainById = new Map(chainBuildings.map(c => [c.id, c]))

console.log(`Loaded ${buildings.length} catalog buildings, ${chainBuildings.length} chain buildings`)

// ── Phase A: Match catalog → chain ──────────────────────────────────────────

type MatchBucket = 'matched' | 'unmatched' | 'fuzzy'
const matchResult = new Map<string, { chainId: string; bucket: MatchBucket }>()

for (const b of buildings) {
  const chainId = NAME_TO_CHAIN_ID[b.name]
  if (chainId) {
    matchResult.set(b.id, { chainId, bucket: 'matched' })
  }
  // no fuzzy fallback — unmatched = non-producing (expected)
}

const matched   = buildings.filter(b => matchResult.get(b.id)?.bucket === 'matched')
const unmatched = buildings.filter(b => !matchResult.has(b.id))

// Chain buildings known to have no catalog entry (intentionally excluded).
// cotton_mill: New World crop source — buildings-1800.json is Old World only.
const EXPECTED_ORPHANS = new Set(['cotton_mill'])

const usedChainIds = new Set([...matchResult.values()].map(v => v.chainId))
const allOrphans       = chainBuildings.filter(c => !usedChainIds.has(c.id))
const unexpectedOrphans = allOrphans.filter(c => !EXPECTED_ORPHANS.has(c.id))
const expectedOrphans   = allOrphans.filter(c => EXPECTED_ORPHANS.has(c.id))

console.log(`  Matched:           ${matched.length}`)
console.log(`  Unmatched (non-producing): ${unmatched.length}`)
console.log(`  Orphan chain entries: ${allOrphans.length} (${expectedOrphans.length} expected, ${unexpectedOrphans.length} unexpected)`)

if (unexpectedOrphans.length > 0) {
  console.error('\n❌ UNEXPECTED ORPHAN CHAIN ENTRIES — fix NAME_TO_CHAIN_ID or catalog:')
  for (const o of unexpectedOrphans) console.error(`   ${o.id} (${o.name})`)
  process.exit(1)
}
if (expectedOrphans.length > 0) {
  console.log(`  Expected orphans (excluded from catalog): ${expectedOrphans.map(o => o.id).join(', ')}`)
}

const orphanChain = allOrphans  // for report

// ── Phase B: Category assignment ────────────────────────────────────────────

const categoryMap = new Map<string, BuildingCategory>()
const edgeCalls: string[] = []

for (const b of buildings) {
  const cat = mapCategory(b.category)
  categoryMap.set(b.id, cat)
  // Log any edge calls for the report
  if (b.name === 'Gas-Fired Power Plant' || b.name === 'Oil Power Plant') {
    edgeCalls.push(`${b.name} (${b.id}): cat=public → public_service (radius is primary function)`)
  } else if (b.name === 'Trade Union' || b.name === 'Town Hall' || b.name === 'Local Department') {
    edgeCalls.push(`${b.name} (${b.id}): cat=public → public_service (buff-radius building)`)
  } else if (b.category === 'harbor') {
    // harbor → infrastructure (logged once, not per-building)
  }
}

// ── Phase C: Family grouping ─────────────────────────────────────────────────

// Group by (group, baseName) — buildings sharing both are variant candidates
type FamilyKey = string  // `${group}|${baseName}`

const byFamilyKey = new Map<FamilyKey, OldBuilding[]>()

for (const b of buildings) {
  const group = b.group ?? 'Ungrouped'
  const base  = getBaseName(b.name)
  const key   = `${group}|${base}`
  const arr   = byFamilyKey.get(key) ?? []
  arr.push(b)
  byFamilyKey.set(key, arr)
}

const families: BuildingFamily[] = []

for (const [key, members] of byFamilyKey) {
  const [group, baseName] = key.split('|')
  const isVariantFamily = members.length > 1

  if (!isVariantFamily) {
    // Standalone: family id = building id (stable, matches all existing call sites)
    const b = members[0]
    const variant: BuildingVariant = {
      id:              b.id,
      name:            b.name,
      footprint:       b.footprint,
      order:           0,
      ...(b.iconFile          && { iconFile:         b.iconFile }),
      ...(b.tier              && { tier:             b.tier }),
      ...(b.overlayType       && { overlayType:      b.overlayType }),
      ...(b.workRadius        && { workRadius:       b.workRadius }),
      ...(b.influenceRadius   && { influenceRadius:  b.influenceRadius }),
      ...(b.roadRequired      && { roadRequired:     b.roadRequired }),
    }
    families.push({
      id:               b.id,
      name:             b.name,
      category:         categoryMap.get(b.id)!,
      region:           mapRegion(b),
      defaultVariantId: b.id,
      variants:         [variant],
      ...(b.dlc && { dlc: b.dlc }),
    })
    continue
  }

  // Multi-variant family: sort members, assign order
  const sorted = [...members].sort((a, b_) => {
    // Primary: tier order
    const ta = TIER_ORDER[a.tier] ?? 99
    const tb = TIER_ORDER[b_.tier] ?? 99
    if (ta !== tb) return ta - tb
    // Secondary for Skyscrapers: extract T-level from name
    const isSkyscraper = a.name.includes('Skyscraper')
    if (isSkyscraper) return skyscraperOrder(a.name) - skyscraperOrder(b_.name)
    // Secondary for Shipyards and other same-tier pairs: Sailing < Steam
    if (a.name.includes('Sailing') || a.name.includes('Sail')) return -1
    if (b_.name.includes('Sailing') || b_.name.includes('Sail')) return 1
    return 0
  })

  const variants: BuildingVariant[] = sorted.map((b, idx) => ({
    id:        b.id,
    name:      b.name,
    footprint: b.footprint,
    order:     idx,
    ...(b.iconFile        && { iconFile:        b.iconFile }),
    ...(b.tier            && { tier:            b.tier }),
    ...(b.overlayType     && { overlayType:     b.overlayType }),
    ...(b.workRadius      && { workRadius:      b.workRadius }),
    ...(b.influenceRadius && { influenceRadius: b.influenceRadius }),
    ...(b.roadRequired    && { roadRequired:    b.roadRequired }),
  }))

  // Family id: slugify the group + baseName (if they differ); else just baseName slug
  const familySlug = group === baseName
    ? slugify(baseName)
    : slugify(`${group}-${baseName}`)

  const category = categoryMap.get(sorted[0].id)!
  const region   = mapRegion(sorted[0])
  const dlc      = sorted.find(b => b.dlc)?.dlc

  families.push({
    id:               familySlug,
    name:             baseName,
    category,
    region,
    defaultVariantId: variants[0].id,
    variants,
    ...(dlc && { dlc }),
  })
}

console.log(`\nFamilies created: ${families.length}`)
const multiFamilies = families.filter(f => f.variants.length > 1)
console.log(`  Multi-variant families: ${multiFamilies.length}`)
for (const f of multiFamilies) {
  console.log(`    [${f.id}] "${f.name}" — ${f.variants.length} variants`)
  for (const v of f.variants) console.log(`      order=${v.order} ${v.id} (${v.name})`)
}

// ── Phase D: Merge production data ──────────────────────────────────────────

let mergeCount = 0

for (const family of families) {
  for (const variant of family.variants) {
    const match = matchResult.get(variant.id)
    if (!match) continue
    const chain = chainById.get(match.chainId)
    if (!chain) continue

    variant.production = {
      requiresElectricity: chain.requiresElectricity,
      baseCycleSeconds:    chain.baseCycleSeconds,
      output:              chain.output,
      inputs:              chain.inputs,
      ...(chain.workforce && chain.workforce.length > 0 && { workforce: chain.workforce }),
      ...(chain.verify    && { verify: chain.verify }),
    }
    mergeCount++
  }
}

console.log(`\nProduction data merged onto ${mergeCount} variants`)

// ── Phase D: Furnace regression assertion ────────────────────────────────────

function assertFurnaceChain() {
  const furnaceFamily   = families.find(f => f.variants.some(v => v.id === 'heavy-02-steel-heavy-industry'))
  const steelworksFamily = families.find(f => f.variants.some(v => v.id === 'heavy-01-beams-heavy-industry'))
  const weaponsFamily   = families.find(f => f.variants.some(v => v.id === 'heavy-04-weapons-heavy-industry'))

  if (!furnaceFamily || !steelworksFamily || !weaponsFamily) {
    throw new Error('Furnace regression: could not find one or more buildings in output families')
  }

  const furnace   = furnaceFamily.variants.find(v => v.id === 'heavy-02-steel-heavy-industry')!
  const steelworks = steelworksFamily.variants.find(v => v.id === 'heavy-01-beams-heavy-industry')!
  const weapons   = weaponsFamily.variants.find(v => v.id === 'heavy-04-weapons-heavy-industry')!

  if (!furnace.production)   throw new Error('Furnace has no production data')
  if (!steelworks.production) throw new Error('Steelworks has no production data')
  if (!weapons.production)   throw new Error('Weapon Factory has no production data')

  // Furnace: iron + coal → steel (2/min at baseCycle=30s)
  if (furnace.production.output.good !== 'steel')
    throw new Error(`Furnace output is ${furnace.production.output.good}, expected steel`)
  if (!furnace.production.inputs.find(i => i.good === 'iron'))
    throw new Error('Furnace has no iron input')

  // Steelworks: steel → steel_beams
  if (!steelworks.production.inputs.find(i => i.good === 'steel'))
    throw new Error('Steelworks has no steel input')
  if (steelworks.production.output.good !== 'steel_beams')
    throw new Error(`Steelworks output is ${steelworks.production.output.good}, expected steel_beams`)

  // Weapons Factory: steel → weapons (shares steel supply from Furnace)
  if (!weapons.production.inputs.find(i => i.good === 'steel'))
    throw new Error('Weapons Factory has no steel input')
  if (weapons.production.output.good !== 'weapons')
    throw new Error(`Weapons Factory output is ${weapons.production.output.good}, expected weapons`)

  // Ratio check: 1 Furnace (2/min steel) feeds 1 Steelworks (1.33) + 1 Weapons Factory (0.67)
  const steelOut    = furnace.production.output.perMin
  const steelworks_ = steelworks.production.inputs.find(i => i.good === 'steel')!.perMin
  const weapons_    = weapons.production.inputs.find(i => i.good === 'steel')!.perMin
  const diff = Math.abs(steelOut - (steelworks_ + weapons_))
  if (diff > 0.01)
    throw new Error(`Furnace steel ratio broken: ${steelOut} ≠ ${steelworks_} + ${weapons_}`)

  console.log('\n✅ Furnace regression: Furnace(iron→steel) feeds Steelworks+Weapons; ratio holds')
}

assertFurnaceChain()

// ── Phase E: Validate output ─────────────────────────────────────────────────

const allVariantIds = families.flatMap(f => f.variants.map(v => v.id))
const originalIds   = new Set(buildings.map(b => b.id))
const variantIdSet  = new Set(allVariantIds)

// Zero data loss: every original building id must appear as a variant id
const missingIds = [...originalIds].filter(id => !variantIdSet.has(id))
if (missingIds.length > 0) {
  console.error('\n❌ DATA LOSS: these building ids are missing from output:')
  for (const id of missingIds) console.error(`   ${id}`)
  process.exit(1)
}

// No duplicate family ids
const familyIds = families.map(f => f.id)
const dupFamilyIds = familyIds.filter((id, i) => familyIds.indexOf(id) !== i)
if (dupFamilyIds.length > 0) {
  console.error('\n❌ DUPLICATE family ids:', dupFamilyIds)
  process.exit(1)
}

// No duplicate variant ids
const dupVariantIds = allVariantIds.filter((id, i) => allVariantIds.indexOf(id) !== i)
if (dupVariantIds.length > 0) {
  console.error('\n❌ DUPLICATE variant ids:', dupVariantIds)
  process.exit(1)
}

// Every defaultVariantId resolves
for (const f of families) {
  if (!f.variants.find(v => v.id === f.defaultVariantId)) {
    console.error(`❌ Family "${f.id}" defaultVariantId "${f.defaultVariantId}" not found in variants`)
    process.exit(1)
  }
}

// All chain buildings accounted for
if (mergeCount !== matched.length) {
  console.error(`❌ Expected ${matched.length} merges, got ${mergeCount}`)
  process.exit(1)
}

console.log(`\n✅ All ${buildings.length} building ids preserved as variant ids`)
console.log(`✅ No duplicate family or variant ids`)
console.log(`✅ All defaultVariantIds resolve`)
console.log(`✅ All ${mergeCount} chain buildings merged`)

// ── Phase E: Write output ────────────────────────────────────────────────────

// Sort: region → category → family name
const categoryOrder: BuildingCategory[] = ['residence', 'production', 'public_service', 'infrastructure']
const regionOrder: Region[] = ['old_world', 'new_world', 'arctic', 'enbesa']

families.sort((a, b) => {
  const rDiff = regionOrder.indexOf(a.region) - regionOrder.indexOf(b.region)
  if (rDiff !== 0) return rDiff
  const cDiff = categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category)
  if (cDiff !== 0) return cDiff
  return a.name.localeCompare(b.name)
})

const catalogPath = path.join(ROOT, 'src/data/building-catalog.json')
fs.writeFileSync(catalogPath, JSON.stringify(families, null, 2) + '\n')
console.log(`\n📦 Written: ${catalogPath}`)
console.log(`   ${families.length} families, ${allVariantIds.length} total variants`)

// ── Phase E: Archive source files ────────────────────────────────────────────

const archiveDir = path.join(ROOT, 'src/data/archive')
fs.mkdirSync(archiveDir, { recursive: true })

for (const src of ['buildings-1800.json', 'production-chains.json']) {
  const from = path.join(ROOT, 'src/data', src)
  const to   = path.join(archiveDir, src)
  fs.copyFileSync(from, to)
  console.log(`📁 Archived: src/data/archive/${src}`)
}

// ── Write reconciliation report ──────────────────────────────────────────────

const report = `# Catalog Build — Reconciliation Report

Generated: ${new Date().toISOString()}

## Summary

| | Count |
|---|---|
| Catalog buildings (input) | ${buildings.length} |
| Chain buildings (input) | ${chainBuildings.length} |
| Matched (catalog → chain) | ${matched.length} |
| Unmatched catalog (non-producing) | ${unmatched.length} |
| Orphan chain entries | ${orphanChain.length} |
| Output families | ${families.length} |
| Output variants | ${allVariantIds.length} |
| Multi-variant families | ${multiFamilies.length} |

## Matched Buildings (catalog → chain)

| Catalog Name | Catalog ID | Chain ID | Verify |
|---|---|---|---|
${matched.map(b => {
  const { chainId } = matchResult.get(b.id)!
  const chain = chainById.get(chainId)!
  return `| ${b.name} | \`${b.id}\` | \`${chainId}\` | ${chain.verify ? '⚠️ verify' : '✅'} |`
}).join('\n')}

## Multi-Variant Families

| Family ID | Name | Variants | Category |
|---|---|---|---|
${multiFamilies.map(f =>
  `| \`${f.id}\` | ${f.name} | ${f.variants.map(v => v.name).join(', ')} | ${f.category} |`
).join('\n')}

## Category Assignment Edge Calls

${edgeCalls.length > 0 ? edgeCalls.map(e => `- ${e}`).join('\n') : '_None recorded._'}

| Old Category | New Category | Count |
|---|---|---|
| residence | residence | ${buildings.filter(b => b.category === 'residence').length} |
| production | production | ${buildings.filter(b => b.category === 'production').length} |
| public | public_service | ${buildings.filter(b => b.category === 'public').length} |
| harbor | infrastructure | ${buildings.filter(b => b.category === 'harbor').length} |

## Unmatched Catalog Buildings (non-producing — expected)

${unmatched.map(b => `- \`${b.id}\` — ${b.name} (${b.category})`).join('\n')}

## Orphan Chain Entries

${orphanChain.length === 0 ? '_None. Clean pass._' : orphanChain.map(c => `- \`${c.id}\` — ${c.name}`).join('\n')}
`

const reportPath = path.join(ROOT, 'docs/reconciliation-report.md')
fs.writeFileSync(reportPath, report)
console.log(`📋 Report: ${reportPath}`)
console.log('\n✅ Build complete.')
