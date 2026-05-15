# Design: Agent Protocols, Scripts, and Live State Tracking

**Date:** 2026-05-15
**Author:** Clyde (with Ian)
**Status:** Approved design — ready for implementation plan
**Scope:** Establish in-repo agent protocols, bash scripts for frequent actions, and a live state-tracking system that powers the existing `dashboard/index.html`.

---

## 1. Goals

1. Coding agents and human developers operate on a shared, in-repo source of truth for task and project state.
2. Frequent, repeatable agent actions are wrapped in bash scripts so they execute consistently regardless of which agent runs them.
3. Agent skills (protocols) live in-repo as readable markdown and gate non-obvious actions: task assessment, escalation, coding standards, code structure, valid sources, session protocol, PR protocol, and code-graph use.
4. The existing `dashboard/index.html` becomes a live view over the state instead of a hand-maintained file.
5. `code-review-graph` (CRG) is integrated as both a redundancy/impact guard and a queryable knowledge graph via its MCP server.

## 2. Non-Goals

- No new frontend frameworks or build tools for the dashboard. Vanilla HTML/CSS/JS only.
- No backend or hosted service. Everything is files in the repo plus local bash + standard CLI tools.
- No automated decision-making by agents on stack, framework, or architectural choices (those remain human gates per `CONTRIBUTING.md`).
- No mandatory KoadOS/Citadel coupling. Citadel hooks are optional power features detected at runtime.

## 3. Coupling Model

**Hybrid: default loose, Citadel-aware.**

- Core flow (state files, scripts, dashboard, CRG) is portable: depends only on `git`, `jq`, `notify-send`, `code-review-graph`, and standard coreutils.
- Optional Citadel integration is feature-detected at runtime (`command -v koad`):
  - `blocker.sh` additionally calls `koad signal send <owner>` if available.
  - Session journals may be mirrored to CASS via a separate (later) bridge.
- The system runs unchanged on a machine without Citadel.

## 4. Directory Layout

```
anno-planner/
├── agent/
│   ├── state/
│   │   ├── milestones.json          # derived counters per milestone
│   │   ├── tasks.json               # source of truth for all tasks
│   │   ├── decisions.json           # mirrors brainstorm §8 + new decisions
│   │   ├── blockers.md              # append-only blocker log
│   │   ├── .crg-status.json         # last graph build snapshot
│   │   ├── .agent-session           # symlink → current session file
│   │   └── sessions/
│   │       ├── .gitkeep
│   │       ├── YYYY-MM-DD-<agent>-<slug>.md
│   │       └── archive/             # sessions >30 days old
│   ├── scripts/
│   │   ├── lib/
│   │   │   └── common.sh            # repo-root, jq wrappers, logging, notify
│   │   ├── hooks/
│   │   │   ├── post-commit          # append commit to session log
│   │   │   ├── pre-push             # run quality-check (incl. tests)
│   │   │   └── post-merge           # graph-update
│   │   ├── tests/
│   │   │   ├── bats/                # bats-core (submodule or vendored)
│   │   │   ├── helpers.bash
│   │   │   ├── fixtures/            # seeded tasks/milestones/decisions/ROADMAP
│   │   │   ├── mocks/               # notify-send, koad, code-review-graph stubs
│   │   │   ├── integration/         # tier-2 e2e tests (opt-in)
│   │   │   └── *.bats               # one per script or per script class
│   │   ├── test.sh                  # bats runner
│   │   ├── bootstrap.sh             # one-time setup
│   │   ├── agent-start.sh
│   │   ├── agent-status.sh
│   │   ├── task-claim.sh
│   │   ├── task-complete.sh
│   │   ├── task-add.sh
│   │   ├── decision-resolve.sh
│   │   ├── blocker.sh
│   │   ├── session-log.sh
│   │   ├── session-end.sh
│   │   ├── dashboard-refresh.sh
│   │   ├── spec-check.sh
│   │   ├── quality-check.sh
│   │   ├── pr-prep.sh
│   │   ├── roadmap-sync.sh
│   │   ├── worktree-new.sh
│   │   ├── worktree-clean.sh
│   │   ├── graph-bootstrap.sh
│   │   ├── graph-update.sh
│   │   ├── graph-watch.sh
│   │   ├── graph-impact.sh
│   │   ├── graph-status.sh
│   │   ├── find-similar.sh
│   │   ├── building-add.sh          # M2-deferred but stubbed
│   │   ├── wiki-cache-warm.sh       # M2-deferred but stubbed
│   │   ├── wiki-fetch.sh            # M2-deferred but stubbed
│   │   ├── coverage-report.sh
│   │   ├── bundle-budget.sh
│   │   └── cleanup.sh
│   └── skills/
│       ├── README.md
│       ├── task-assessment.md
│       ├── coding-standards.md
│       ├── code-structure.md
│       ├── valid-sources.md
│       ├── escalation.md
│       ├── session-protocol.md
│       ├── pr-protocol.md
│       └── code-graph.md
├── dashboard/
│   └── index.html                   # rewired to fetch ../agent/state/*.json
├── docs/
│   ├── ROADMAP.md                   # narrative — synced with tasks.json via roadmap-sync.sh
│   └── superpowers/specs/           # this file lives here
├── CONTRIBUTING.md
└── CLAUDE.md
```

