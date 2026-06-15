# Building Data Model & Consolidation — Orbital Briefing for Clyde (M4 Re-pass)

<aside>
🛰️

**This is an orbital briefing, not the plan.** Ian's call: **Clyde authors the implementation plan on the ground.** My job from up here is to hand over every bit of context, constraint, and hazard intel I can see so the plan starts from solid footing. **§3 decisions are locked constraints.** **§6 is direction** — the shape we want, which Clyde can refine as the code demands. Milestones, sequencing, and migration mechanics are Clyde's to design.

</aside>

<aside>
🔗

Companion to [Feature Proposal: Adjustable Linked Panes & Building Type Consolidation](https://app.notion.com/p/Feature-Proposal-Adjustable-Linked-Panes-Building-Type-Consolidation-a7d6eff99e6d4dfb9244a5cb4715e204?pvs=21), which owns the **palette UX** (variant dropdown, resizable panes). This briefing owns the **data layer beneath it** — schema, merge, categories, colors. Keep them in sync: the UX work assumes the variant-aware schema described here.

</aside>

## 1. The mission

M2–M4 shipped a working catalog (156 buildings in `src/data/buildings-1800.json`), production math (`productionMath.ts`, 32 buildings / 47 goods), and an M4 sprite pass that added a per-category accent band.[[1]](https://app.notion.com/p/Anno-Planner-Development-Roadmap-373fe8ecae8f81e992f8d23ff4a6229c?pvs=21) The data layer came out incomplete. Three gaps to close before they harden into a shipped v1:

- **Two disconnected datasets.** Catalog data and production-chain data live apart — the [Production Chain Data (JSON)](https://app.notion.com/p/Production-Chain-Data-JSON-ec3a45d68c5040a2adcb795b772f590c?pvs=21) doc even leaves `footprint` as `null` on purpose. Nothing authoritative joins a building to its recipe.
- **A bloated palette.** Near-duplicate entries (upgrade tiers, icon-only skins, single-property variants like Farmer vs Worker residence) slow placement.
- **Colors that mean nothing.** The M4 accent band reads as random because it was never tied to a defined dimension.

## 2. Scope

<aside>
🌍

**Full catalog — all regions and all DLC — in this pass** (Ian: "consolidate now"). Not Old-World-only. New World / Arctic / Enbesa and every DLC building get folded in the same migration. The breadth cost lands mostly in the audit/reconciliation step.

</aside>

## 3. Locked decisions (constraints)

| **Question** | **Decision** |
| --- | --- |
| Merge production data into building data? | **Yes** — one unified building schema. |
| What drives collapsing entries? | **All three classes** (upgrade tiers, icon-only skins, single-property variants), behind **one variant selector**. |
| What do colors encode? | **Category** — Residence / Production / Public Service (+ Infrastructure fallback). |
| Canonical source going forward? | **A new merged file** built from `buildings-1800.json` and the Production Chain Data JSON. |
| Default variant on placement? | **Lowest-tier / base variant.** |
| Buildings outside the three categories? | **Infrastructure bucket, neutral color** (roads, harbor, ornamental, monuments). |
| DLC + non-Old-World regions? | **Consolidate now** — full catalog in this pass. |
| Extractors / mines / farms category? | **All "Production."** |

## 4. The terrain — what's actually on the ground

Highest-value intel. These are the facts about the existing code/data Clyde shouldn't have to rediscover:

- **`buildings-1800.json` (156 buildings)** was extracted from `resources/presets.json` (Anno Designer community dataset, v5.1). The schema lives in **`src/types/domain.ts`** and already carries `iconFile`, `size`, `workRadius`, `overlayType`, **`group`**, and DLC badges (Seat of Power, Docklands, Empire of the Skies, Seeds of Change).[[1]](https://app.notion.com/p/Anno-Planner-Development-Roadmap-373fe8ecae8f81e992f8d23ff4a6229c?pvs=21)
- **`overlayStore.ts`** defines **13 service buildings** with overlay types: `market, pub, church, fire, police, education, health, bank, culture, power`. That enum is the backbone of the Public Service category.
- **Production Chain Data JSON** models **32 buildings / 47 goods** with recipes, `baseCycleSeconds`, `requiresElectricity`, and the clean 1:1 input rule. Watch-outs baked into it:[[2]](https://app.notion.com/p/Production-Chain-Data-JSON-ec3a45d68c5040a2adcb795b772f590c?pvs=21)
    - `footprint` is intentionally `null` (placement was out of scope) — footprints must come from `buildings-1800.json`, not this file.
    - Entries flagged `verify: true` have correct topology but unconfirmed cycle times.
    - It references New World inputs (`red_peppers`, `cattle`) **not yet in the goods list**, and stubs New World / Arctic / Enbesa / Engineer goods in an `extend` block.
- **`productionMath.ts`** currently sources recipes independently; after the merge it must read recipes **off the unified building record**. The Furnace → Steelworks + Weapons ratio is the validated regression anchor — keep it green.
- **The M4 "category accent band" is the random-looking color.** Theme is Anno gold (`--accent: #c8a96e`); the minimap also tints placements.
- **Back-compat is a hard constraint.** Persistence is Dexie/IndexedDB (`current` + UUID slots); JSON import validates `buildingId`s and skips unknowns; share links are LZ-string `#bp=` fragments decoded on mount. **Building ids are a public contract** — preserve every legacy id (ideally as the variant `id`) or ship an alias map, or saved blueprints and shared URLs break.
- **`group` already exists** in the schema — it's the natural family key for consolidation, not something to invent.

## 5. Prior art & upstream source

- **Anno Designer's `presets.json`** is the upstream the catalog was seeded from. Treat it as the reconciliation reference and the interop target — don't diverge the schema so far that re-importing community presets becomes painful.[[3]](https://app.notion.com/p/Anno-1800-Blueprint-Builder-Reference-6f946b1513754a56ab004aa6d67f7303?pvs=21)
- **Don't re-scrape the Fandom wiki.** It times out under load and the data's already extracted; use it only as a manual spot-check source.

## 6. Target shape (direction — refine on the ground)

The shape we're aiming for. Clyde owns the final types.

### Family + variant model

Each catalog entry becomes a **building family** with one or more **variants**. Shared identity/visuals on the family; per-tier/variant differences on the variant.

```tsx
type BuildingCategory = "residence" | "production" | "public_service" | "infrastructure"

type BuildingFamily = {
	id: string                  // family key (seed from `group`)
	name: string
	category: BuildingCategory  // drives palette grouping AND color
	region: "old_world" | "new_world" | "arctic" | "enbesa"
	dlc?: string
	defaultVariantId: string    // = lowest-tier variant
	variants: BuildingVariant[]
}

type BuildingVariant = {
	id: string                  // legacy building id, preserved for back-compat
	name: string
	iconFile: string
	size: [number, number]      // footprint from buildings-1800.json (never null)
	tier?: string
	order: number               // 0 = base/lowest = default
	// stats: buildCost, maintenance, workforce, capacity, needsProvided, overlayType, workRadius
	// production (merged in): requiresElectricity, baseCycleSeconds, outputPerMin, inputs[], output, verify
}
```

Goods stay a sibling `goods[]` table. Non-producing buildings simply omit the production fields. Every legacy `id` survives as a variant `id`.

### Category assignment

| **Category** | **Absorbs** | **Rule of thumb** |
| --- | --- | --- |
| `residence` | residence / house | Holds population. |
| `production` | forestry, farm, extractor, mine, factory, food-producer | Has an `output`. **Extractors/mines/farms included.** |
| `public_service` | the 13 overlay types + buff-radius (trade union, town hall) | Projects a service/overlay radius. |
| `infrastructure` | road, harbor/pier, ornamental, monument, everything else | Neutral fallback. |

Edge calls to resolve during the audit (don't let them silently default): **power plants** → `public_service` (the radius is the point, even though they consume oil); **trade union / town hall** → `public_service`; **harbor buildings** → `infrastructure`. Dual-fit buildings are assigned by primary in-game function, recorded once.

### Color (category only, one constant)

Residence = gold `#c8a96e` · Production = steel blue `#5b7a99` · Public Service = green `#5a9e6f` · Infrastructure = neutral gray `#6b7280`. Single `categoryColors` map, derived at render time (don't bake hex into records). Hex is tunable; the mapping is fixed.

### Consolidation guardrails (load-bearing)

- **Footprint match is necessary, not sufficient** — buildings must also share role/category, with **zero data loss** (every per-variant stat/recipe/need/icon/cost survives).
- Buildings with no variant relationship stay standalone (a family of one).
- **Default variant = lowest tier** (`order: 0`; tier order farmer ‹ worker ‹ artisan ‹ engineer ‹ investor).
- Switching variants swaps footprint/stats/recipe/icon atomically.

## 7. Where the bodies are buried (hazard map)

- **The merge is the risk, not the schema.** Joining two independently-authored datasets will surface mismatched ids, name drift, and recipes with no matching building. The reconciliation report is the real deliverable — budget for it.
- **Over-collapsing destroys information.** Loose grouping silently merges look-alikes and drops stats. The footprint-AND-role guardrail is non-negotiable.
- **Don't break saved blueprints.** Legacy building ids are a public contract (see §4). Preserve or alias them.
- **The variant dropdown taxes placement speed.** For the most-placed families (residences, warehouses) wire last-used / quick-select — mirrors the companion proposal's concern.[[4]](https://app.notion.com/p/Feature-Proposal-Adjustable-Linked-Panes-Building-Type-Consolidation-a7d6eff99e6d4dfb9244a5cb4715e204?pvs=21)
- **Resist more colors.** Category is the single color channel. If tier also needs signaling later, that's a second channel (badge), not more hues.

## 8. Definition of done (outcomes, not steps)

- One `building-catalog.json` is the only catalog the app loads; old split files archived.
- `productionMath.ts` reads recipes from the unified records — Furnace ratio test still green.
- Each consolidated family shows as one palette entry with a working variant selector; placing a variant yields the correct footprint + stats.
- Zero data loss: every pre-merge building maps to a reachable variant; saved blueprints + share URLs still resolve.
- Palette / minimap / placed tiles colored by category from the single `categoryColors` map.
- A reconciliation report exists and is clean (no unexplained unmatched records).

## 9. Not in scope / not Clyde's to decide

- The four decisions in §3 are Ian's and locked — don't relitigate them in the plan.
- Pane-resizing UX (companion proposal). Auto-upgrading already-placed buildings along a tier chain. Map-aware constraints (fertility, deposits). Net-new data authoring beyond what the two datasets already contain.

## 10. Your task, Clyde

Build the implementation plan on the ground. From orbit, the plan should at minimum cover: an **audit/reconciliation pass** first (it de-risks everything downstream), the **schema change** in `domain.ts`, the **merge/build script** and its output catalog + report, **app integration** (palette families, variant selector, `productionMath` repoint, category colors), a **test plan** anchored on the Furnace ratio + a no-data-loss check + back-compat for saved/shared blueprints, and a **rollback/cleanup** step that archives rather than deletes the source files. Sequence it so the risky data work is validated before any UI depends on it. Land the plan wherever the repo conventions put it (repo `docs/` or a child page here), and flag anything blocked or ambiguous back through the usual channel rather than guessing.