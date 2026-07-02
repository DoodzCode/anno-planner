# Codebase Audit — anno-planner (AOBB)

**Auditor:** Clyde (Citadel Officer, Claude Code)
**Date:** 2026-07-01
**Branch:** `review/refactor` @ `5a1866c`
**Scope:** Code quality, redundancy, testing, documentation
**Method:** Full source read (~3.5K lines src), config/CI inspection, live verification (`tsc -b`, `vitest run`, CI log cross-reference)

---

## Executive Summary

The codebase is small (~3,476 lines of TS/TSX), cleanly layered, and fully type-safe (`tsc -b`: 0 errors). Architecture-level problems are already accurately diagnosed by the existing `docs/refactor-implementation-plan.md`, which this audit independently verified against source and **endorses without correction** — its risk register (R1–R9) matches the code.

However, this audit found one **critical regression introduced by the latest commit** that the refactor plan does not know about, plus a set of redundancy, dead-code, and documentation gaps.

**Headline findings:**

1. 🔴 **The test suite is broken at HEAD.** Commit `5a1866c` bumped vitest 2.1.9 → 4.1.9; the config relies on `environmentMatchGlobs`, which was **removed in vitest 3**. The 4 Palette component tests now run in a `node` environment and fail with `ReferenceError: localStorage is not defined`. CI is green only because it hasn't run against this commit (CI triggers on push/PR to `main`/`dev` only). The next PR to `dev` goes red.
2. 🔴 **Vitest scans a stale git worktree** (`.claude/worktrees/clyde-proto-html`), doubling the suite from 67 to 134 tests and duplicating every failure.
3. 🟡 **No lint or format tooling exists at all** — no ESLint, no Prettier, nothing in CI beyond typecheck/test/build.
4. 🟡 **Playwright is a dead dependency** — in devDependencies, zero e2e tests, no config, never referenced.
5. 🟡 **Persisted metadata is self-inconsistent** — `gridSize {w:60,h:40}` written everywhere while the actual grid is 107×60; the Dexie v2 migration stamps blueprints `version: '0.2.0'` and then every autosave downgrades them back to `'0.1.0'`.