**Principles:**
- `agent/state/` = data; agents write.
- `agent/skills/` = rules; agents read.
- `agent/scripts/` = verbs; agents run.
- `dashboard/` is read-only view over `agent/state/`.
- `docs/ROADMAP.md` remains the human narrative; `tasks.json` is the machine truth. `roadmap-sync.sh` reconciles them.

## 5. State Schemas

### 5.1 `tasks.json`

```json
{
  "tasks": [
    {
      "id": "T-0001",
      "milestone": "M0",
      "title": "Scaffold Vite project with chosen framework",
      "status": "todo",
      "owner": null,
      "assignedAgent": null,
      "estHours": 2,
      "actualHours": null,
      "blockedBy": [],
      "createdAt": "2026-05-15T00:00:00Z",
      "completedAt": null,
      "notes": "",
      "sourceUrls": []
    }
  ]
}
```

- `status` ∈ `todo | active | done | blocked`.
- `owner` ∈ `kaleb | ian | both | null`.
- `assignedAgent` is freeform string (e.g. `clyde`, `cavecrew-builder`).
- `blockedBy` lists decision IDs (`D-001`) or task IDs (`T-0007`).
- `sourceUrls` cites authoritative refs per `valid-sources.md`.

### 5.2 `milestones.json`

```json
{
  "updated": "2026-05-15T17:30:00Z",
  "milestones": [
    {
      "id": "M0",
      "name": "Spike",
      "estDays": [1, 2],
      "status": "active",
      "owner": "both",
      "taskCounts": { "done": 0, "active": 0, "todo": 4, "blocked": 0, "total": 4 },
      "goal": "Pick stack, render grid, place one building"
    }
  ]
}
```

`status` ∈ `pending | active | done | blocked`. Counters are derived; never edited by hand. `dashboard-refresh.sh` regenerates this file.

### 5.3 `decisions.json`

```json
{
  "decisions": [
    {
      "id": "D-001",
      "topic": "Framework",
      "status": "open",
      "options": ["React+Vite", "Svelte/SvelteKit"],
      "chosen": null,
      "rationale": null,
      "decidedAt": null,
      "decidedBy": null,
      "supersededBy": null
    }
  ]
}
```

`status` ∈ `open | decided | superseded`. `superseded` decisions retain history and link to the replacement via `supersededBy`.

### 5.4 `blockers.md`

Append-only markdown log. One entry per `blocker.sh` call:

```
## 2026-05-15T17:42Z — T-0001 — clyde — BLOCKED
**What:** <blocker description>
**Tried:** <what was attempted>
**Need:** <what unblocks>
**Notified:** notify-send fired; koad signal sent: yes/no.
---
```

