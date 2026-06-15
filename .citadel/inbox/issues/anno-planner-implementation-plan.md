# Anno 1800 Blueprint Planner — Implementation Plan

**Scope:** Workforce calculation, missing outputs (Red Pepper / Cattle), Flour Mill inputs, building consolidation, unit testing, resizable panes.
**Repo reviewed:** `DoodzCode/anno-planner`, `dev` branch (post-M5; M4 PWA polish and M5 static deploy are complete).
**Status:** Plan only — no implementation in this document.

---

## A. Understanding & Assumptions

### A.1 What the app is (verified from the code)

| Area | Reality in the repo |
|---|---|
| Stack | React 18 + TypeScript + Vite 6, PWA (`vite-plugin-pwa`) |
| State | Zustand + immer (`src/state/blueprintStore.ts`) with undo/redo history |
| Persistence | Dexie / IndexedDB, DB `anno-planner` v1, key `current` + a library (`src/state/persistence.ts`) |
| Canvas | Konva / react-konva (`src/components/Canvas.tsx`) |
| Sharing | lz-string–encoded URL hash (`src/lib/share.ts`) |
| Catalog data | `src/data/buildings-1800.json` (156 buildings) → typed by `src/types/domain.ts`; exposed via `src/data/catalog.ts` as `BUILDING_MAP` |
| Chain data | `src/data/production-chains.json` (47 goods, 33 buildings) → typed by `src/types/productionChain.ts`; name→id mapping in `src/data/chainNameMap.ts` (exports `CHAIN_NAME_MAP`, `CHAIN_BUILDING_MAP`, `GOODS_MAP`) |
| Calc engine | `src/lib/productionMath.ts` — pure functions |
| Production UI | `src/components/Inspector.tsx` (right pane) |
| Additional components | `Minimap.tsx`, `BlueprintLibrary.tsx`, `Onboarding.tsx`, `OverlayBar.tsx` — all present from M4 work |
| Overlay state | `src/state/overlayStore.ts` — separate Zustand store for overlay toggles |
| Tests | Vitest configured; **one** suite: `src/__tests__/productionMath.test.ts`. No `test:run` or `test:coverage` scripts yet; no jsdom / @testing-library/react installed. `CLAUDE.md` already commits to "Vitest + Playwright." |
| Layout | `src/App.css` — fixed CSS grid `grid-template-columns: 220px 1fr 240px` (Palette │ canvas-column │ Inspector) |

### A.2 Per-goal findings (these shape the plan)