Verified suite state on this machine: **126 passed / 8 failed** (8 = 4 real failures × 2 via worktree duplication). All 8 share the same root cause (#1/#2 above).

---

## 1. Testing

### 1.1 🔴 CRITICAL — vitest 4 upgrade silently broke component tests

- `vite.config.ts:43-45` uses `environmentMatchGlobs` to give `src/__tests__/components/**` a jsdom environment. That option was deprecated in vitest 2.x and **removed in vitest 3**.
- `5a1866c` ("plan out codebase refactor") bumped `vitest ^2.1.8 → ^4.1.9` and `vite ^6.4.2 → ^8.0.16` inside a commit described as docs/planning. The option is now silently ignored → env stays `node` → `localStorage is not defined` at `palette.test.tsx:7`.
- The breakage was masked twice:
  - `defineConfig({...} as any)` (`vite.config.ts:57`) suppresses the type error that would have flagged the removed option.
  - CI only runs on push/PR to `main`/`dev`; last green run (2026-06-17, dev @ `28989a3`) predates the bump. Confirmed via CI logs: that run executed `palette.test.tsx` under vitest 2 and passed (67 tests).

**Fix (small, do first):** replace `environmentMatchGlobs` with either a `// @vitest-environment jsdom` docblock in `palette.test.tsx`, or vitest 4 `test.projects`. Remove the `as any` cast (import `defineConfig` from `vitest/config` for correct types). Verify `vitest run` = 67/67 green.

### 1.2 🔴 Stale worktree doubles the suite

`git worktree list` shows `.claude/worktrees/clyde-proto-html` (branch `clyde/proto-html` @ `d97feb3`) checked out **inside the repo**. Vitest's default include pattern picks up its copy of every test file → 134 tests instead of 67, every failure reported twice.

**Fix:** `git worktree remove` (or relocate agent worktrees outside the repo per `CONTRIBUTING.md`'s `../anno-planner-agent-wt` convention), **and** add `exclude: ['**/node_modules/**', '**/.claude/**']` to the vitest config so future worktrees can't leak in.

### 1.3 🟡 Coverage gaps

What exists is good: `productionMath.ts` held to 100% line/branch thresholds; `dataIntegrity.test.ts` validates the catalog JSON; `migration` and `paneLayout` covered.

Untested, in rough priority order:

| Target | Why it matters |
|---|---|
| `blueprintStore.ts` | undo/redo semantics, `MAX_HISTORY` cap, collision-rejected mutations — the app's core invariants |
| `lib/collide.ts`, `lib/grid.ts` | pure, trivially testable; refactor plan Phase 1 already names them as the safety net |
| `lib/share.ts` | encode→decode roundtrip, malformed-hash rejection, shape filtering |
| `lib/exportImport.ts` (importJSON path) | migration + unknown-id filtering logic is testable without FSAA |
| `state/persistence.ts` | Dexie v1→v2 upgrade path (mockable with `fake-indexeddb`) |

Coverage config only `include`s `src/lib/**` — stores and components are invisible to coverage reporting even where tests exist.

### 1.4 🟡 Playwright — dead dependency

`playwright ^1.60.0` in devDependencies. Zero e2e specs, no `playwright.config.*`, no references anywhere. Either implement the smoke suite (a canvas app genuinely benefits — the refactor plan's manual characterization script is an obvious candidate for automation) or drop the dependency.

---

## 2. Redundancy & Dead Code

### 2.1 Duplicated logic

| Duplication | Locations | Fix |
|---|---|---|
| AABB overlap test — `boxesOverlap` is character-for-character the same algorithm as `footprintsOverlap` | `Canvas.tsx:48-50` vs `lib/grid.ts:32-37` | delete `boxesOverlap`, use the lib fn |
| Category-color fallback `'#6b7280'` lookup — `getBuildingColor` vs inline copy | `Canvas.tsx:13-16` vs `Minimap.tsx:54-55` | move `getBuildingColor` to `constants/categoryColors.ts` |
| Blueprint envelope literal (`{id, gridSize:{w:60,h:40}, metadata:{version:'0.1.0', dlcs:[]}, ...}`) built by hand **5×** | `App.tsx:56-61`, `App.tsx:71-76`, `persistence.ts:38-46`, `persistence.ts:53-65`, `exportImport.ts:55-63` | single `makeBlueprint(name, placements)` factory |
| Catalog→chain `resolve` callback | `Inspector.tsx:26-33` vs `productionMath.ts:171-186` | export one canonical resolver |
| `TIER_LABELS` — two different constants, same name, different shapes | `Palette.tsx:8-15` (single letters) vs `Inspector.tsx:37-41` (full names) | rename at minimum; co-locate in catalog if merged |

### 2.2 Dead / test-only code

- `CATEGORIES` (`catalog.ts:32-39`) — marked `@deprecated`, **zero consumers**. Delete.
- `computeTallies`, `inputRates`, `buildingsNeeded` (`productionMath.ts`) — the "back-compat API" has **no production callers**; only its own test file imports them. The legacy chain-map path inside `computeTallies` (catalogMap/chainNameMap/chainBuildingMap params) is unreachable from the app. Delete or consciously keep as public API — but the 100%-coverage threshold currently forces tests for code nothing uses.
- `Building` interface (`types/domain.ts:52-72`) — `@deprecated`; its only remaining consumer is the dead `computeTallies` signature. Deleting both removes the whole legacy layer.
- `src/data/icons/` — **1,873 PNGs, 30 MB**, and `iconFile` is never read by any component (only declared in types). Not bundled (never imported), but it bloats every clone and sits misleadingly inside `src/`. Move to `public/` when icon rendering ships, or out of the repo until then.

### 2.3 Data inconsistencies (redundant constants disagreeing)

- **`gridSize {w:60,h:40}`** hardcoded at all 5 envelope sites, while the real grid is `GRID_COLS=107, GRID_ROWS=60` (`lib/grid.ts:4-5`). Every export/save records a grid dimension the app doesn't use. Derive from grid constants in the `makeBlueprint` factory.
- **Schema version ping-pong:** Dexie v2 upgrade (`persistence.ts:17`) stamps `metadata.version = '0.2.0'`; the very next autosave (`persistence.ts:43`) rewrites `'0.1.0'`. Introduce one `SCHEMA_VERSION` constant.

---

## 3. Code Quality

### 3.1 What's good (briefly — it's a lot)

- Clean layering: `components / state / lib / data / types / hooks / constants`, dependency direction sane, no cycles.
- `lib/` is pure, well-JSDoc'd, and testable; `productionMath.ts` resource-flow design (namespaced `good:`/`workforce:` ids, injected resolver) is genuinely good.
- Strict TS passes with near-zero escapes (`as any` count: 1, the vite config — and that one caused finding 1.1).
- Store discipline is solid: immer-wrapped Zustand, history capped, collision checks pre-mutation, `getState()` used deliberately in event handlers to avoid stale closures (and commented as such).
- Migration handled at all three ingress points (file import, share URL, Dexie upgrade).

### 3.2 Known-and-planned: Canvas god file

`Canvas.tsx` (609 lines) mixes interaction FSM, keyboard shortcuts, two pan mechanisms, paint mode, box-select, drag collision math, context-menu positioning, minimap scheduling, and all Konva rendering. **Not re-litigated here** — the refactor plan covers it, and this audit verified the plan's R1–R9 risks against source: all accurate, including the subtle ones (R5 click-suppression ref ordering, R6 dual pan paths, R9 `onStageReady` contract with `App.tsx:137`).

### 3.3 Smaller findings

- 🟡 `Canvas.tsx:114-116` — `useEffect` **without a dependency array**: `onStageReady` fires on every render. Harmless with App's current ref-assign callback, but a state-setting callback would loop. Add `[onStageReady]` deps or a fired-once guard.
- 🟡 `persistence.ts:35-48` — autosave subscriber is async and unawaited; rapid successive edits can interleave `db.blueprints.put()` calls with no ordering guarantee (a slow older write can land after a newer one). Low probability, worth a serializing queue or debounce.
- 🟡 Escape-key double handling: Canvas's window-level keydown (`Canvas.tsx:200-204`) and BlueprintLibrary's Escape-to-close (`BlueprintLibrary.tsx:38-42`) both fire when the modal is open — closing the library silently also clears canvas selection and active building. Behavior quirk; log it, don't fold it into the behavior-preserving refactor.
- 🟡 No React ErrorBoundary anywhere — a render error white-screens an offline-first app whose data lives client-side. Cheap insurance.
- 🟢 Error handling style is consistent and intentional (silent-null on share decode, try/catch with fallbacks on localStorage/clipboard/FSAA). `importJSON`'s skipped-placement count goes only to `console.warn` — surfacing it in the existing toast would help users.
- 🟢 `overlayStore.isActive` is defined but unused (callers read `active` directly). Trivial.

### 3.4 Tooling hygiene

- **No ESLint, no Prettier, no config of either.** Style is currently consistent (semicolon-free, 2-space) purely by discipline. With two humans + agent teams contributing, add ESLint flat config (`typescript-eslint` + `react-hooks` — the latter would have flagged 3.3's missing dep array) and wire into CI.
- CI itself is appropriately lean (typecheck → test → build on Node 20). Add lint step once it exists.

---

## 4. Documentation

| Artifact | State |
|---|---|
| `README.md` | **Missing.** Repo root has no landing doc — no what/why/quickstart/screenshot. First thing a new contributor hits. |
| `AGENTS.md` | **Missing but referenced** — the Tyr review prompt (`docs/review_6_18.md:10`) instructs reading it; it doesn't exist. Either create (agent onboarding portal summarizing CONTRIBUTING's agent sections) or stop referencing. |
| `CONTRIBUTING.md` | **Strong.** Branch strategy, human/agent role split, 15 enforced guardrails, tracker protocol. Best doc in the repo. |
| `docs/ROADMAP.html` | Authoritative tracker (HTML-as-authority is established project convention). Maintained. |
| `docs/refactor-implementation-plan.md` | High quality; verified accurate against source this session. Note: **uncommitted modifications** in working tree — commit it. |
| Inline docs | `lib/` well-JSDoc'd; stores/components sparse but the code is readable. Adequate. |
| CHANGELOG | None — history lives in ROADMAP.html + commit log. Acceptable at this scale. |

---

## 5. Recommended Follow-ups (priority order)

1. **Fix the test suite** (blocks everything, ~30 min): vitest-4-compatible env config, drop `as any` from `vite.config.ts`, add worktree exclude, prune `.claude/worktrees/clyde-proto-html`. Gate: `vitest run` 67/67 green. *Must land before refactor Phase 1 — the plan's safety net presumes a green suite.*
2. **Commit or discard** the dirty `docs/refactor-implementation-plan.md` working-tree edit.
3. **Add ESLint (flat config) + Prettier + CI lint step.** Include `react-hooks` rules.
4. **Extract `makeBlueprint()` factory**; fix `gridSize` to derive from `GRID_COLS/GRID_ROWS`; single `SCHEMA_VERSION` constant (kills five duplications and both data inconsistencies in one small PR).
5. **Delete dead code:** `CATEGORIES`, `computeTallies` legacy path + `Building` interface (+ their test-only siblings), `overlayStore.isActive`. Decide playwright: implement smoke e2e or remove dependency.
6. **Expand unit tests** per §1.3 — folds naturally into refactor plan Phase 1 (which already targets `collide`/`grid`/FSM).
7. **Write `README.md`**; create or de-reference `AGENTS.md`.
8. **Relocate `src/data/icons/`** (30 MB) out of `src/` until icon rendering ships.
9. **Add an ErrorBoundary** and surface `importJSON` skip-count via toast.
10. **Proceed with the refactor plan as written** — endorsed; risks R1–R9 verified accurate.

Items 1, 2, 4, 5 are small and mechanical; 3 and 6 are the real investment; everything else is opportunistic.

---

*Verification evidence: `tsc -b` clean; `vitest run` 126/8 with both failure classes root-caused; CI run 27660025011 log confirms palette tests passed under vitest 2 on dev @ 28989a3; `git show 5a1866c` confirms the 2.1.9→4.1.9 bump; dead-code claims grep-verified (zero non-test consumers).*