### 5.5 `sessions/<date>-<agent>-<slug>.md`

```
# Session YYYY-MM-DD — <agent> — <slug>

## Goal
<one paragraph>

## Tasks
- T-NNNN (claimed HH:MM, completed HH:MM)

## Decisions made
<list or "None">

## Blockers raised
<list or "None">

## Notes
- HH:MM <note>

## Commits
- <sha> <subject>

## Handoff notes
<next-session pickup>
```

### 5.6 `.crg-status.json`

```json
{
  "lastBuild": "2026-05-15T17:00:00Z",
  "lastUpdate": "2026-05-15T17:25:00Z",
  "nodes": 0,
  "edges": 0,
  "fresh": true
}
```

`fresh` = `lastUpdate` within 24h **and** no commits on `HEAD` newer than `lastUpdate`.

## 6. Bash Scripts

### 6.1 Conventions

- All scripts source `agent/scripts/lib/common.sh`.
- All scripts support `--help` and `--dry-run`.
- Exit codes: `0 ok`, `1 user error`, `2 state error`, `3 external dep missing`.
- All `tasks.json` / `milestones.json` / `decisions.json` edits are atomic: `jq … > tmp && mv tmp file`.
- State-modifying scripts append an entry to the current session file via `session-log.sh`.
- Scripts resolve repo root via `git rev-parse --show-toplevel`.

### 6.2 Script catalog

#### Core flow

| Script | Usage | Behavior |
|---|---|---|
| `bootstrap.sh` | `bootstrap` | One-time setup. Verify deps, seed state files from `ROADMAP.md` + brainstorm §8, install git hooks, run `graph-bootstrap`. Idempotent. |
| `agent-start.sh` | `agent-start <task-id> [--agent <name>]` | Detect human branch, create worktree, claim task, open session file, dump context (task + milestone + decisions + last 3 sessions + graph status). Sets `.agent-session` symlink. |
| `agent-status.sh` | `agent-status` | One-shot summary: active sessions, active tasks, active worktrees, blocked items. |
| `task-claim.sh` | `task-claim <task-id> [--agent <name>]` | Set owner, assignedAgent, status=active. Refuse if already active under different owner. |
| `task-complete.sh` | `task-complete <task-id> [--actual-hours N]` | Run `quality-check` then `graph-update`. On pass, set status=done, completedAt=now, actualHours. Run `dashboard-refresh`. Append commit list to session. |
| `task-add.sh` | `task-add --milestone Mn --title "…" [--est H] [--owner <name>]` | Append task with auto-ID `T-NNNN`. Refresh dashboard. |
| `decision-resolve.sh` | `decision-resolve <D-ID> --chosen "…" --rationale "…"` | Move decision open→decided. Unblock any tasks `blockedBy` this ID. Refresh dashboard. |
| `blocker.sh` | `blocker <task-id> --what "…" --tried "…" --need "…"` | Append to `blockers.md`. Set task status=blocked. `notify-send`. If `koad` present, `koad signal send <owner>`. |
| `session-log.sh` | `session-log [--section <name>] "<note>"` | Append timestamped line to current session file. Sections: `notes` (default), `decisions`, `blockers`, `commits`. |
| `session-end.sh` | `session-end --handoff "<text>"` | Write handoff section, list commits since session start, archive session file, push branch. |

#### Maintenance

| Script | Usage | Behavior |
|---|---|---|
| `dashboard-refresh.sh` | `dashboard-refresh` | Recompute `milestones.json` counters from `tasks.json`. Update `updated` timestamp. Called as post-write hook by every mutation script. |
| `spec-check.sh` | `spec-check <path>` | Scan for `TBD\|TODO\|TKTK\|FIXME\|XXX\|< *placeholder *>`. Exit 1 on any hit. |
| `quality-check.sh` | `quality-check [--scope changed\|all]` | Run `npm run lint`, `npm run typecheck`, `npm test`. Skip silently if scripts absent (pre-M0). Grep diff for stretch keywords (`optimizer\|webrtc\|yjs\|multiplayer\|mod-loader`); warn. With `--scope changed`, include `graph-impact`. |
| `pr-prep.sh` | `pr-prep [--target dev\|<branch>]` | Run `quality-check`. Generate PR body to stdout (what / why / reviewer checklist / impact / handoff). |
| `roadmap-sync.sh` | `roadmap-sync [--check\|--write]` | Reconcile `docs/ROADMAP.md` checkboxes ↔ `tasks.json`. `--check` exits 1 on drift; `--write` updates `ROADMAP.md` from `tasks.json`. |
| `cleanup.sh` | `cleanup` | Prune merged worktrees; archive sessions >30 days to `sessions/archive/`. |

