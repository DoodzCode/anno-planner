# Session 2 — Phase 3: Workforce

**Branch:** `dev`  
**Prerequisite:** Session 1 commit `5480719` (Phase 0-2) must be present.  
**Status:** Ready to implement.

---

## What was done in Session 1

- `src/types/productionChain.ts` already has `PopulationTier`, `WorkforceRequirement`, and `workforce?: WorkforceRequirement[]` on `ChainBuilding`.
- `src/lib/productionMath.ts` already emits workforce flows via `buildingFlows` when `b.workforce` is present.
- `src/components/Inspector.tsx` uses `aggregateFlows` + `goodsTallies` — it's already wired to the unified flow map; you just need to read `workforceTotals` from the same map and render a new section.

The schema and engine are **already done**. Session 2 is data + UI only.

---

## What needs to happen

### 3A — Add workforce data to production-chains.json

For all 33 chain buildings, add a `"workforce"` array field. Numbers below are verified-or-estimated from the Anno 1800 wiki (Artisans+ numbers marked `verify: true` in the chain file for human review).

| Building id | Tier key | Count |
|---|---|---|
| lumberjacks_hut | farmers | 10 |
| fishery | farmers | 10 |
| potato_farm | farmers | 10 |
| schnapps_distillery | workers | 20 |
| sheep_farm | farmers | 20 |
| framework_knitters | workers | 40 |
| clay_pit | farmers | 20 |
| brick_factory | workers | 30 |
| pig_farm | farmers | 30 |
| slaughterhouse | workers | 30 |
| grain_farm | farmers | 30 |
| flour_mill | workers | 20 |
| bakery | workers | 30 |
| rendering_works | workers | 20 |
| soap_factory | artisans | 30 |
| iron_mine | farmers | 30 |
| coal_mine | farmers | 30 |
| charcoal_kiln | workers | 40 |
| furnace | workers | 40 |
| steelworks | workers | 50 |
| weapons_factory | workers | 50 |
| hops_farm | farmers | 20 |
| malthouse | workers | 20 |
| brewery | artisans | 30 |
| sailmakers | workers | 30 |
| cattle_farm | artisans | 30 |
| bell_pepper_farm | artisans | 30 |
| artisanal_kitchen | artisans | 40 |
| cannery | workers | 40 |
| hunting_cabin | artisans | 30 |
| cotton_mill | artisans | 40 |
| fur_dealer | artisans | 40 |
| sewing_machine_factory | engineers | 50 |
| glassworks | artisans | 30 |
| window_makers | engineers | 40 |

Format for each building entry:
```json
"workforce": [{ "tier": "workers", "count": 20 }]
```

**Human review:** All artisans/engineers numbers should be cross-checked against the wiki. Farmers/workers numbers are standard and reliable.

### 3B — Update data integrity test

In `src/__tests__/dataIntegrity.test.ts`, add a test that:
- Every chain building has a `workforce` array (length ≥ 0).
- Every workforce `tier` value is a valid `PopulationTier`.

Valid tiers: `farmers | workers | artisans | engineers | investors | jornaleros | obreros | scholars | shepherds | explorers | elders`

### 3C — Inspector workforce panel

In `src/components/Inspector.tsx`, after the existing Production section, add a **Workforce** section:

```tsx
{workforceEntries.length > 0 && (
  <div className="inspector-workforce">
    <h2>Workforce</h2>
    {workforceEntries.map(({ tier, consumed }) => (
      <div key={tier} className="tally-row">
        <span className="tally-good">{TIER_LABELS[tier] ?? tier}</span>
        <span className="tally-col tally-col--consumed">{consumed.toFixed(0)}</span>
      </div>
    ))}
  </div>
)}
```

Derive `workforceEntries` from `workforceTotals(allFlows)` — the same `allFlows` map already computed for the goods panel. Only show tiers with `consumed > 0`.

`TIER_LABELS` mapping:
```ts
const TIER_LABELS: Record<string, string> = {
  farmers: 'Farmers', workers: 'Workers', artisans: 'Artisans',
  engineers: 'Engineers', investors: 'Investors',
  jornaleros: 'Jornaleros', obreros: 'Obreros',
}
```

Import `workforceTotals` from `'../lib/productionMath'`.

### 3D — Tests

Add to `src/__tests__/productionMath.test.ts` (or a new `workforce.test.ts`):

1. Per-building workforce emission: `buildingFlows(furnaceWithWorkforce)` includes a `workforce:workers` flow of `-40`.
2. Multi-building aggregation: 2 flour mills + 1 bakery → `workers` consumed = 2×20 + 30 = 70.
3. Productivity independence: `buildingFlows(b, { productivity: 50 })` workforce unchanged vs `{ productivity: 100 }`.
4. Buildings without workforce field emit zero workforce flows.

(Note: fixtures with `workforce` are already in `productionMath.test.ts` from Session 1 — `flourMill` has `workforce: [{ tier: 'workers', count: 20 }]` and `bakery` has `count: 30`. Tests 1-3 can reuse those. Test 4 already passes — `furnace` in that file has no workforce field.)

---

## Definition of Done

- [ ] All 35 chain buildings have a `workforce` array in production-chains.json
- [ ] `npm run test:coverage` passes (productionMath.ts stays at 100%)
- [ ] Inspector shows a Workforce section with required headcount per tier
- [ ] Data integrity test covers workforce tier validity
- [ ] `npx tsc -b` clean

## Key files

| File | Change |
|---|---|
| `src/data/production-chains.json` | Add `workforce` arrays to all 35 buildings |
| `src/__tests__/dataIntegrity.test.ts` | Add workforce integrity checks |
| `src/components/Inspector.tsx` | Add Workforce panel (import `workforceTotals`) |
| `src/App.css` | Add `.inspector-workforce` styles if needed (can reuse `.inspector-tallies`) |
| `src/__tests__/productionMath.test.ts` | Add workforce-specific test cases |