1. **Workforce (#1)** — There is **no workforce data anywhere**. `ChainBuilding` has a single `tier` *label* (e.g. `"Workers"`) but no headcount; `Building` has a lowercase `tier` used only for palette filtering. The engine has no workforce concept. This goal needs **new data + new schema + new engine output**, not just a calculation tweak.

2. **Missing outputs (#2)** — `Red Pepper Farm` (`agriculture-11-bell-pepper-farm`) and `Cattle Farm` (`agriculture-02-cattle-farm`) exist in the catalog but have **no entry in `production-chains.json` and no key in `CHAIN_NAME_MAP`**. `computeTallies` therefore *silently skips* them (`if (!chainId) continue`). This is a **data gap**, not an engine bug.

3. **Flour Mill inputs (#3)** — Surprising result: `flour_mill` **already** exists in chain data with `inputs:[{good:"grain",perMin:2}]` **and is mapped** (`'Flour Mill' → 'flour_mill'`). `inputRates()` already computes grain consumption, and `computeTallies` already subtracts it. The real defect is **display**: `Inspector` only renders **net** per good. When a Grain Farm offsets a Flour Mill the net is ~0 and grain *disappears*, so consumption "looks" uncalculated. The correct fix is a **general UI change (show produced & consumed, not just net)** plus a guarantee the data/mapping stay intact — exactly the kind of thing the general engine work should make uniform.

4. **Consolidation (#4)** — "Duplicate" means three different things in the data:
   - **Tier-unlock duplicates** — `Small Warehouse` appears 5× as the *same* building unlocked at Farmers/Workers/Artisans/Engineers/Investors. **Four of them share the identical id `logistic-02-warehouse-i-1010371`.** That is a real bug: `BUILDING_MAP = new Map(...)` dedupes by id, so all but one are dropped and placements are ambiguous.
   - **Region variants** — `Flame Tower`, `Anti-Armour Gun`, `Flak Emplacement` repeat as `base / colony01 / colony02 / arctic` (same footprint, different session).
   - **DLC look-alikes** — `Depot`, `Pier`, `Repair Crane` have a base-game version and a *different-footprint* Docklands module. These are arguably **not** the same building.

5. **Testing (#5)** — Vitest works; coverage of real logic is thin (one suite, synthetic fixtures only). No data-integrity test (which is why the duplicate-id bug shipped). No component/E2E tests yet despite Playwright being a dependency.

6. **Resizable panes (#6)** — Layout is a hard-coded 3-column grid; nothing is draggable. Konva stage sizing will need to react to pane resizes or the canvas will clip.

### A.3 Assumptions (defaults used here — override any of these)

These mirror the recommended answers to the clarifying questions in §B. The plan is written against them but is structured so each is swappable.

- **(W)** I will **source canonical workforce figures** from established Anno 1800 community data and add them to the schema, with the numbers surfaced for your review before they're treated as authoritative.
- **(C)** Consolidation v1 merges **tier-unlock duplicates only** (and fixes the duplicate-id bug). The data model is built to *also* express region/DLC variants later without another migration.
- **(R)** Resizable panes are **hand-rolled** over the existing CSS grid (no new dependency), resizing the three columns with proportional auto-adjust and `localStorage` persistence.
- **(M)** The engine stays **parameterized** (productivity, electricity, variant) but v1 computes at **100% / base** and does not yet add per-placement controls.
- **(N)** New World build-out is limited to the **named buildings** (Red Pepper, Cattle); broader New World chains are out of scope for v1 but the data shape supports them.
- Residences/population *supply* and needs satisfaction are **out of scope**; the engine is designed so workforce *supply* can be added later as positive flow.
- Productivity items / trade-union effects (which can lower workforce) are **out of scope** for v1.

---

## B. Clarifying Questions (grouped, prioritized)

> I asked the four **P0** questions up front; the UI returned no explicit selection, so the plan proceeds on the recommended defaults in §A.3. Please confirm or redirect — the P0 answers can change phase content materially. P1/P2 can be resolved as we reach the relevant phase.

### P0 — Block finalization / change architecture
1. **Workforce data source.** Source it myself for your review *(default)*, you provide a table, or stub-now/backfill-later? Everything in Phase 3 depends on this.
2. **Consolidation aggressiveness.** Tier-unlocks only *(default)*, also region variants, or all same-name including different-footprint DLC modules? Determines the variant model and migration breadth.
3. **Resize approach.** Hand-rolled 3-column *(default)*, a library (`react-resizable-panels` / Allotment), or columns **plus** vertical splits inside the canvas column?
4. **Math model surfaced in v1.** Base 100% but extensible *(default)*, full per-placement productivity/electricity/variant controls, or a single global productivity slider?

### P1 — Needed before the relevant phase
5. **Workforce semantics.** Confirm: workforce is **fixed per building instance**, scales with building **count** but **not** with productivity %. (This is standard Anno 1800; affects whether `workforce` is a function of productivity.)
6. **Chain↔catalog linking.** OK to migrate from the fragile **name-based** `CHAIN_NAME_MAP` (note the existing "Weapon Factory" vs "Weapons", "Hop Farm" singular hacks) to **id-based** links per variant? Recommended; removes a whole bug class.
7. **Productivity & electricity definition.** Confirm the existing convention: electric buildings use **base 200** (100% = 2× the non-electric rate). New data must follow it.

### P2 — Product/UX preferences (can default)
8. Display units — show t/min only, or also "buildings needed to balance"? (`buildingsNeeded` already exists.)
9. Should the production summary be **per-selection** (current behavior is whole-blueprint) or both?
10. Layout persistence location — `localStorage` *(default, simplest)* or IndexedDB alongside the blueprint?
11. Reset affordance for panes — double-click gutter to reset, a "reset layout" button, or both?

---

## C. Data Model / Schema Changes

Three concerns: **workforce**, **uniform production/consumption**, and **tiered variants under one entity**. All are additive and backward-compatible until the consolidation phase.

### C.1 Workforce

Add a small shared type and attach it to the per-variant production data (one tier per building in practice, but modeled as a list for uniformity and future-proofing).

```ts
// src/types/productionChain.ts (or a new src/types/workforce.ts)
export type PopulationTier =
  | 'farmers' | 'workers' | 'artisans' | 'engineers' | 'investors'
  | 'jornaleros' | 'obreros'            // New World
  | 'scholars'                           // expansion
  | 'shepherds' | 'explorers' | 'elders' // Arctic, if needed later

export interface WorkforceRequirement {
  tier: PopulationTier
  count: number          // headcount per building instance at full operation
}
```

Attach to the chain building (canonical source of math):

```ts
export interface ChainBuilding {
  // ...existing fields...
  workforce: WorkforceRequirement[]   // default [] for buildings with no labor (mines vary; verify)
}
```

Rationale for a list rather than a single object: keeps the engine's "a building emits N resource flows" model uniform (goods *and* workforce are just flows), and a handful of edge buildings legitimately need none.

### C.2 Uniform production & consumption (no schema change, one rename for clarity)

Production/consumption are already well-modeled (`output`, `inputs[]`, `outputPerMin`, `baseCycleSeconds`, `requiresElectricity`). Keep them. The only data work for goals #2/#3 is **filling rows** (§E Phase 2) and **linking by id** (P1-Q6). Recommended: add an explicit per-variant `chainId` so the engine never needs the name map.

### C.3 Tiered building variants under one entity

Introduce a **family / variant** model. A `Building` becomes a family that owns one or more `BuildingVariant`s; a `Placement` references both.

```ts
// src/types/domain.ts
export interface BuildingVariant {
  variantId: string          // globally unique, stable (e.g. "warehouse-small@workers")
  label: string              // user-facing: "Workers", "Arctic", "Docklands"
  kind: 'tier' | 'region' | 'dlc'   // why this variant exists
  tier?: string
  region?: string
  dlc?: string
  footprint: Footprint       // variants MAY differ (Depot/Pier case)
  iconFile?: string
  color?: string
  chainId?: string           // id-based link into production-chains.json
  workforce?: WorkforceRequirement[]  // can override family default
}

export interface Building {       // now a "family"
  id: string                      // family id
  name: string
  category: string
  group?: string
  influenceRadius?: number
  workRadius?: number
  overlayType?: string
  roadRequired?: boolean
  defaultVariantId: string
  variants: BuildingVariant[]
}

export interface Placement {
  id: string
  buildingId: string              // family id
  variantId: string               // NEW — which variant (defaults to family default on migration)
  x: number
  y: number
  rotation: Rotation
  notes?: string
}
```

Notes:
- The current `Placement.tier?: string` is subsumed by `variantId`. A migration maps legacy `(buildingId[, tier])` → `(familyId, variantId)`.
- For **tier-unlocks-only** (default), most families have a single variant; only the genuine duplicates (Small Warehouse, and the duplicate-id bug) become multi-variant. This keeps the diff small while the *shape* already supports region/DLC variants if we expand later — **no second migration needed**.
- `BUILDING_MAP` stays a `Map<familyId, Building>`; add a `VARIANT_MAP = Map<variantId, {family, variant}>` for O(1) lookups and a `LEGACY_ID_MAP` for migration.

### C.4 Blueprint/version bookkeeping

- Bump `Blueprint.metadata.version` (e.g. `0.2.0`) and add a `schemaVersion` to persisted blueprints so the migration layer knows what to upgrade.
- Bump the Dexie store version (v1 → v2) with an `upgrade` that rewrites stored placements through the migration function.

---

## D. General Calculation Engine

The goal stated by the project is exactly right: **pepper, cattle, and flour-mill grain should fall out of one general fix, not three special cases.** They already *almost* do — the missing piece is that workforce isn't modeled and the data/UI treat some flows specially. The redesign makes **every building emit a list of signed resource flows**, where a "resource" is either a good or a workforce tier.

### D.1 Core abstraction: signed resource flows

```ts
// src/lib/productionMath.ts
export type ResourceKind = 'good' | 'workforce'

/** A resource id is namespaced: `good:grain`, `workforce:workers`. */
export type ResourceId = string
export const goodRes = (id: string): ResourceId => `good:${id}`
export const workRes  = (tier: string): ResourceId => `workforce:${tier}`

export interface ResourceFlow {
  kind: ResourceKind
  id: ResourceId
  amount: number   // +supply/produce, -demand/consume
}

export interface ResourceTally {
  produced: number   // sum of positive flows  (a.k.a. supplied for workforce)
  consumed: number   // sum of |negative flows| (a.k.a. required for workforce)
  net: number        // produced - consumed
}
```

### D.2 One building → its flows

```ts
export interface FlowContext {
  productivity?: number      // default 100
  // electricity, items, etc. can be added here later WITHOUT touching callers
}

/** Pure: a single chain building's flows at a given context. */
export function buildingFlows(b: ChainBuilding, ctx: FlowContext = {}): ResourceFlow[] {
  const rate = outputRate(b, ctx.productivity ?? 100)   // existing fn, reused
  const flows: ResourceFlow[] = []

  // Output (produce)
  flows.push({ kind: 'good', id: goodRes(b.output.good), amount: +rate })

  // Inputs (consume) — scaled exactly as inputRates() already does
  for (const inp of b.inputs) {
    flows.push({ kind: 'good', id: goodRes(inp.good), amount: -rate * (inp.perMin / b.outputPerMin) })
  }

  // Workforce (demand) — fixed per instance, independent of productivity
  for (const w of b.workforce ?? []) {
    flows.push({ kind: 'workforce', id: workRes(w.tier), amount: -w.count })
  }

  return flows
}
```

Why this nails the three "special cases":
- **Pepper / Cattle (#2):** once their rows + `chainId` exist, `buildingFlows` emits their output flow like any other — zero engine changes.
- **Flour Mill grain (#3):** already emitted as a negative `good:grain` flow; the new UI (D.4) shows `consumed` explicitly so it's visible even when balanced.
- **Workforce (#1):** just another flow kind in the *same* list and the *same* aggregation.

### D.3 Aggregation over a blueprint

```ts
export function aggregateFlows(
  placements: Placement[],
  resolve: (p: Placement) => { chain: ChainBuilding; ctx: FlowContext } | null,
): Map<ResourceId, ResourceTally> {
  const out = new Map<ResourceId, ResourceTally>()
  const bump = (id: ResourceId, amt: number) => {
    const t = out.get(id) ?? { produced: 0, consumed: 0, net: 0 }
    if (amt >= 0) t.produced += amt; else t.consumed += -amt
    t.net += amt
    out.set(id, t)
  }
  for (const p of placements) {
    const r = resolve(p)
    if (!r) continue                       // unknown/non-producing building: skip
    for (const f of buildingFlows(r.chain, r.ctx)) bump(f.id, f.amount)
  }
  return out
}
```

The `resolve` callback is where catalog↔chain↔variant lookup lives (and where productivity/electricity will plug in later). This keeps `aggregateFlows` pure and trivially testable with fake resolvers.

### D.4 Back-compat & UI surface

- Keep `computeTallies`, `outputRate`, `inputRates`, `buildingsNeeded` exported (re-implement `computeTallies` on top of `aggregateFlows` or keep as a thin adapter) so nothing else breaks while we migrate `Inspector`.
- Add convenience selectors: `goodsTallies(map)` and `workforceTotals(map)` that split the unified map for the UI.
- `Inspector` changes: a **Production** section showing `produced / consumed / net` per good (fixes the #3 visibility issue), and a new **Workforce** section showing required headcount per tier with the blueprint total.

### D.5 Trade-offs
- **Namespaced string ids** (`good:` / `workforce:`) keep one map and one code path at the cost of a parse when the UI splits them — cheap and explicit. Alternative (two separate maps) duplicates the aggregation loop; rejected.
- **`resolve` callback** decouples math from data wiring (great for tests) but adds one indirection; worth it.
- **Workforce as flow** is slightly unusual (headcount isn't t/min) but the signed-aggregate semantics are identical and the uniformity is the whole point.

---

## E. Phased, Incremental Rollout

Each phase is independently shippable (no half-broken states) and testable. Suggested branch-per-phase, merged behind the existing `dev → main` promotion noted in `CONTRIBUTING.md`.

### Phase 0 — Test & data foundation *(small, no user-visible change)*
1. Add `@vitest/coverage-v8`; add `test:run` and `test:coverage` scripts; set a coverage gate for `src/lib/**`.
2. Add `jsdom` + `@testing-library/react` (+ `/jest-dom`, `/user-event`) for later component tests; split Vitest config so `lib` tests run in `node`, component tests in `jsdom`.
3. Add a **data-integrity test** over the JSON files: no duplicate ids, every chain mapping resolves, every `input.good`/`output.good` exists in `goods`, every workforce `tier` is valid. *(This single test would have caught the warehouse duplicate-id bug.)*
4. Wire CI to run `tsc -b`, `test:run`, and `build`.
**DoD:** green CI; coverage reported; integrity test passes (or documents the existing dup-id failure as a known issue to be fixed in Phase 4).

### Phase 1 — Generalize the engine *(refactor, behavior-preserving)*
1. Introduce `ResourceFlow` / `buildingFlows` / `aggregateFlows` (§D).
2. Re-express `computeTallies` on top of them; keep the public API identical.
3. Port/expand the existing test suite to the new functions; add fakes for `resolve`.
**DoD:** all prior tests pass unchanged; new engine functions ≥ 95% covered; Inspector output byte-identical (snapshot).

### Phase 2 — Fill data gaps → fixes #2 and #3 *(data + small UI)*
1. Add `goods` + `ChainBuilding` rows for **Red Pepper Farm** and **Cattle Farm** (region New World), with `chainId` and mappings.
2. Update `Inspector` to render **produced / consumed / net** per good (makes Flour Mill grain consumption visible).
3. Data-driven tests: pepper output, cattle output, flour-mill grain consumption, and a mixed blueprint.
**DoD:** placing a Red Pepper Farm / Cattle Farm shows output; placing a Flour Mill shows grain consumption even when balanced; integrity test still green.

### Phase 3 — Workforce → fixes #1 *(schema + data + engine + UI)*
1. Add `WorkforceRequirement` to the schema; populate workforce for all production buildings (per assumption W).
2. `buildingFlows` emits workforce flows (already designed); `aggregateFlows` totals them.
3. Inspector **Workforce** panel: per-tier required headcount + blueprint total; clear handling of buildings with unknown/0 workforce.
4. Tests: per-building workforce, multi-tier aggregation, count-scaling, productivity-independence.
**DoD:** every production building reports workforce by tier; blueprint totals aggregate correctly; data-integrity covers workforce tiers.

### Phase 4 — Building consolidation → fixes #4 *(model + migration + UI; highest risk)*
1. Introduce family/variant model (§C.3); convert data for **tier-unlock duplicates** (Small Warehouse), **fixing the duplicate-id bug**.
2. Build the **migration layer** (`LEGACY_ID_MAP`, `migratePlacements`) applied at all three entry points: IndexedDB load (Dexie v1→v2 upgrade), JSON import (`openFile`), and share-URL decode.
3. Palette: families render once with a **variant selector**; Inspector: variant switch for a selected placement.
4. Tests: migration round-trip (legacy blueprint → new ids → render), variant selection, share-URL with non-default variant, integrity test for variants.
**DoD:** no duplicate ids; legacy saved/exported/shared blueprints open without losing tiles; each variant remains selectable and placeable.

### Phase 5 — Resizable panes → fixes #6 *(UI)*
1. Convert `.app-shell` to state-driven grid widths; add draggable gutters with min/max + proportional auto-adjust (§G); persist layout.
2. Recompute Konva stage size on resize (`ResizeObserver`).
3. Tests: pure `redistribute()` math (unit) + Playwright drag/persist/reset (E2E).
**DoD:** all three columns resize with constraints; remaining space auto-distributes; layout persists across reloads; canvas never clips.

### Phase 6 — Hardening
1. Playwright E2E across place → compute → save → reload → migrate.
2. Enforce coverage gate; update `CLAUDE.md`/`CONTRIBUTING.md`/docs; PWA cache bump for data changes.
**DoD:** E2E green; coverage thresholds enforced in CI.

**Ordering rationale:** generalize first (cheaply unblocks #1/#2/#3), then data, then the risky migration work, with panes (#6) independent at the end. Phases 2, 3, 5 can ship in any order after Phase 1; Phase 4 should follow Phase 3 (so variants carry workforce) but is otherwise independent.

---

## F. Testing Strategy

### F.1 Frameworks
- **Vitest** for all pure logic (engine, migration, resize math, data integrity) — already configured.
- **@testing-library/react + jsdom** for component behavior (Inspector renders tallies/workforce; Palette variant selector).
- **Playwright** (already a dependency) for E2E: placement → live numbers → save/reload → migration → resize/persist.

### F.2 What to unit-test (priority order)
1. **Engine** — `buildingFlows` per building shape (no-input, multi-input, electric, with/without workforce); `aggregateFlows` summation and signs; `outputRate` productivity & electric-base; `inputRates` scaling; `buildingsNeeded` incl. zero-rate → `Infinity`.
2. **Data integrity** — no duplicate ids; every variant `chainId` resolves; every good referenced exists; every workforce tier valid; every catalog production building has a chain link (or is explicitly allow-listed as non-producing).
3. **Migration** — legacy `buildingId(/tier)` → `(familyId, variantId)`; round-trip a real legacy blueprint; unknown id → placeholder (never silent drop).
4. **Resize** — `redistribute(widths, gutterIndex, deltaPx, constraints)` honors min/max, conserves total, proportional fallback.

### F.3 Fixtures / test data
- Keep the existing **synthetic** catalog+chain fixtures (fast, intent-revealing).
- Add a **golden subset** of *real* data (the chains touched by goals #2/#3 + warehouse family) so regressions in real data are caught.
- A **legacy blueprint fixture** (pre-consolidation ids, including the dup-id warehouse and a `Placement.tier`) for migration tests.

### F.4 Concrete example test cases (engine)

```ts
// #2 — Red Pepper / Cattle outputs fall out of the general engine
it('Red Pepper Farm produces its output good', () => {
  const flows = buildingFlows(redPepperFarm)
  const out = flows.find(f => f.id === goodRes('red_peppers'))
  expect(out?.amount).toBeCloseTo(outputRate(redPepperFarm))
})

// #3 — Flour Mill grain consumption is visible even when net-balanced
it('Flour Mill consumes grain; a matched Grain Farm nets ~0 but consumed > 0', () => {
  const map = aggregateFlows(
    [place('flour'), place('grain')],
    resolveReal,
  )
  const grain = map.get(goodRes('grain'))!
  expect(grain.consumed).toBeGreaterThan(0)   // <-- the real fix
  expect(grain.net).toBeCloseTo(0)
})

// #1 — Workforce aggregates by tier across a blueprint
it('aggregates required workforce per tier', () => {
  const map = aggregateFlows([place('flour'), place('flour'), place('bakery')], resolveReal)
  expect(map.get(workRes('workers'))!.consumed)
    .toBeCloseTo(2 * flourMill.workforce[0].count + bakery.workforce[0].count)
})

it('workforce is independent of productivity but outputs scale', () => {
  const lo = buildingFlows(flourMill, { productivity: 50 })
  const hi = buildingFlows(flourMill, { productivity: 100 })
  const w = (fs: ResourceFlow[]) => fs.find(f => f.kind === 'workforce')!.amount
  expect(w(lo)).toBe(w(hi))                              // workforce fixed
  const o = (fs: ResourceFlow[]) => fs.find(f => f.id === goodRes('flour'))!.amount
  expect(o(lo)).toBeCloseTo(o(hi) / 2)                   // output halves
})

// #4 — Migration maps legacy ids and never drops tiles
it('migrates a legacy warehouse placement to (family, variant)', () => {
  const [p] = migratePlacements([{ buildingId: 'logistic-02-warehouse-i', tier: 'farmers', /*...*/ }])
  expect(p.buildingId).toBe('warehouse-small')
  expect(p.variantId).toBe('warehouse-small@farmers')
})

// Data integrity — would have caught the shipped bug
it('has no duplicate building ids', () => {
  const ids = BUILDINGS.flatMap(b => b.variants.map(v => v.variantId))
  expect(new Set(ids).size).toBe(ids.length)
})
```

### F.5 Coverage expectations
- **`src/lib/**` (pure logic): 100% lines/branches** — these are the calculation correctness guarantees.
- **Overall ≥ 80%**, enforced in CI.
- Data-integrity and migration round-trip tests are **required-to-pass** gates regardless of coverage %.

---

## G. Resizable Panes — UI/UX Plan

**Default approach:** hand-rolled over the existing CSS grid (no dependency). If you'd rather not own the a11y/keyboard edge cases, swapping in `react-resizable-panels` is a low-risk alternative (trade-off below).

### G.1 Layout
- Replace the fixed grid with state-driven track sizes:
  ```css
  .app-shell { display: grid; grid-template-columns: var(--col-left) 4px 1fr 4px var(--col-right); }
  ```
  Two **gutter** elements (the `4px` tracks) carry pointer handlers; the center stays `1fr` and auto-absorbs slack.
- Widths held in a small store/state: `{ left: number, right: number }` (px). Center is implicit.

### G.2 Constraints & proportional auto-adjust
- **Min/max:** `left ∈ [180, 36vw]`, `right ∈ [200, 36vw]`, center `min-width: 320px`. Clamp on every drag and on window resize.
- **Drag behavior:** dragging the left gutter changes `left` (center absorbs); dragging the right gutter changes `right`. Center never goes below its min — if a drag would violate it, the gutter stops.
- **Proportional auto-adjust on window resize:** when the viewport shrinks below the sum of mins, reduce `left` and `right` *proportionally to their current widths* down to their mins (pure `redistribute()` — unit-tested), so the layout degrades gracefully instead of clipping the canvas.
- **Reset:** double-click a gutter (and/or a "Reset layout" button) restores defaults `{220, 240}`.
- **A11y:** gutters are `role="separator"` with `aria-orientation`, `tabindex=0`, and Arrow-key resize (±8px, ±32px with Shift).

### G.3 Canvas integration
- Wrap the Konva stage in a `ResizeObserver` (or pass measured size as props) so `Stage` width/height recompute when the center column changes — otherwise the canvas clips or letterboxes.

### G.4 Persistence
- Persist `{left,right}` to **`localStorage`** (default — simplest, instant, layout is device-not-document state). Alternative: store in IndexedDB next to the current blueprint if layout should follow the document. Restore on mount with clamping (in case the saved size exceeds a smaller viewport).

### G.5 Trade-offs
- **Hand-rolled:** zero deps, full control, but we own keyboard/touch/edge cases and must test the math ourselves.
- **`react-resizable-panels` / Allotment:** robust drag + keyboard + persistence out of the box, but adds a dependency, some restyle, and Konva still needs a `ResizeObserver`. Recommended only if vertical splits (canvas/toolbar) are also wanted (P0-Q3 option 3).

---

## H. Risks, Edge Cases & Migration

### H.1 Data / correctness
- **Duplicate-id bug (warehouse).** Four entries share `logistic-02-warehouse-i-1010371`; `BUILDING_MAP` silently drops all but one. Fix in Phase 4; the Phase 0 integrity test prevents recurrence.
- **Fragile name-based mapping.** `CHAIN_NAME_MAP` is keyed by display name and already carries hacks ("Weapon Factory", singular "Hop Farm", "Glassmakers"→glassworks). Adding pepper/cattle by name risks more drift. **Recommend id-based linking** (P1-Q6) as part of Phase 2/4.
- **Net-only display hides balanced flows.** This is *why* Flour Mill grain "looks" uncalculated. Fixed by showing produced/consumed (Phase 2). Add a regression test (F.4).
- **Electric base-200 convention** is non-obvious; document and test so new buildings (and reviewers) get it right.
- **Workforce data accuracy.** Numbers vary by wiki/version and DLC; surface them for review (assumption W) and gate with the integrity test (valid tiers, non-negative counts).

### H.2 Migration (the main risk in Phase 4)
- Placements reference `buildingId` in **three** places: IndexedDB (`current` + library), exported JSON (`exportImport.ts` / `openFile`), and **share URLs** (lz-string in `share.ts`). A migration that misses any one corrupts those blueprints.
- Plan: a single pure `migratePlacements(placements, fromVersion)` applied at **every** load path; a Dexie **v1→v2 `upgrade`** that rewrites stored blueprints once; `schemaVersion` stamped on save so migration is idempotent.
- **Never silently drop tiles.** Unknown/unmapped ids resolve to a visible `unknown` placeholder building so users see (and can fix) the gap instead of losing layout. Round-trip test required.
- **Share-URL size.** Adding `variantId` to every placement bloats the payload. Mitigation: omit `variantId` when it equals the family default; only encode overrides. Keep an encode/decode test on payload size.

### H.3 UI / runtime
- **Konva + resize:** stage must re-measure on pane resize (`ResizeObserver`) or it clips.
- **PWA caching:** changed data JSON won't reach users until the service worker updates; bump a data/version token and confirm `autoUpdate` picks it up.
- **Undo/redo + migration:** ensure the history stack holds already-migrated placements (migrate on load, before history is seeded).

---

## I. Definition of Done (per goal)

1. **Workforce** — Every production building exposes `WorkforceRequirement[]`; the engine emits workforce flows; the Inspector shows required headcount per tier and a blueprint total; workforce is independent of productivity, scales with count; data-integrity + aggregation tests pass.
2. **Missing outputs** — Red Pepper Farm and Cattle Farm have chain rows + id-based links; placing either shows its output in the production pane; covered by data-driven tests. No special-case code — they flow through `buildingFlows`.
3. **Flour Mill inputs** — Grain consumption is visible in the production pane (produced/consumed/net shown), correct even when offset by a Grain Farm; regression test asserts `consumed > 0` with `net ≈ 0`.
4. **Consolidation** — Tier-unlock duplicates merged into single families with selectable variants; duplicate-id bug eliminated; legacy blueprints (IndexedDB, exported JSON, share URLs) migrate without losing or mislabeling tiles; each variant remains selectable/placeable; round-trip + integrity tests pass.
5. **Unit testing** — Vitest (+ jsdom/Playwright) in CI; `src/lib/**` at 100% line/branch, overall ≥ 80%; data-integrity and migration tests are required gates; all new/changed logic has tests, with the calculation engine the priority.
6. **Resizable panes** — All three columns resize within min/max; freed space auto-distributes proportionally; layout persists across reloads and clamps to viewport; canvas re-measures and never clips; resize math unit-tested and behavior covered by Playwright.

---

### Appendix — Concrete artifacts I found (for traceability)

- Duplicate-id bug: `logistic-02-warehouse-i-1010371` appears 4× (Workers/Artisans/Engineers/Investors) plus `logistic-02-warehouse-i` (Farmers) — all "Small Warehouse".
- Same-name groups by kind: tier-unlock (Small Warehouse); region variants (Flame Tower, Anti-Armour Gun ×4, Flak Emplacement); DLC look-alikes with different footprints (Depot 10×4 vs 3×3, Pier 6×7 vs 5×5, Repair Crane 5×5 vs 3×3).
- Unmapped catalog buildings: `agriculture-11-bell-pepper-farm` ("Red Pepper Farm"), `agriculture-02-cattle-farm` ("Cattle Farm") — present in catalog, absent from chains + name map.
- `flour_mill` already has `inputs:[{good:grain,perMin:2}]` and is mapped — so #3 is primarily a display fix.
- Layout: `src/App.css` `grid-template-columns: 220px 1fr 240px`.