#### Worktree

| Script | Usage | Behavior |
|---|---|---|
| `worktree-new.sh` | `worktree-new <task-id>` | `git worktree add ../anno-planner-wt-<task-id> <human-branch>` then cut sub-branch `<human>/<task-id>-<slug>`. |
| `worktree-clean.sh` | `worktree-clean` | List + prune merged worktrees. Refuse on uncommitted changes. |

#### CRG

| Script | Usage | Behavior |
|---|---|---|
| `graph-bootstrap.sh` | `graph-bootstrap` | `crg register` + `crg init` (MCP install) + `crg build`. Idempotent. |
| `graph-update.sh` | `graph-update` | `crg update`. Cheap. Called by `task-complete` and `post-merge`. Refreshes `.crg-status.json`. |
| `graph-watch.sh` | `graph-watch [--stop]` | Background `crg watch` via `nohup`; PID in `.crg-watch.pid`. |
| `graph-impact.sh` | `graph-impact [--base dev]` | `crg detect-changes` against base. Emits affected modules + downstream consumers. Embedded in PR body. |
| `graph-status.sh` | `graph-status` | `crg status`. Writes `.crg-status.json`. |
| `find-similar.sh` | `find-similar "<query>"` | Wrapper over CRG semantic query for redundancy guard. |

#### Domain / catalog (M2-deferred — stubbed in initial implementation)

| Script | Usage | Behavior |
|---|---|---|
| `building-add.sh` | `building-add --slug <s> --tier <t> …` | Append to catalog JSON; schema validate; cite wiki URL in task notes. |
| `wiki-fetch.sh` | `wiki-fetch <building-slug>` | Fetch + cache Anno wiki page. |
| `wiki-cache-warm.sh` | `wiki-cache-warm <list-file>` | Bulk pre-fetch. |

#### Quality / health

| Script | Usage | Behavior |
|---|---|---|
| `coverage-report.sh` | `coverage-report` | Per-module test coverage breakdown. |
| `bundle-budget.sh` | `bundle-budget [--threshold-kb N]` | Vite bundle size check vs threshold. |

### 6.3 Script testing

**Framework:** `bats-core` (Bash Automated Testing System). Installed via system package manager or vendored as a git submodule at `agent/scripts/tests/bats/`. Tests are first-class — scripts ship with tests, not as an afterthought.

**Layout:**

```
agent/scripts/tests/
├── bats/                      # bats-core (submodule or vendored)
├── helpers.bash               # shared setup / teardown / asserts
├── fixtures/
│   ├── tasks.json             # seeded sample state
│   ├── milestones.json
│   ├── decisions.json
│   ├── ROADMAP.md             # for roadmap-sync tests
│   └── session-template.md
├── mocks/
│   ├── notify-send            # echoes to $NOTIFY_LOG; chmod +x
│   ├── koad                   # echoes to $KOAD_LOG; chmod +x
│   └── code-review-graph      # stub responses per command; chmod +x
├── core_flow.bats             # agent-start, task-claim, task-complete, task-add
├── decisions.bats             # decision-resolve, blockers cascade
├── blockers.bats              # blocker.sh, escalation paths
├── session.bats               # session-log, session-end, .agent-session symlink
├── dashboard.bats             # dashboard-refresh counter math, idempotency
├── quality.bats               # quality-check scope-creep detection, exit codes
├── roadmap_sync.bats          # tasks.json ↔ ROADMAP.md drift detection
├── crg.bats                   # graph-* scripts against mocked crg binary
├── pr_prep.bats               # PR body generation, impact section inclusion
├── worktree.bats              # worktree-new / worktree-clean
├── hooks.bats                 # post-commit / pre-push / post-merge hook content
├── bootstrap.bats             # bootstrap idempotency, dep checks
└── lib_common.bats            # jq_edit atomicity, repo_root, notify fallback
```

**Test isolation per case:**

1. `setup()` creates a temp dir via `mktemp -d`, runs `git init`, copies fixtures into `agent/state/`.
2. Prepends `agent/scripts/tests/mocks/` to `$PATH` so mocked `notify-send` / `koad` / `code-review-graph` override real binaries.
3. Runs the script under test.
4. Asserts on resulting file contents (jq queries for JSON, grep for markdown).
5. `teardown()` removes temp dir.

**Coverage rules — every script must have:**

- `--help` test (exit 0, non-empty stdout).
- `--dry-run` test (no state changes on disk).
- Happy-path test (state mutated as expected).
- At least one error path test (bad args, missing file, etc. — exit code asserted).

**Additional rules per script class:**

- State-mutating scripts: **idempotency test** — running the same command twice either is a no-op the second time or fails cleanly with a recognizable exit code.
- JSON-editing scripts: **schema test** — the resulting JSON validates against an inline `jq` schema check (required fields present, types correct).
- Notify-sending scripts: assert `$NOTIFY_LOG` contains expected payload.
- Citadel-aware scripts: tested with and without `koad` on `$PATH` to verify graceful degradation.

**Mocks:**

- `notify-send` → appends `"$@"` to `$NOTIFY_LOG`. Always exit 0.
- `koad` → appends `"$@"` to `$KOAD_LOG`. Always exit 0. Toggle "present/absent" by `PATH` manipulation.
- `code-review-graph` → dispatches on `$1`: `status` returns canned JSON; `update`/`build` return success; `detect-changes` returns canned module list. Real `crg` is reserved for integration tier.

**Helpers (`helpers.bash`):**

- `assert_exit_code <expected>`
- `assert_json_field <file> <jq-path> <expected>`
- `assert_file_contains <file> <pattern>`
- `assert_notify_sent <pattern>`
- `make_temp_repo` — full repo setup with fixtures.
- `seed_active_session` — creates a session file and `.agent-session` symlink.

**Runner:**

`agent/scripts/test.sh`:

```
Usage: test.sh [--filter <pattern>] [--verbose]
Runs all *.bats files in agent/scripts/tests/.
Exits 0 on all pass, non-zero on any fail.
Prints summary: <n>/<total> passing, with file/line of any failures.
```

**CI integration:**

- `pre-push` hook (§9) calls `quality-check.sh` which now also runs `test.sh` for any script changes in the diff (`git diff --name-only HEAD@{upstream} HEAD | grep -q '^agent/scripts/'`).
- Full `test.sh` run is part of `bootstrap.sh` final step ("ready" gated on green tests).
- `agent/skills/coding-standards.md` adds rule: "New script → new bats file. PR `quality-check` will refuse otherwise."

**Tier 2 (integration tests, run on demand, not in pre-push):**

`agent/scripts/tests/integration/`:

- End-to-end workflow test: temp repo → `bootstrap` → `task-add` → `agent-start` → fake commit → `task-complete` → assert dashboard JSON state.
- Real `code-review-graph` invocation against a tiny seeded source tree.
- Invoked manually via `test.sh --integration`.

### 6.4 `lib/common.sh` responsibilities

- `repo_root()` — wraps `git rev-parse --show-toplevel`.
- `state_file <name>` — resolves `agent/state/<name>`.
- `jq_edit <file> <jq-expr>` — atomic edit via temp file.
- `log_info / log_warn / log_error` — colorized stderr.
- `notify <title> <body>` — `notify-send` with `printf`-stderr fallback.
- `iso_now()` — ISO-8601 UTC timestamp.
- `current_session()` — read `.agent-session` symlink, return path or fail.
- `require_dep <name>` — exit 3 if `command -v <name>` missing.
- `koad_present()` — boolean for optional Citadel hooks.

## 7. Agent Skills

### 7.1 Index file `README.md`

Lists all skills with one-liner each. States invocation rule: agents read the relevant skill before any matching action. Cross-references the script that automates each protocol where one exists.

### 7.2 `task-assessment.md`

Gate before any task work:

1. Read task by ID from `tasks.json`.
2. Read linked milestone goal from `milestones.json`.
3. Read all open decisions; fail-fast if any `blockedBy` decision is open.
4. Spec clarity check: run `spec-check.sh` on linked docs. For each requirement, state input/output/success criterion. If unclear, write questions to session log, run `blocker.sh`, stop.
5. "Good work" definitions:
   - Scaffold: builds clean, runs, smoke-tested.
   - Feature: passes `quality-check` and acceptance criteria in `task.notes`.
   - Bugfix: failing test added first (TDD), then green.
   - Catalog data: matches wiki, schema-validated.
6. Past session review: read 3 most recent sessions; grep for milestone tag + related names.
7. Budget: `estHours` is soft cap. At 1.5× → notify via `blocker.sh "over-budget"`. At 2× → stop, escalate.
8. Redundancy check: `find-similar.sh` query for existing similar code.
9. Only after gates pass → `task-claim.sh`.

### 7.3 `coding-standards.md`

**Patterns:**
- Pure functions for math and serialization.
- Module boundaries: `state | rendering | persistence | math | export` — never cross-import.
- State mutations only through store actions (Immer middleware).
- Components are dumb; logic in stores/hooks.
- Single owner per state slice.

**Anti-patterns (flagged in review):**
- Components > 200 lines → split.
- Cyclic deps (CRG flags).
- Inline magic numbers → `constants.ts` per module.
- Re-implementing existing utility (CRG check required).

**Techniques:**
- TDD for math + serialization. Snapshot tests for canvas render.
- Undo/redo via Immer history middleware.
- Persistence debounce 250ms.
- Error boundary at canvas root.

### 7.4 `code-structure.md`

Target module layout (placeholders until M0 stack decision):

```
src/
├── state/        # stores, slices, history
├── canvas/       # render + input
├── catalog/      # building data + palette UI
├── math/         # production + influence (pure)
├── persistence/  # idb, fs-access
├── export/       # png, json, url-share
├── ui/           # shared components
└── lib/          # framework-agnostic helpers
```

**Rules:**
- File budget: 200 lines soft / 400 hard.
- One default export per file.
- Tests colocated: `foo.ts` + `foo.test.ts`.
- No barrel re-exports beyond 5 items.
- Naming: kebab-case files, PascalCase components, camelCase functions.
- Imports ordered: stdlib > third-party > absolute > relative.

**Redundancy guard:**
- Before new utility → CRG query.
- Before new component → `grep ui/`.
- Before new state slice → check adjacent concerns.

### 7.5 `valid-sources.md`

**Game data:**
- Primary: Anno 1800 official wiki (anno1800.fandom.com).
- Accept community datasets only with citation + wiki cross-check.
- Reject forum/reddit/video sources.

**Code / library docs:**
- React / Svelte / Pixi / Konva official sites.
- MDN for web APIs.
- TypeScript official docs.
- Context7 MCP for live SDK lookups before writing against an API.

**Rejects:** Stack Overflow >2 years old without verification, AI blog summaries, tutorials >3 years old.

**Citation rule:**
- Catalog data tasks: source URL + retrieval date in `task.notes` / `sourceUrls`.
- Code lifted >20 LOC: cite + verify license.

### 7.6 `escalation.md`

**Triggers:** unresolved spec ambiguity; open decision blocking task; `quality-check` failing after 2 attempts; time at 1.5×/2× est; scope discovered > documented; math result conflicts with brainstorm; `graph-impact` shows >5 unrelated modules.

**How:** run `blocker.sh`; session-log entry; auto `notify-send`; optional `koad signal`; park task at `blocked`; do not continue.

**Never:** silently pick architecture decisions; skip `quality-check`; force-push or rewrite history; touch `dev` or `main` directly.

### 7.7 `session-protocol.md`

**Start:** `agent-start.sh`; read session header; read 3 most recent sessions; run `graph-status.sh`.

**During:** `session-log.sh` for non-obvious decisions; post-commit hook auto-records commits; re-read `task-assessment.md` on scope shift.

**End:** `session-end.sh --handoff "…"`; writes handoff + commit log; pushes branch; dashboard refreshes.

### 7.8 `pr-protocol.md`

**Branch:** worktree branch from human personal branch. Naming `<human>/<task-id>-<slug>`.

**Commits:** Conventional Commits; subject ≤50 chars; body for non-obvious why; one logical change per commit.

**PR:** target = human personal branch (never `dev` or `main`). Body via `pr-prep.sh` includes: what / why / reviewer checklist (from `CONTRIBUTING.md`) / impact (CRG) / handoff. Open via `pr-prep.sh | gh pr create --body-file -`.

### 7.9 `code-graph.md`

**When to consult CRG:**
- Before edits touching >2 files.
- Before any refactor or rename.
- During spec review (redundancy check).
- Before adding a new utility, component, or state slice.

**MCP query examples:** "find all consumers of X"; "what depends on this module"; "who calls this function"; "find code similar to <description>".

**When to regenerate:** after large refactors or large renames; otherwise watch/post-merge keeps it fresh.

**Wiki use:** `crg wiki` → `agent/state/wiki/` for browsable codebase reference.

## 8. Dashboard Integration

`dashboard/index.html` keeps current CSS and structure. Replaces hardcoded values with `fetch('../agent/state/<file>')` calls. Vanilla JS only.

**Section bindings:**

| Card | Source |
|---|---|
| Milestones strip | `milestones.json` — loop, build `.milestone` divs |
| Current Focus | `tasks.json` filter `status !== 'done' && milestone === activeMilestone` |
| Open Decisions | `decisions.json` |
| Branch Structure | static |
| Agent Guardrails | static |
| Graph Health | `.crg-status.json` |
| Active Sessions | scan `sessions/` for files modified <24h |
| Recent Blockers | tail last 5 `blockers.md` entries |
| Observability tile | tail 10 most-recent session-log lines across all sessions |
| Updated timestamp | max(state file mtimes) |

**Behavior:**
- Auto-refresh every 30s while open.
- Stale-data warning banner if any state file mtime >2 days old.
- On `fetch` failure (e.g. file://): inline hint to run `python3 -m http.server 8000` in `anno-planner/`.

## 9. Git Hooks

Installed by `graph-bootstrap.sh` via symlink from `agent/scripts/hooks/` into `.git/hooks/`.

| Hook | Action |
|---|---|
| `post-commit` | append commit hash + subject to current session log (via `session-log.sh --section commits`) |
| `pre-push` | run `quality-check.sh` (which includes bats `test.sh` for any `agent/scripts/` changes); block push on fail |
| `post-merge` | run `graph-update.sh` |

Bypass with `--no-verify` only in emergency, and only with an explicit session-log entry stating why.

## 10. Bootstrap Sequence

`agent/scripts/bootstrap.sh` runs:

1. Verify deps: `git`, `jq`, `notify-send`, `code-review-graph`, `bats` (or vendor bats-core into `agent/scripts/tests/bats/`). Warn on `notify-send`; fail on `git`/`jq`/`bats`.
2. Create `agent/state/sessions/.gitkeep`.
3. Seed `tasks.json` by parsing `docs/ROADMAP.md` checkbox tasks (each becomes a `T-NNNN` entry under its milestone).
4. Seed `decisions.json` from brainstorm §8 (open + decided lists).
5. Run `graph-bootstrap.sh`.
6. Symlink git hooks.
7. Run `agent/scripts/test.sh` — exit non-zero on any failure (bootstrap gated on green tests).
8. Print "ready" + dashboard URL hint.

## 11. End-to-End Workflow

**Agent perspective:**

1. Human: `agent-start.sh T-0042 --agent clyde` → worktree, branch, claim, session opened, context dump.
2. Agent reads `task-assessment.md`, runs through gate (spec-check, decisions, CRG redundancy).
3. Agent works. Each commit auto-logged via post-commit hook. `session-log.sh` for non-obvious decisions.
4. `task-complete.sh T-0042 --actual-hours 3.5` → quality-check, graph-update, status=done, dashboard refresh.
5. `pr-prep.sh --target kaleb | gh pr create --body-file -` → PR with impact section.
6. `session-end.sh --handoff "<next>"` → handoff + commit log; branch pushed.

**Human perspective:**

- Open `dashboard/index.html` for live state.
- Review PRs via normal `gh` flow.
- Unblock decisions via `decision-resolve.sh` (or hand-edit `decisions.json`).

## 12. Dependencies

| Tool | Required | Purpose |
|---|---|---|
| `git` | yes | repo + worktrees |
| `jq` | yes | atomic JSON edits |
| `bats` (bats-core) | yes | script testing |
| `code-review-graph` | yes | knowledge graph + MCP |
| `gh` | yes | PR creation |
| `notify-send` | recommended | desktop notify on blocker |
| `koad` (Citadel) | optional | enhanced signal escalation |
| Node + npm | M0+ | once stack scaffolded |

## 13. Risks and Mitigations

- **State drift between `ROADMAP.md` and `tasks.json`** — `roadmap-sync.sh --check` runs in `pre-push` to flag.
- **Agents bypass scripts and edit state directly** — git hooks + skill docs require script use; PR body includes impact diff for hand-edits.
- **CRG graph goes stale silently** — `graph-status.sh` marks `fresh: false`; dashboard surfaces it; `agent-start.sh` auto-updates if stale.
- **`fetch` blocked by `file://` CORS** — bootstrap docs and dashboard inline hint cover the `http.server` workaround.
- **Session file proliferation** — `cleanup.sh` archives >30-day sessions to `sessions/archive/`.
- **Decision graveyard** — `superseded` status with `supersededBy` keeps history without cluttering open list.

## 14. Out of Scope (Phase 2)

- Live multi-user dashboard collaboration.
- Cross-machine session sync via CASS.
- Automated reviewer assignment.
- Catalog data ingestion pipeline (lands in M2; scripts stubbed now).
- Notion or external tracking bridges.

## 15. Open Questions

None blocking. Implementation can begin. Initial milestone for this work: lands before M1 begins (currently M0 active).

## 16. Acceptance Criteria

- All scripts in §6.2 exist, are executable, support `--help` and `--dry-run`.
- All scripts in §6.2 have a corresponding `.bats` test file with: `--help` test, `--dry-run` test, happy-path test, ≥1 error-path test, and (for state-mutating scripts) an idempotency test.
- `agent/scripts/test.sh` exits 0 on a clean checkout.
- All skill docs in §7 exist and are linked from `agent/skills/README.md`.
- `dashboard/index.html` renders from `agent/state/*.json` (no hardcoded task counts).
- `bootstrap.sh` runs idempotently on a fresh clone and gates "ready" on green `test.sh`.
- Git hooks install via `graph-bootstrap.sh` and are bypass-loggable.
- Running the full workflow (`agent-start` → work → `task-complete` → `pr-prep`) on a sample task produces:
  - Updated `tasks.json` and `milestones.json`.
  - Session file with commit list + handoff.
  - Dashboard reflecting new state on refresh.
  - PR body with impact section.
- `roadmap-sync.sh --check` reports no drift after seeded tasks reconcile with `ROADMAP.md`.
- Integration tier (`test.sh --integration`) exercises the full end-to-end workflow against real `code-review-graph` in a temp repo, exits 0.
