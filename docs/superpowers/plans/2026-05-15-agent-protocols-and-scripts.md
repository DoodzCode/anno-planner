# Agent Protocols and Scripts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `agent/` infrastructure (state, scripts, skills) and wire `dashboard/index.html` to live JSON state, as specified in `docs/superpowers/specs/2026-05-15-agent-protocols-and-scripts-design.md`.

**Architecture:** Three sibling folders under `agent/` — `state/` (JSON + markdown logs as source of truth), `scripts/` (bash with bats tests), `skills/` (markdown protocols). Dashboard is a read-only `fetch()` view over state. `code-review-graph` is integrated as both a knowledge graph and an MCP server. All scripts ship with bats tests; `quality-check.sh` enforces tests on PR via `pre-push` hook.

**Tech Stack:** Bash + `jq` + `git`; bats-core for tests; vanilla HTML/CSS/JS for dashboard; `code-review-graph` for impact analysis; optional `koad` (Citadel) for enhanced escalation.

**Spec reference:** `docs/superpowers/specs/2026-05-15-agent-protocols-and-scripts-design.md`

---

## File Structure Map

| Path | Role |
|---|---|
| `agent/state/tasks.json` | Source of truth for tasks |
| `agent/state/milestones.json` | Derived counters per milestone |
| `agent/state/decisions.json` | Open + decided + superseded decisions |
| `agent/state/blockers.md` | Append-only blocker log |
| `agent/state/.crg-status.json` | CRG build snapshot |
| `agent/state/.agent-session` | Symlink to current session file |
| `agent/state/sessions/*.md` | Per-session journals |
| `agent/scripts/lib/common.sh` | Shared helpers (repo root, jq edit, notify, logging) |
| `agent/scripts/hooks/{post-commit,pre-push,post-merge}` | Git hooks |
| `agent/scripts/tests/{helpers.bash,fixtures/,mocks/,*.bats,integration/}` | Bats test infrastructure |
| `agent/scripts/test.sh` | Bats runner |
| `agent/scripts/*.sh` | All flow / maintenance / domain scripts |
| `agent/skills/*.md` | Protocol docs |
| `dashboard/index.html` | Live view over `agent/state/*.json` |

---

## Phase 0 — Layout, Common Library, Bats Setup

### Task 0.1: Scaffold `agent/` directory tree

**Files:**
- Create: `agent/state/sessions/.gitkeep`
- Create: `agent/state/decisions.json` (empty skeleton)
- Create: `agent/state/tasks.json` (empty skeleton)
- Create: `agent/state/milestones.json` (empty skeleton)
- Create: `agent/state/blockers.md` (empty header)
- Create: `agent/scripts/lib/.gitkeep`
- Create: `agent/scripts/hooks/.gitkeep`
- Create: `agent/scripts/tests/fixtures/.gitkeep`
- Create: `agent/scripts/tests/mocks/.gitkeep`
- Create: `agent/scripts/tests/integration/.gitkeep`
- Create: `agent/skills/.gitkeep`

- [ ] **Step 1: Create directories**

```bash
mkdir -p agent/state/sessions \
         agent/scripts/lib \
         agent/scripts/hooks \
         agent/scripts/tests/fixtures \
         agent/scripts/tests/mocks \
         agent/scripts/tests/integration \
         agent/skills
touch agent/state/sessions/.gitkeep \
      agent/scripts/lib/.gitkeep \
      agent/scripts/hooks/.gitkeep \
      agent/scripts/tests/fixtures/.gitkeep \
      agent/scripts/tests/mocks/.gitkeep \
      agent/scripts/tests/integration/.gitkeep \
      agent/skills/.gitkeep
```

- [ ] **Step 2: Seed minimal state files**

Write `agent/state/tasks.json`:
```json
{
  "tasks": []
}
```

Write `agent/state/milestones.json`:
```json
{
  "updated": null,
  "milestones": []
}
```

Write `agent/state/decisions.json`:
```json
{
  "decisions": []
}
```

Write `agent/state/blockers.md`:
```markdown
# Blockers Log

Append-only. One entry per `blocker.sh` call. Newest at bottom.

---
```

- [ ] **Step 3: Commit**

```bash
git add agent/
git commit -m "chore(agent): scaffold agent/ directory tree and empty state files"
```

---

### Task 0.2: Vendor bats-core as a git submodule

**Files:**
- Create: `agent/scripts/tests/bats/` (submodule)
- Modify: `.gitmodules`

- [ ] **Step 1: Add bats-core submodule**

```bash
git submodule add https://github.com/bats-core/bats-core agent/scripts/tests/bats
git submodule update --init --recursive
```

- [ ] **Step 2: Verify bats binary works**

Run: `agent/scripts/tests/bats/bin/bats --version`
Expected: prints a version (e.g. `Bats 1.x.x`).

- [ ] **Step 3: Commit**

```bash
git add .gitmodules agent/scripts/tests/bats
git commit -m "chore(test): vendor bats-core as submodule for script testing"
```

---

### Task 0.3: Write `agent/scripts/lib/common.sh`

**Files:**
- Create: `agent/scripts/lib/common.sh`
- Create: `agent/scripts/tests/helpers.bash`
- Create: `agent/scripts/tests/lib_common.bats`

- [ ] **Step 1: Write the failing test**

Create `agent/scripts/tests/helpers.bash`:
```bash
#!/usr/bin/env bash
# Shared bats helpers.

REPO_ROOT_FROM_HELPERS="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"

# Create a temp git repo with seeded agent/ state for isolation.
make_temp_repo() {
  local tmp
  tmp="$(mktemp -d)"
  cd "$tmp"
  git init -q
  git config user.email "test@example.com"
  git config user.name "Test"
  mkdir -p agent/state/sessions agent/scripts/lib
  cp -r "$REPO_ROOT_FROM_HELPERS"/agent/state/{tasks.json,milestones.json,decisions.json,blockers.md} agent/state/
  cp "$REPO_ROOT_FROM_HELPERS"/agent/scripts/lib/common.sh agent/scripts/lib/
  cp -r "$REPO_ROOT_FROM_HELPERS"/agent/scripts/tests/fixtures agent/scripts/tests/ 2>/dev/null || true
  echo "$tmp"
}

# Add mocks to PATH ahead of real binaries.
use_mocks() {
  export PATH="$REPO_ROOT_FROM_HELPERS/agent/scripts/tests/mocks:$PATH"
  export NOTIFY_LOG="$BATS_TMPDIR/notify.log"
  export KOAD_LOG="$BATS_TMPDIR/koad.log"
  : > "$NOTIFY_LOG"
  : > "$KOAD_LOG"
}

# Assert helpers.
assert_exit_code() {
  local expected="$1"
  [ "$status" -eq "$expected" ] || {
    echo "expected exit $expected, got $status"
    echo "output: $output"
    return 1
  }
}

assert_json_field() {
  local file="$1" path="$2" expected="$3"
  local actual
  actual="$(jq -r "$path" "$file")"
  [ "$actual" = "$expected" ] || {
    echo "$file $path: expected '$expected', got '$actual'"
    return 1
  }
}

assert_file_contains() {
  local file="$1" pattern="$2"
  grep -q "$pattern" "$file" || {
    echo "$file missing pattern: $pattern"
    return 1
  }
}

assert_notify_sent() {
  local pattern="$1"
  grep -q "$pattern" "$NOTIFY_LOG" || {
    echo "notify log missing pattern: $pattern"
    cat "$NOTIFY_LOG"
    return 1
  }
}
```

Create `agent/scripts/tests/lib_common.bats`:
```bash
#!/usr/bin/env bats

load helpers

setup() {
  REPO="$(make_temp_repo)"
  cd "$REPO"
  source agent/scripts/lib/common.sh
}

teardown() {
  rm -rf "$REPO"
}

@test "repo_root returns git toplevel" {
  run repo_root
  assert_exit_code 0
  [ "$output" = "$REPO" ]
}

@test "iso_now returns ISO-8601 UTC timestamp" {
  run iso_now
  assert_exit_code 0
  [[ "$output" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$ ]]
}

@test "state_file resolves to agent/state path" {
  run state_file tasks.json
  assert_exit_code 0
  [ "$output" = "$REPO/agent/state/tasks.json" ]
}

@test "jq_edit atomically updates a JSON file" {
  jq_edit agent/state/tasks.json '.tasks += [{"id":"T-9999"}]'
  assert_json_field agent/state/tasks.json '.tasks[0].id' "T-9999"
}

@test "jq_edit leaves original intact on jq failure" {
  run jq_edit agent/state/tasks.json '.tasks += [INVALID]'
  assert_exit_code 2
  assert_json_field agent/state/tasks.json '.tasks | length' "0"
}

@test "require_dep fails with exit 3 for missing binary" {
  run require_dep this_binary_does_not_exist_12345
  assert_exit_code 3
}

@test "require_dep succeeds for existing binary" {
  run require_dep git
  assert_exit_code 0
}

@test "koad_present is false when koad not on PATH" {
  ( export PATH="/usr/bin:/bin"; run koad_present; assert_exit_code 1 )
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
agent/scripts/tests/bats/bin/bats agent/scripts/tests/lib_common.bats
```
Expected: all tests fail because `common.sh` does not yet exist.

- [ ] **Step 3: Implement `common.sh`**

Create `agent/scripts/lib/common.sh`:
```bash
#!/usr/bin/env bash
# Shared helpers for agent/scripts/*. Source via:
#   source "$(git rev-parse --show-toplevel)/agent/scripts/lib/common.sh"

set -o pipefail

repo_root() {
  git rev-parse --show-toplevel
}

state_file() {
  local name="$1"
  printf '%s/agent/state/%s\n' "$(repo_root)" "$name"
}

iso_now() {
  date -u +%Y-%m-%dT%H:%M:%SZ
}

log_info()  { printf '\033[1;34m[INFO]\033[0m  %s\n' "$*" >&2; }
log_warn()  { printf '\033[1;33m[WARN]\033[0m  %s\n' "$*" >&2; }
log_error() { printf '\033[1;31m[ERROR]\033[0m %s\n' "$*" >&2; }

notify() {
  local title="$1" body="$2"
  if command -v notify-send >/dev/null 2>&1; then
    notify-send "$title" "$body"
  else
    printf '[NOTIFY] %s — %s\n' "$title" "$body" >&2
  fi
}

require_dep() {
  local dep="$1"
  if ! command -v "$dep" >/dev/null 2>&1; then
    log_error "missing required dependency: $dep"
    exit 3
  fi
}

koad_present() {
  command -v koad >/dev/null 2>&1
}

# Atomic JSON edit via temp file.
# Usage: jq_edit <file> <jq-expr> [jq-args...]
jq_edit() {
  local file="$1"; shift
  local tmp
  tmp="$(mktemp)"
  if ! jq "$@" > "$tmp" < "$file"; then
    rm -f "$tmp"
    log_error "jq failed; $file unchanged"
    exit 2
  fi
  mv "$tmp" "$file"
}

current_session() {
  local link
  link="$(state_file .agent-session)"
  if [ ! -L "$link" ]; then
    log_error "no active session (.agent-session symlink missing)"
    exit 2
  fi
  readlink -f "$link"
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
chmod +x agent/scripts/lib/common.sh
agent/scripts/tests/bats/bin/bats agent/scripts/tests/lib_common.bats
```
Expected: all 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add agent/scripts/lib/common.sh agent/scripts/tests/helpers.bash agent/scripts/tests/lib_common.bats
git commit -m "feat(agent): add scripts/lib/common.sh with bats coverage"
```

---

### Task 0.4: Write `test.sh` runner

**Files:**
- Create: `agent/scripts/test.sh`

- [ ] **Step 1: Write the runner**

```bash
#!/usr/bin/env bash
# Run all bats tests under agent/scripts/tests/.
# Usage: test.sh [--filter <pattern>] [--integration] [--verbose]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BATS="$ROOT/scripts/tests/bats/bin/bats"
TESTS_DIR="$ROOT/scripts/tests"

FILTER=""
INTEGRATION=false
VERBOSE=false

while [ $# -gt 0 ]; do
  case "$1" in
    --filter)      FILTER="$2"; shift 2 ;;
    --integration) INTEGRATION=true; shift ;;
    --verbose|-v)  VERBOSE=true; shift ;;
    --help|-h)     sed -n '2,4p' "$0"; exit 0 ;;
    *) echo "unknown arg: $1" >&2; exit 1 ;;
  esac
done

if [ ! -x "$BATS" ]; then
  echo "bats not found at $BATS. Run: git submodule update --init --recursive" >&2
  exit 3
fi

files=()
if [ -n "$FILTER" ]; then
  while IFS= read -r f; do files+=("$f"); done < <(find "$TESTS_DIR" -maxdepth 1 -name "*${FILTER}*.bats")
else
  while IFS= read -r f; do files+=("$f"); done < <(find "$TESTS_DIR" -maxdepth 1 -name "*.bats")
fi

if [ "$INTEGRATION" = true ]; then
  while IFS= read -r f; do files+=("$f"); done < <(find "$TESTS_DIR/integration" -name "*.bats" 2>/dev/null)
fi

[ "${#files[@]}" -gt 0 ] || { echo "no test files matched" >&2; exit 1; }

opts=()
[ "$VERBOSE" = true ] && opts+=(--verbose-run)

"$BATS" "${opts[@]}" "${files[@]}"
```

- [ ] **Step 2: Make it executable and smoke-test**

```bash
chmod +x agent/scripts/test.sh
agent/scripts/test.sh
```
Expected: bats runs `lib_common.bats`, all 8 tests pass.

- [ ] **Step 3: Commit**

```bash
git add agent/scripts/test.sh
git commit -m "feat(agent): add test.sh bats runner with filter/integration flags"
```

---

### Task 0.5: Write mocks for `notify-send`, `koad`, `code-review-graph`

**Files:**
- Create: `agent/scripts/tests/mocks/notify-send`
- Create: `agent/scripts/tests/mocks/koad`
- Create: `agent/scripts/tests/mocks/code-review-graph`

- [ ] **Step 1: Write `notify-send` mock**

```bash
#!/usr/bin/env bash
printf '%s\n' "$*" >> "${NOTIFY_LOG:-/tmp/notify.log}"
exit 0
```

- [ ] **Step 2: Write `koad` mock**

```bash
#!/usr/bin/env bash
printf '%s\n' "$*" >> "${KOAD_LOG:-/tmp/koad.log}"
exit 0
```

- [ ] **Step 3: Write `code-review-graph` mock**

```bash
#!/usr/bin/env bash
case "$1" in
  status)
    cat <<'EOF'
{"nodes": 42, "edges": 99, "last_build": "2026-05-15T00:00:00Z"}
EOF
    ;;
  build|update|register|init|postprocess)
    echo "mock crg: $1 ok"
    ;;
  detect-changes)
    cat <<'EOF'
{"affected_modules": ["mock-module"], "downstream_consumers": []}
EOF
    ;;
  *)
    echo "mock crg: unknown subcommand $1" >&2
    exit 1
    ;;
esac
exit 0
```

- [ ] **Step 4: Make mocks executable and verify**

```bash
chmod +x agent/scripts/tests/mocks/notify-send \
         agent/scripts/tests/mocks/koad \
         agent/scripts/tests/mocks/code-review-graph
PATH="$(pwd)/agent/scripts/tests/mocks:$PATH" code-review-graph status
```
Expected: prints the canned JSON status.

- [ ] **Step 5: Commit**

```bash
git add agent/scripts/tests/mocks/
git commit -m "test(agent): add mocks for notify-send, koad, code-review-graph"
```

---

## Phase 1 — Fixtures and Initial Seeding

### Task 1.1: Seed initial `tasks.json` and `decisions.json` from `ROADMAP.md`

**Files:**
- Modify: `agent/state/tasks.json`
- Modify: `agent/state/decisions.json`
- Modify: `agent/state/milestones.json`

- [ ] **Step 1: Write `tasks.json`**

Replace contents of `agent/state/tasks.json` with one task per checkbox from `docs/ROADMAP.md` Milestones M0–M5. Use the structure below; preserve the exact wording from `ROADMAP.md` as `title`. Auto-number `T-NNNN` in creation order. Example M0 block:

```json
{
  "tasks": [
    { "id": "T-0001", "milestone": "M0", "title": "Scaffold Vite project with chosen framework", "status": "todo", "owner": "both", "assignedAgent": null, "estHours": null, "actualHours": null, "blockedBy": ["D-001","D-002"], "createdAt": "2026-05-15T00:00:00Z", "completedAt": null, "notes": "", "sourceUrls": [] },
    { "id": "T-0002", "milestone": "M0", "title": "Render a tile grid on screen",            "status": "todo", "owner": "kaleb","assignedAgent": null, "estHours": null, "actualHours": null, "blockedBy": ["T-0001"],       "createdAt": "2026-05-15T00:00:00Z", "completedAt": null, "notes": "", "sourceUrls": [] },
    { "id": "T-0003", "milestone": "M0", "title": "Place one hardcoded building on the grid", "status": "todo", "owner": "kaleb","assignedAgent": null, "estHours": null, "actualHours": null, "blockedBy": ["T-0002"],       "createdAt": "2026-05-15T00:00:00Z", "completedAt": null, "notes": "", "sourceUrls": [] },
    { "id": "T-0004", "milestone": "M0", "title": "Record stack decision in docs/",           "status": "todo", "owner": "both", "assignedAgent": null, "estHours": null, "actualHours": null, "blockedBy": ["D-001","D-002"], "createdAt": "2026-05-15T00:00:00Z", "completedAt": null, "notes": "", "sourceUrls": [] }
  ]
}
```

Continue with M1 (9 tasks), M2 (6 tasks), M3 (7 tasks), M4 (6 tasks), M5 (4 tasks). IDs `T-0005`…`T-0036`. `blockedBy` mirrors the dependencies stated in `ROADMAP.md`; for milestones whose first task depends on the previous milestone completing, leave `blockedBy: []` (milestone gating is a human gate, not a hard task dep).

- [ ] **Step 2: Write `decisions.json`**

Map each item from brainstorm §8 to a decision entry. Open items first, then decided. Example:

```json
{
  "decisions": [
    { "id": "D-001", "topic": "Framework",         "status": "open",    "options": ["React+Vite","Svelte/SvelteKit"], "chosen": null,                                "rationale": null,                                            "decidedAt": null,         "decidedBy": null, "supersededBy": null },
    { "id": "D-002", "topic": "Canvas renderer",   "status": "open",    "options": ["PixiJS","Konva"],                 "chosen": null,                                "rationale": null,                                            "decidedAt": null,         "decidedBy": null, "supersededBy": null },
    { "id": "D-003", "topic": "Building data source", "status": "open", "options": ["Anno wiki","community dataset","manual"], "chosen": null,                       "rationale": null,                                            "decidedAt": null,         "decidedBy": null, "supersededBy": null },
    { "id": "D-004", "topic": "Three-pane wireframe", "status": "open", "options": ["palette/canvas/inspector"],        "chosen": null,                                "rationale": null,                                            "decidedAt": null,         "decidedBy": null, "supersededBy": null },
    { "id": "D-005", "topic": "Static host",       "status": "open",    "options": ["GitHub Pages","Cloudflare Pages","Netlify"], "chosen": null,                    "rationale": null,                                            "decidedAt": null,         "decidedBy": null, "supersededBy": null },
    { "id": "D-006", "topic": "Tile units",        "status": "decided", "options": ["1:1 in-game"],                    "chosen": "1:1 in-game",                       "rationale": "Layouts transfer 1:1 to game",                  "decidedAt": "2026-05-14", "decidedBy": "both", "supersededBy": null },
    { "id": "D-007", "topic": "Visuals",           "status": "decided", "options": ["top-down sprites"],               "chosen": "top-down sprites",                  "rationale": "Readable, screenshot-friendly",                  "decidedAt": "2026-05-14", "decidedBy": "both", "supersededBy": null },
    { "id": "D-008", "topic": "Blueprint scope",   "status": "decided", "options": ["standalone library-managed"],     "chosen": "standalone library-managed",        "rationale": "Not tied to a specific island",                 "decidedAt": "2026-05-14", "decidedBy": "both", "supersededBy": null },
    { "id": "D-009", "topic": "Platform",          "status": "decided", "options": ["desktop-only v1"],                "chosen": "desktop-only v1",                   "rationale": "Touch deferred to v2",                          "decidedAt": "2026-05-14", "decidedBy": "both", "supersededBy": null },
    { "id": "D-010", "topic": "Licensing",         "status": "decided", "options": ["personal use"],                   "chosen": "personal use",                      "rationale": "Not published; fan-content policy n/a",         "decidedAt": "2026-05-14", "decidedBy": "both", "supersededBy": null },
    { "id": "D-011", "topic": "DLC handling",      "status": "decided", "options": ["DLC badges + filtered views"],    "chosen": "DLC badges + filtered views",       "rationale": "Both palette and library support filtering",    "decidedAt": "2026-05-14", "decidedBy": "both", "supersededBy": null }
  ]
}
```

- [ ] **Step 3: Initialize `milestones.json` with goals (counters left as zero — refreshed in Task 3.1)**

```json
{
  "updated": null,
  "milestones": [
    { "id": "M0", "name": "Spike",             "estDays": [1,2], "status": "active",  "owner": "both",  "goal": "Pick stack, render grid, place one building",                    "taskCounts": { "done": 0, "active": 0, "todo": 0, "blocked": 0, "total": 0 } },
    { "id": "M1", "name": "Core Canvas",       "estDays": [4,6], "status": "pending", "owner": "kaleb", "goal": "Pan/zoom, place/delete/rotate, undo/redo, IndexedDB persistence", "taskCounts": { "done": 0, "active": 0, "todo": 0, "blocked": 0, "total": 0 } },
    { "id": "M2", "name": "Catalog",           "estDays": [3,5], "status": "pending", "owner": "ian",   "goal": "Old World buildings, palette, influence overlays, DLC badges",   "taskCounts": { "done": 0, "active": 0, "todo": 0, "blocked": 0, "total": 0 } },
    { "id": "M3", "name": "Math & Export",     "estDays": [3,5], "status": "pending", "owner": "ian",   "goal": "Production tallies, blueprint library, PNG + URL share",         "taskCounts": { "done": 0, "active": 0, "todo": 0, "blocked": 0, "total": 0 } },
    { "id": "M4", "name": "PWA Polish",        "estDays": [2,3], "status": "pending", "owner": "both",  "goal": "Offline install, onboarding, dark mode, sprite pass",             "taskCounts": { "done": 0, "active": 0, "todo": 0, "blocked": 0, "total": 0 } },
    { "id": "M5", "name": "Release",           "estDays": [0.5,1], "status": "pending", "owner": "both", "goal": "Build, deploy, smoke-test, tag v1.0.0",                          "taskCounts": { "done": 0, "active": 0, "todo": 0, "blocked": 0, "total": 0 } }
  ]
}
```

- [ ] **Step 4: Verify with jq**

```bash
jq '.tasks | length' agent/state/tasks.json
# Expected: 36
jq '.decisions | length' agent/state/decisions.json
# Expected: 11
jq '.milestones | length' agent/state/milestones.json
# Expected: 6
```

- [ ] **Step 5: Commit**

```bash
git add agent/state/tasks.json agent/state/decisions.json agent/state/milestones.json
git commit -m "feat(agent): seed initial tasks/decisions/milestones state from ROADMAP and brainstorm"
```

---

### Task 1.2: Copy seeded state into `tests/fixtures/`

**Files:**
- Create: `agent/scripts/tests/fixtures/tasks.json`
- Create: `agent/scripts/tests/fixtures/decisions.json`
- Create: `agent/scripts/tests/fixtures/milestones.json`
- Create: `agent/scripts/tests/fixtures/blockers.md`
- Create: `agent/scripts/tests/fixtures/ROADMAP.md`

- [ ] **Step 1: Copy state files into fixtures**

```bash
cp agent/state/tasks.json      agent/scripts/tests/fixtures/
cp agent/state/decisions.json  agent/scripts/tests/fixtures/
cp agent/state/milestones.json agent/scripts/tests/fixtures/
cp agent/state/blockers.md     agent/scripts/tests/fixtures/
cp docs/ROADMAP.md             agent/scripts/tests/fixtures/
```

- [ ] **Step 2: Commit**

```bash
git add agent/scripts/tests/fixtures/
git commit -m "test(agent): add seeded state fixtures for bats tests"
```

---

## Phase 2 — Foundation Scripts (no dependencies on flow scripts)

### Task 2.1: `dashboard-refresh.sh` — recompute milestone counters

**Files:**
- Create: `agent/scripts/dashboard-refresh.sh`
- Create: `agent/scripts/tests/dashboard.bats`

- [ ] **Step 1: Write the failing test**

```bash
#!/usr/bin/env bats

load helpers

setup() {
  REPO="$(make_temp_repo)"
  cd "$REPO"
  use_mocks
  cp "$REPO_ROOT_FROM_HELPERS/agent/scripts/dashboard-refresh.sh" agent/scripts/
  chmod +x agent/scripts/dashboard-refresh.sh
}

teardown() { rm -rf "$REPO"; }

@test "dashboard-refresh --help exits 0" {
  run agent/scripts/dashboard-refresh.sh --help
  assert_exit_code 0
}

@test "dashboard-refresh --dry-run does not modify milestones.json" {
  local before
  before="$(sha256sum agent/state/milestones.json)"
  run agent/scripts/dashboard-refresh.sh --dry-run
  assert_exit_code 0
  local after
  after="$(sha256sum agent/state/milestones.json)"
  [ "$before" = "$after" ]
}

@test "dashboard-refresh updates M0 counter from seeded tasks" {
  agent/scripts/dashboard-refresh.sh
  assert_json_field agent/state/milestones.json '.milestones[0].taskCounts.total' "4"
  assert_json_field agent/state/milestones.json '.milestones[0].taskCounts.todo' "4"
}

@test "dashboard-refresh sets updated timestamp" {
  agent/scripts/dashboard-refresh.sh
  local updated
  updated="$(jq -r .updated agent/state/milestones.json)"
  [[ "$updated" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T ]]
}

@test "dashboard-refresh is idempotent (same input → same counts)" {
  agent/scripts/dashboard-refresh.sh
  local first
  first="$(jq '.milestones[].taskCounts' agent/state/milestones.json)"
  agent/scripts/dashboard-refresh.sh
  local second
  second="$(jq '.milestones[].taskCounts' agent/state/milestones.json)"
  [ "$first" = "$second" ]
}

@test "dashboard-refresh reflects status changes" {
  jq '(.tasks[] | select(.id=="T-0001") | .status) = "done"' agent/state/tasks.json > tmp && mv tmp agent/state/tasks.json
  agent/scripts/dashboard-refresh.sh
  assert_json_field agent/state/milestones.json '.milestones[0].taskCounts.done' "1"
  assert_json_field agent/state/milestones.json '.milestones[0].taskCounts.todo' "3"
}

@test "dashboard-refresh fails with exit 2 on missing tasks.json" {
  rm agent/state/tasks.json
  run agent/scripts/dashboard-refresh.sh
  assert_exit_code 2
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
agent/scripts/test.sh --filter dashboard
```
Expected: tests fail (script does not exist yet).

- [ ] **Step 3: Implement the script**

```bash
#!/usr/bin/env bash
# dashboard-refresh.sh — recompute milestone counters from tasks.json.
# Usage: dashboard-refresh.sh [--dry-run] [--help]
set -euo pipefail
source "$(git rev-parse --show-toplevel)/agent/scripts/lib/common.sh"

DRY_RUN=false
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    --help|-h) sed -n '2,4p' "$0"; exit 0 ;;
    *) log_error "unknown arg: $1"; exit 1 ;;
  esac
done

require_dep jq
TASKS="$(state_file tasks.json)"
MILESTONES="$(state_file milestones.json)"
[ -f "$TASKS" ] || { log_error "missing $TASKS"; exit 2; }
[ -f "$MILESTONES" ] || { log_error "missing $MILESTONES"; exit 2; }

NOW="$(iso_now)"

EXPR='
  (input | .tasks) as $t |
  .updated = $now |
  .milestones |= map(
    . as $m |
    .taskCounts = {
      done:    ($t | map(select(.milestone == $m.id and .status == "done"))    | length),
      active:  ($t | map(select(.milestone == $m.id and .status == "active"))  | length),
      todo:    ($t | map(select(.milestone == $m.id and .status == "todo"))    | length),
      blocked: ($t | map(select(.milestone == $m.id and .status == "blocked")) | length),
      total:   ($t | map(select(.milestone == $m.id)) | length)
    }
  )
'

if [ "$DRY_RUN" = true ]; then
  jq --arg now "$NOW" --slurpfile _t <(cat "$TASKS") \
     "$EXPR" --argjson input "$(cat "$TASKS")" "$MILESTONES" \
     2>/dev/null || jq --arg now "$NOW" \
       "(.updated = \$now) | .milestones |= map(. as \$m | .taskCounts = {done: (input | .tasks | map(select(.milestone == \$m.id and .status == \"done\")) | length), active: (input | .tasks | map(select(.milestone == \$m.id and .status == \"active\")) | length), todo: (input | .tasks | map(select(.milestone == \$m.id and .status == \"todo\")) | length), blocked: (input | .tasks | map(select(.milestone == \$m.id and .status == \"blocked\")) | length), total: (input | .tasks | map(select(.milestone == \$m.id)) | length)})" \
       "$MILESTONES" "$TASKS" >/dev/null
  log_info "dry-run ok"
  exit 0
fi

# Real run: read tasks once into a temp arg, then atomically write milestones.
TASKS_JSON="$(cat "$TASKS")"
jq_edit "$MILESTONES" --arg now "$NOW" --argjson t "$TASKS_JSON" '
  .updated = $now
  | .milestones |= map(
      . as $m |
      .taskCounts = {
        done:    ($t.tasks | map(select(.milestone == $m.id and .status == "done"))    | length),
        active:  ($t.tasks | map(select(.milestone == $m.id and .status == "active"))  | length),
        todo:    ($t.tasks | map(select(.milestone == $m.id and .status == "todo"))    | length),
        blocked: ($t.tasks | map(select(.milestone == $m.id and .status == "blocked")) | length),
        total:   ($t.tasks | map(select(.milestone == $m.id)) | length)
      }
    )
'

log_info "milestones.json refreshed"
```

- [ ] **Step 4: Run test to verify it passes**

```bash
agent/scripts/test.sh --filter dashboard
```
Expected: 7/7 pass.

- [ ] **Step 5: Commit**

```bash
git add agent/scripts/dashboard-refresh.sh agent/scripts/tests/dashboard.bats
git commit -m "feat(agent): add dashboard-refresh.sh with bats coverage"
```

---

### Task 2.2: `spec-check.sh` — scan a doc for placeholder markers

**Files:**
- Create: `agent/scripts/spec-check.sh`
- Create: `agent/scripts/tests/spec_check.bats`

- [ ] **Step 1: Write the failing test**

```bash
#!/usr/bin/env bats
load helpers

setup() {
  REPO="$(make_temp_repo)"
  cd "$REPO"
  cp "$REPO_ROOT_FROM_HELPERS/agent/scripts/spec-check.sh" agent/scripts/
  chmod +x agent/scripts/spec-check.sh
}
teardown() { rm -rf "$REPO"; }

@test "spec-check --help exits 0" {
  run agent/scripts/spec-check.sh --help
  assert_exit_code 0
}

@test "spec-check passes on clean doc" {
  echo "# clean doc" > doc.md
  run agent/scripts/spec-check.sh doc.md
  assert_exit_code 0
}

@test "spec-check fails on TBD" {
  printf '# doc\nTBD: fill this in\n' > doc.md
  run agent/scripts/spec-check.sh doc.md
  assert_exit_code 1
}

@test "spec-check fails on FIXME" {
  printf 'FIXME hello\n' > doc.md
  run agent/scripts/spec-check.sh doc.md
  assert_exit_code 1
}

@test "spec-check fails on missing file" {
  run agent/scripts/spec-check.sh nope.md
  assert_exit_code 1
}

@test "spec-check --dry-run never modifies state" {
  printf 'TBD\n' > doc.md
  local before="$(sha256sum doc.md)"
  run agent/scripts/spec-check.sh --dry-run doc.md
  local after="$(sha256sum doc.md)"
  [ "$before" = "$after" ]
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
agent/scripts/test.sh --filter spec_check
```
Expected: fail (script missing).

- [ ] **Step 3: Implement the script**

```bash
#!/usr/bin/env bash
# spec-check.sh — refuse docs with placeholder markers.
# Usage: spec-check.sh [--dry-run] <path>
set -euo pipefail
source "$(git rev-parse --show-toplevel)/agent/scripts/lib/common.sh"

DRY_RUN=false
ARG=""
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    --help|-h) sed -n '2,4p' "$0"; exit 0 ;;
    -*) log_error "unknown flag: $1"; exit 1 ;;
    *)  ARG="$1"; shift ;;
  esac
done

[ -n "$ARG" ] || { log_error "usage: spec-check [--dry-run] <path>"; exit 1; }
[ -f "$ARG" ] || { log_error "file not found: $ARG"; exit 1; }
$DRY_RUN && exit 0

PATTERN='TBD|TKTK|FIXME|XXX|< *placeholder *>'
if grep -nE "$PATTERN" "$ARG"; then
  log_error "placeholders found in $ARG"
  exit 1
fi
log_info "no placeholders in $ARG"
```

- [ ] **Step 4: Run test to verify it passes**

```bash
agent/scripts/test.sh --filter spec_check
```
Expected: 6/6 pass.

- [ ] **Step 5: Commit**

```bash
git add agent/scripts/spec-check.sh agent/scripts/tests/spec_check.bats
git commit -m "feat(agent): add spec-check.sh for placeholder-marker scans"
```

---

## Phase 3 — Session and Logging Scripts

### Task 3.1: `session-log.sh` — append timestamped entries to current session

**Files:**
- Create: `agent/scripts/session-log.sh`
- Create: `agent/scripts/tests/session.bats`

- [ ] **Step 1: Write the failing test**

```bash
#!/usr/bin/env bats
load helpers

setup() {
  REPO="$(make_temp_repo)"
  cd "$REPO"
  cp "$REPO_ROOT_FROM_HELPERS/agent/scripts/session-log.sh" agent/scripts/
  chmod +x agent/scripts/session-log.sh
  # Seed an active session.
  mkdir -p agent/state/sessions
  local f="agent/state/sessions/2026-05-15-test-foo.md"
  cat > "$f" <<'EOF'
# Session 2026-05-15 — test — foo

## Goal
test

## Tasks

## Decisions made

## Blockers raised

## Notes

## Commits

## Handoff notes
EOF
  ln -sf "../../$f" agent/state/.agent-session
}
teardown() { rm -rf "$REPO"; }

@test "session-log --help exits 0" {
  run agent/scripts/session-log.sh --help
  assert_exit_code 0
}

@test "session-log appends to Notes section by default" {
  agent/scripts/session-log.sh "hello world"
  assert_file_contains "$(readlink -f agent/state/.agent-session)" "hello world"
}

@test "session-log --section decisions writes under Decisions made" {
  agent/scripts/session-log.sh --section decisions "chose React"
  local f="$(readlink -f agent/state/.agent-session)"
  awk '/^## Decisions made/{flag=1;next} /^## /{flag=0} flag' "$f" | grep -q "chose React"
}

@test "session-log --dry-run does not append" {
  local f="$(readlink -f agent/state/.agent-session)"
  local before="$(sha256sum "$f")"
  agent/scripts/session-log.sh --dry-run "should not appear"
  local after="$(sha256sum "$f")"
  [ "$before" = "$after" ]
}

@test "session-log fails with exit 2 when no active session" {
  rm agent/state/.agent-session
  run agent/scripts/session-log.sh "x"
  assert_exit_code 2
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
agent/scripts/test.sh --filter session
```
Expected: fail.

- [ ] **Step 3: Implement the script**

```bash
#!/usr/bin/env bash
# session-log.sh — append timestamped line to current session file.
# Usage: session-log.sh [--section notes|decisions|blockers|commits] [--dry-run] "<note>"
set -euo pipefail
source "$(git rev-parse --show-toplevel)/agent/scripts/lib/common.sh"

SECTION="Notes"
DRY_RUN=false
NOTE=""

map_section() {
  case "$1" in
    notes)     echo "Notes" ;;
    decisions) echo "Decisions made" ;;
    blockers)  echo "Blockers raised" ;;
    commits)   echo "Commits" ;;
    *) log_error "unknown section: $1"; exit 1 ;;
  esac
}

while [ $# -gt 0 ]; do
  case "$1" in
    --section) SECTION="$(map_section "$2")"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    --help|-h) sed -n '2,4p' "$0"; exit 0 ;;
    -*) log_error "unknown flag: $1"; exit 1 ;;
    *) NOTE="$1"; shift ;;
  esac
done

[ -n "$NOTE" ] || { log_error "missing note"; exit 1; }

FILE="$(current_session)"
TS="$(iso_now)"
LINE="- ${TS} ${NOTE}"

$DRY_RUN && { echo "$LINE -> ## $SECTION"; exit 0; }

# Insert LINE immediately after the section header.
awk -v section="## $SECTION" -v line="$LINE" '
  $0 == section { print; print line; next }
  { print }
' "$FILE" > "${FILE}.tmp"
mv "${FILE}.tmp" "$FILE"
```

- [ ] **Step 4: Run test to verify it passes**

```bash
agent/scripts/test.sh --filter session
```
Expected: 5/5 pass.

- [ ] **Step 5: Commit**

```bash
git add agent/scripts/session-log.sh agent/scripts/tests/session.bats
git commit -m "feat(agent): add session-log.sh with section dispatch"
```

---

### Task 3.2: `session-end.sh` — write handoff + commit list, push branch

**Files:**
- Create: `agent/scripts/session-end.sh`
- Modify: `agent/scripts/tests/session.bats` (append cases)

- [ ] **Step 1: Append failing tests to `session.bats`**

```bash
@test "session-end --help exits 0" {
  run agent/scripts/session-end.sh --help
  assert_exit_code 0
}

@test "session-end writes handoff section" {
  cp "$REPO_ROOT_FROM_HELPERS/agent/scripts/session-end.sh" agent/scripts/
  chmod +x agent/scripts/session-end.sh
  agent/scripts/session-end.sh --handoff "next: M0 stack decision"
  local f="$(readlink -f agent/state/.agent-session 2>/dev/null || echo "")"
  [ -z "$f" ]  # symlink removed after session-end
  local archived="$(ls agent/state/sessions/2026-05-15-test-foo.md)"
  awk '/^## Handoff notes/{flag=1;next} /^## /{flag=0} flag' "$archived" | grep -q "next: M0"
}

@test "session-end --dry-run leaves symlink intact" {
  cp "$REPO_ROOT_FROM_HELPERS/agent/scripts/session-end.sh" agent/scripts/
  chmod +x agent/scripts/session-end.sh
  agent/scripts/session-end.sh --dry-run --handoff "x"
  [ -L agent/state/.agent-session ]
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
agent/scripts/test.sh --filter session
```
Expected: 3 new failures.

- [ ] **Step 3: Implement `session-end.sh`**

```bash
#!/usr/bin/env bash
# session-end.sh — write handoff, list commits since session start, remove .agent-session symlink.
# Usage: session-end.sh [--dry-run] --handoff "<text>"
set -euo pipefail
source "$(git rev-parse --show-toplevel)/agent/scripts/lib/common.sh"

DRY_RUN=false
HANDOFF=""
while [ $# -gt 0 ]; do
  case "$1" in
    --handoff) HANDOFF="$2"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    --help|-h) sed -n '2,4p' "$0"; exit 0 ;;
    *) log_error "unknown arg: $1"; exit 1 ;;
  esac
done

[ -n "$HANDOFF" ] || { log_error "--handoff is required"; exit 1; }
FILE="$(current_session)"
SESSION_DATE="$(basename "$FILE" | cut -d- -f1-3)"  # YYYY-MM-DD

$DRY_RUN && { log_info "dry-run: would write handoff '$HANDOFF' to $FILE"; exit 0; }

# Append handoff to its section.
awk -v h="- $HANDOFF" '
  /^## Handoff notes/ { print; print h; next }
  { print }
' "$FILE" > "${FILE}.tmp" && mv "${FILE}.tmp" "$FILE"

# Append commits since session-start (defined by file creation time of session).
START_TS="$(stat -c %Y "$FILE")"
SINCE="$(date -u -d "@$START_TS" +%Y-%m-%dT%H:%M:%SZ)"
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  COMMITS="$(git log --since="$SINCE" --pretty='- %h %s' 2>/dev/null || true)"
  if [ -n "$COMMITS" ]; then
    awk -v c="$COMMITS" '
      /^## Commits/ { print; print c; next }
      { print }
    ' "$FILE" > "${FILE}.tmp" && mv "${FILE}.tmp" "$FILE"
  fi
fi

rm -f "$(state_file .agent-session)"
log_info "session closed: $FILE"
```

- [ ] **Step 4: Run test to verify it passes**

```bash
agent/scripts/test.sh --filter session
```
Expected: 8/8 pass.

- [ ] **Step 5: Commit**

```bash
git add agent/scripts/session-end.sh agent/scripts/tests/session.bats
git commit -m "feat(agent): add session-end.sh with handoff + commit log capture"
```

---

### Task 3.3: `blocker.sh` — log blockers, mark task blocked, notify

**Files:**
- Create: `agent/scripts/blocker.sh`
- Create: `agent/scripts/tests/blockers.bats`

- [ ] **Step 1: Write the failing test**

```bash
#!/usr/bin/env bats
load helpers

setup() {
  REPO="$(make_temp_repo)"
  cd "$REPO"
  use_mocks
  cp "$REPO_ROOT_FROM_HELPERS/agent/scripts/blocker.sh" agent/scripts/
  chmod +x agent/scripts/blocker.sh
  # seed active session
  mkdir -p agent/state/sessions
  f="agent/state/sessions/2026-05-15-test-foo.md"
  cat > "$f" <<'EOF'
# Session 2026-05-15 — test — foo
## Blockers raised
EOF
  ln -sf "../../$f" agent/state/.agent-session
}
teardown() { rm -rf "$REPO"; }

@test "blocker --help exits 0" {
  run agent/scripts/blocker.sh --help
  assert_exit_code 0
}

@test "blocker appends to blockers.md" {
  agent/scripts/blocker.sh T-0001 --what "needs D-001" --tried "read docs" --need "framework choice"
  assert_file_contains agent/state/blockers.md "T-0001"
  assert_file_contains agent/state/blockers.md "needs D-001"
}

@test "blocker sets task status to blocked" {
  agent/scripts/blocker.sh T-0001 --what "x" --tried "y" --need "z"
  assert_json_field agent/state/tasks.json '.tasks[] | select(.id=="T-0001") | .status' "blocked"
}

@test "blocker fires notify-send" {
  agent/scripts/blocker.sh T-0001 --what "x" --tried "y" --need "z"
  assert_notify_sent "T-0001"
}

@test "blocker --dry-run modifies nothing" {
  local before="$(sha256sum agent/state/blockers.md)"
  agent/scripts/blocker.sh --dry-run T-0001 --what "x" --tried "y" --need "z"
  local after="$(sha256sum agent/state/blockers.md)"
  [ "$before" = "$after" ]
  assert_json_field agent/state/tasks.json '.tasks[] | select(.id=="T-0001") | .status' "todo"
}

@test "blocker exits 1 on unknown task id" {
  run agent/scripts/blocker.sh T-9999 --what "x" --tried "y" --need "z"
  assert_exit_code 1
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
agent/scripts/test.sh --filter blockers
```
Expected: fail.

- [ ] **Step 3: Implement `blocker.sh`**

```bash
#!/usr/bin/env bash
# blocker.sh — log a blocker, mark task blocked, notify.
# Usage: blocker.sh [--dry-run] <task-id> --what "..." --tried "..." --need "..."
set -euo pipefail
source "$(git rev-parse --show-toplevel)/agent/scripts/lib/common.sh"

DRY_RUN=false
TASK_ID=""
WHAT=""; TRIED=""; NEED=""

while [ $# -gt 0 ]; do
  case "$1" in
    --what)    WHAT="$2"; shift 2 ;;
    --tried)   TRIED="$2"; shift 2 ;;
    --need)    NEED="$2"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    --help|-h) sed -n '2,4p' "$0"; exit 0 ;;
    -*) log_error "unknown flag: $1"; exit 1 ;;
    *)  TASK_ID="$1"; shift ;;
  esac
done

[ -n "$TASK_ID" ] && [ -n "$WHAT" ] && [ -n "$TRIED" ] && [ -n "$NEED" ] || {
  log_error "usage: blocker [--dry-run] <task-id> --what ... --tried ... --need ..."
  exit 1
}

TASKS="$(state_file tasks.json)"
BLOCKERS="$(state_file blockers.md)"

# Confirm task exists.
if [ "$(jq --arg id "$TASK_ID" '[.tasks[] | select(.id == $id)] | length' "$TASKS")" -eq 0 ]; then
  log_error "unknown task id: $TASK_ID"
  exit 1
fi

USER_NAME="$(git config user.name 2>/dev/null || echo unknown)"
TS="$(iso_now)"

$DRY_RUN && { log_info "dry-run: would block $TASK_ID"; exit 0; }

# Append to blockers.md.
KOAD_NOTE="no"
koad_present && { koad signal send "${OWNER:-both}" >/dev/null 2>&1 || true; KOAD_NOTE="yes"; }

cat >> "$BLOCKERS" <<EOF

## ${TS} — ${TASK_ID} — ${USER_NAME} — BLOCKED
**What:** ${WHAT}
**Tried:** ${TRIED}
**Need:** ${NEED}
**Notified:** notify-send fired; koad signal sent: ${KOAD_NOTE}.
---
EOF

# Mark task blocked.
jq_edit "$TASKS" --arg id "$TASK_ID" '
  .tasks |= map(if .id == $id then .status = "blocked" else . end)
'

notify "Anno: blocker on $TASK_ID" "$NEED"

# Best-effort session log.
if [ -L "$(state_file .agent-session)" ]; then
  bash "$(repo_root)/agent/scripts/session-log.sh" --section blockers "$TASK_ID: $NEED" || true
fi
```

- [ ] **Step 4: Run test to verify it passes**

```bash
agent/scripts/test.sh --filter blockers
```
Expected: 6/6 pass.

- [ ] **Step 5: Commit**

```bash
git add agent/scripts/blocker.sh agent/scripts/tests/blockers.bats
git commit -m "feat(agent): add blocker.sh with notify integration"
```

---

## Phase 4 — Task and Decision Flow

### Task 4.1: `task-add.sh` — append a task with auto-ID

**Files:**
- Create: `agent/scripts/task-add.sh`
- Create: `agent/scripts/tests/task_add.bats`

- [ ] **Step 1: Write the failing test**

```bash
#!/usr/bin/env bats
load helpers

setup() {
  REPO="$(make_temp_repo)"
  cd "$REPO"
  use_mocks
  cp "$REPO_ROOT_FROM_HELPERS/agent/scripts/task-add.sh" agent/scripts/
  cp "$REPO_ROOT_FROM_HELPERS/agent/scripts/dashboard-refresh.sh" agent/scripts/
  chmod +x agent/scripts/*.sh
}
teardown() { rm -rf "$REPO"; }

@test "task-add --help exits 0" {
  run agent/scripts/task-add.sh --help
  assert_exit_code 0
}

@test "task-add appends new task with next ID" {
  agent/scripts/task-add.sh --milestone M0 --title "demo task" --est 1 --owner kaleb
  local id="$(jq -r '.tasks[-1].id' agent/state/tasks.json)"
  [ "$id" = "T-0037" ]
  assert_json_field agent/state/tasks.json '.tasks[-1].title' "demo task"
  assert_json_field agent/state/tasks.json '.tasks[-1].milestone' "M0"
  assert_json_field agent/state/tasks.json '.tasks[-1].owner' "kaleb"
  assert_json_field agent/state/tasks.json '.tasks[-1].estHours' "1"
}

@test "task-add refreshes milestones counts" {
  agent/scripts/task-add.sh --milestone M0 --title "demo" --est 1 --owner kaleb
  assert_json_field agent/state/milestones.json '.milestones[0].taskCounts.total' "5"
}

@test "task-add --dry-run does not append" {
  local before="$(jq '.tasks | length' agent/state/tasks.json)"
  agent/scripts/task-add.sh --dry-run --milestone M0 --title "demo" --owner kaleb
  local after="$(jq '.tasks | length' agent/state/tasks.json)"
  [ "$before" = "$after" ]
}

@test "task-add fails with exit 1 on missing milestone" {
  run agent/scripts/task-add.sh --title "demo" --owner kaleb
  assert_exit_code 1
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
agent/scripts/test.sh --filter task_add
```

- [ ] **Step 3: Implement `task-add.sh`**

```bash
#!/usr/bin/env bash
# task-add.sh — append a new task with auto-ID T-NNNN.
# Usage: task-add.sh [--dry-run] --milestone Mn --title "..." [--est H] [--owner kaleb|ian|both]
set -euo pipefail
source "$(git rev-parse --show-toplevel)/agent/scripts/lib/common.sh"

DRY_RUN=false
MILESTONE=""; TITLE=""; EST="null"; OWNER="null"
while [ $# -gt 0 ]; do
  case "$1" in
    --milestone) MILESTONE="$2"; shift 2 ;;
    --title)     TITLE="$2"; shift 2 ;;
    --est)       EST="$2"; shift 2 ;;
    --owner)     OWNER="\"$2\""; shift 2 ;;
    --dry-run)   DRY_RUN=true; shift ;;
    --help|-h)   sed -n '2,4p' "$0"; exit 0 ;;
    *) log_error "unknown arg: $1"; exit 1 ;;
  esac
done

[ -n "$MILESTONE" ] && [ -n "$TITLE" ] || { log_error "--milestone and --title required"; exit 1; }

TASKS="$(state_file tasks.json)"
NEXT_ID="$(jq -r '
  if (.tasks | length) == 0 then "T-0001"
  else (.tasks | map(.id | ltrimstr("T-") | tonumber) | max + 1 | tostring | "T-" + (1000000 + .|tostring|.[-4:]))
  end
' "$TASKS")"
# Simpler/safer counter:
COUNT="$(jq '.tasks | length' "$TASKS")"
NEXT_NUM=$((COUNT + 1))
NEXT_ID="$(printf 'T-%04d' "$NEXT_NUM")"

NOW="$(iso_now)"

$DRY_RUN && { log_info "dry-run: would add $NEXT_ID"; exit 0; }

jq_edit "$TASKS" \
  --arg id "$NEXT_ID" --arg ms "$MILESTONE" --arg title "$TITLE" \
  --arg now "$NOW" --argjson est "$EST" --argjson owner "$OWNER" '
  .tasks += [{
    id: $id, milestone: $ms, title: $title, status: "todo",
    owner: $owner, assignedAgent: null,
    estHours: $est, actualHours: null, blockedBy: [],
    createdAt: $now, completedAt: null, notes: "", sourceUrls: []
  }]
'

bash "$(repo_root)/agent/scripts/dashboard-refresh.sh"
log_info "added $NEXT_ID"
```

- [ ] **Step 4: Run test to verify it passes**

```bash
agent/scripts/test.sh --filter task_add
```
Expected: 5/5 pass.

- [ ] **Step 5: Commit**

```bash
git add agent/scripts/task-add.sh agent/scripts/tests/task_add.bats
git commit -m "feat(agent): add task-add.sh with auto-ID and dashboard refresh"
```

---

### Task 4.2: `task-claim.sh` — set owner and status=active

**Files:**
- Create: `agent/scripts/task-claim.sh`
- Create: `agent/scripts/tests/task_claim.bats`

- [ ] **Step 1: Write the failing test**

```bash
#!/usr/bin/env bats
load helpers

setup() {
  REPO="$(make_temp_repo)"
  cd "$REPO"
  use_mocks
  cp "$REPO_ROOT_FROM_HELPERS/agent/scripts/task-claim.sh" agent/scripts/
  cp "$REPO_ROOT_FROM_HELPERS/agent/scripts/dashboard-refresh.sh" agent/scripts/
  chmod +x agent/scripts/*.sh
  git config user.name "kaleb"
}
teardown() { rm -rf "$REPO"; }

@test "task-claim --help exits 0" {
  run agent/scripts/task-claim.sh --help
  assert_exit_code 0
}

@test "task-claim sets owner, agent, status" {
  agent/scripts/task-claim.sh T-0001 --agent clyde
  assert_json_field agent/state/tasks.json '.tasks[] | select(.id=="T-0001") | .owner' "kaleb"
  assert_json_field agent/state/tasks.json '.tasks[] | select(.id=="T-0001") | .assignedAgent' "clyde"
  assert_json_field agent/state/tasks.json '.tasks[] | select(.id=="T-0001") | .status' "active"
}

@test "task-claim refuses if task already active under different owner" {
  agent/scripts/task-claim.sh T-0001 --agent clyde
  git config user.name "ian"
  run agent/scripts/task-claim.sh T-0001 --agent rook
  assert_exit_code 2
}

@test "task-claim --dry-run does not mutate" {
  local before="$(sha256sum agent/state/tasks.json)"
  agent/scripts/task-claim.sh --dry-run T-0001 --agent clyde
  local after="$(sha256sum agent/state/tasks.json)"
  [ "$before" = "$after" ]
}

@test "task-claim exits 1 on unknown id" {
  run agent/scripts/task-claim.sh T-9999 --agent clyde
  assert_exit_code 1
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
agent/scripts/test.sh --filter task_claim
```

- [ ] **Step 3: Implement `task-claim.sh`**

```bash
#!/usr/bin/env bash
# task-claim.sh — claim a task: set owner, assignedAgent, status=active.
# Usage: task-claim.sh [--dry-run] <task-id> [--agent <name>]
set -euo pipefail
source "$(git rev-parse --show-toplevel)/agent/scripts/lib/common.sh"

DRY_RUN=false; TASK_ID=""; AGENT="null"
while [ $# -gt 0 ]; do
  case "$1" in
    --agent)   AGENT="\"$2\""; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    --help|-h) sed -n '2,4p' "$0"; exit 0 ;;
    -*) log_error "unknown flag: $1"; exit 1 ;;
    *)  TASK_ID="$1"; shift ;;
  esac
done

[ -n "$TASK_ID" ] || { log_error "task id required"; exit 1; }
TASKS="$(state_file tasks.json)"

EXISTS="$(jq --arg id "$TASK_ID" '[.tasks[] | select(.id==$id)] | length' "$TASKS")"
[ "$EXISTS" -eq 1 ] || { log_error "unknown task: $TASK_ID"; exit 1; }

CURRENT_OWNER="$(jq -r --arg id "$TASK_ID" '.tasks[] | select(.id==$id) | .owner // ""' "$TASKS")"
CURRENT_STATUS="$(jq -r --arg id "$TASK_ID" '.tasks[] | select(.id==$id) | .status' "$TASKS")"
USER_NAME="$(git config user.name 2>/dev/null || echo unknown)"

if [ "$CURRENT_STATUS" = "active" ] && [ -n "$CURRENT_OWNER" ] && [ "$CURRENT_OWNER" != "$USER_NAME" ]; then
  log_error "task $TASK_ID already active under $CURRENT_OWNER"
  exit 2
fi

$DRY_RUN && { log_info "dry-run: would claim $TASK_ID"; exit 0; }

jq_edit "$TASKS" --arg id "$TASK_ID" --arg owner "$USER_NAME" --argjson agent "$AGENT" '
  .tasks |= map(if .id == $id then .owner = $owner | .assignedAgent = $agent | .status = "active" else . end)
'

bash "$(repo_root)/agent/scripts/dashboard-refresh.sh"
log_info "claimed $TASK_ID for $USER_NAME"
```

- [ ] **Step 4: Run test to verify it passes**

```bash
agent/scripts/test.sh --filter task_claim
```
Expected: 5/5 pass.

- [ ] **Step 5: Commit**

```bash
git add agent/scripts/task-claim.sh agent/scripts/tests/task_claim.bats
git commit -m "feat(agent): add task-claim.sh"
```

---

### Task 4.3: `task-complete.sh` — complete after quality + graph update

**Files:**
- Create: `agent/scripts/task-complete.sh`
- Create: `agent/scripts/tests/task_complete.bats`

- [ ] **Step 1: Write the failing test**

```bash
#!/usr/bin/env bats
load helpers

setup() {
  REPO="$(make_temp_repo)"
  cd "$REPO"
  use_mocks
  for s in task-complete.sh dashboard-refresh.sh quality-check.sh graph-update.sh; do
    cp "$REPO_ROOT_FROM_HELPERS/agent/scripts/$s" agent/scripts/
  done
  chmod +x agent/scripts/*.sh
  jq '(.tasks[] | select(.id=="T-0001") | .status) = "active"' agent/state/tasks.json > tmp && mv tmp agent/state/tasks.json
}
teardown() { rm -rf "$REPO"; }

@test "task-complete --help exits 0" {
  run agent/scripts/task-complete.sh --help
  assert_exit_code 0
}

@test "task-complete sets status to done and stamps completedAt" {
  agent/scripts/task-complete.sh T-0001 --actual-hours 2.5
  assert_json_field agent/state/tasks.json '.tasks[] | select(.id=="T-0001") | .status' "done"
  assert_json_field agent/state/tasks.json '.tasks[] | select(.id=="T-0001") | .actualHours' "2.5"
  local ts="$(jq -r '.tasks[] | select(.id=="T-0001") | .completedAt' agent/state/tasks.json)"
  [[ "$ts" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T ]]
}

@test "task-complete refuses if quality-check fails" {
  echo 'exit 1' >> agent/scripts/quality-check.sh
  run agent/scripts/task-complete.sh T-0001
  assert_exit_code 1
  assert_json_field agent/state/tasks.json '.tasks[] | select(.id=="T-0001") | .status' "active"
}

@test "task-complete --dry-run does not mutate" {
  local before="$(sha256sum agent/state/tasks.json)"
  agent/scripts/task-complete.sh --dry-run T-0001
  local after="$(sha256sum agent/state/tasks.json)"
  [ "$before" = "$after" ]
}

@test "task-complete exits 1 on unknown id" {
  run agent/scripts/task-complete.sh T-9999
  assert_exit_code 1
}
```

The test depends on `quality-check.sh` and `graph-update.sh` existing. Provide minimal stubs in this task before the real implementations land — they'll be replaced in Tasks 5.1 and 7.2.

- [ ] **Step 2: Write minimal stubs for `quality-check.sh` and `graph-update.sh`**

`agent/scripts/quality-check.sh`:
```bash
#!/usr/bin/env bash
exit 0
```

`agent/scripts/graph-update.sh`:
```bash
#!/usr/bin/env bash
exit 0
```

Make them executable. They will be replaced later.

- [ ] **Step 3: Run test to verify it fails**

```bash
agent/scripts/test.sh --filter task_complete
```

- [ ] **Step 4: Implement `task-complete.sh`**

```bash
#!/usr/bin/env bash
# task-complete.sh — finish a task: run quality-check + graph-update, set done.
# Usage: task-complete.sh [--dry-run] <task-id> [--actual-hours N]
set -euo pipefail
source "$(git rev-parse --show-toplevel)/agent/scripts/lib/common.sh"

DRY_RUN=false; TASK_ID=""; ACTUAL="null"
while [ $# -gt 0 ]; do
  case "$1" in
    --actual-hours) ACTUAL="$2"; shift 2 ;;
    --dry-run)      DRY_RUN=true; shift ;;
    --help|-h)      sed -n '2,4p' "$0"; exit 0 ;;
    -*) log_error "unknown flag: $1"; exit 1 ;;
    *)  TASK_ID="$1"; shift ;;
  esac
done

[ -n "$TASK_ID" ] || { log_error "task id required"; exit 1; }

TASKS="$(state_file tasks.json)"
EXISTS="$(jq --arg id "$TASK_ID" '[.tasks[] | select(.id==$id)] | length' "$TASKS")"
[ "$EXISTS" -eq 1 ] || { log_error "unknown task: $TASK_ID"; exit 1; }

$DRY_RUN && { log_info "dry-run: would complete $TASK_ID"; exit 0; }

ROOT="$(repo_root)"
bash "$ROOT/agent/scripts/quality-check.sh"
bash "$ROOT/agent/scripts/graph-update.sh"

jq_edit "$TASKS" --arg id "$TASK_ID" --arg now "$(iso_now)" --argjson actual "$ACTUAL" '
  .tasks |= map(if .id == $id then
    .status = "done"
    | .completedAt = $now
    | .actualHours = $actual
  else . end)
'

bash "$ROOT/agent/scripts/dashboard-refresh.sh"
log_info "completed $TASK_ID"
```

- [ ] **Step 5: Run test to verify it passes**

```bash
agent/scripts/test.sh --filter task_complete
```
Expected: 5/5 pass.

- [ ] **Step 6: Commit**

```bash
git add agent/scripts/task-complete.sh agent/scripts/tests/task_complete.bats agent/scripts/quality-check.sh agent/scripts/graph-update.sh
git commit -m "feat(agent): add task-complete.sh with quality/graph gating; stub quality-check/graph-update"
```

---

### Task 4.4: `decision-resolve.sh` — move decision open→decided, unblock dependent tasks

**Files:**
- Create: `agent/scripts/decision-resolve.sh`
- Create: `agent/scripts/tests/decisions.bats`

- [ ] **Step 1: Write the failing test**

```bash
#!/usr/bin/env bats
load helpers

setup() {
  REPO="$(make_temp_repo)"
  cd "$REPO"
  use_mocks
  cp "$REPO_ROOT_FROM_HELPERS/agent/scripts/decision-resolve.sh" agent/scripts/
  cp "$REPO_ROOT_FROM_HELPERS/agent/scripts/dashboard-refresh.sh" agent/scripts/
  chmod +x agent/scripts/*.sh
  git config user.name "ian"
}
teardown() { rm -rf "$REPO"; }

@test "decision-resolve --help exits 0" {
  run agent/scripts/decision-resolve.sh --help
  assert_exit_code 0
}

@test "decision-resolve sets chosen, rationale, decidedAt, decidedBy" {
  agent/scripts/decision-resolve.sh D-001 --chosen "React+Vite" --rationale "team familiarity"
  assert_json_field agent/state/decisions.json '.decisions[] | select(.id=="D-001") | .status' "decided"
  assert_json_field agent/state/decisions.json '.decisions[] | select(.id=="D-001") | .chosen' "React+Vite"
  assert_json_field agent/state/decisions.json '.decisions[] | select(.id=="D-001") | .rationale' "team familiarity"
  assert_json_field agent/state/decisions.json '.decisions[] | select(.id=="D-001") | .decidedBy' "ian"
}

@test "decision-resolve removes decision id from task.blockedBy" {
  agent/scripts/decision-resolve.sh D-001 --chosen "React+Vite" --rationale "..."
  assert_json_field agent/state/tasks.json '[.tasks[] | select(.blockedBy | index("D-001"))] | length' "0"
}

@test "decision-resolve --dry-run does not mutate" {
  local before="$(sha256sum agent/state/decisions.json)"
  agent/scripts/decision-resolve.sh --dry-run D-001 --chosen "React+Vite" --rationale "..."
  local after="$(sha256sum agent/state/decisions.json)"
  [ "$before" = "$after" ]
}

@test "decision-resolve exits 1 on unknown id" {
  run agent/scripts/decision-resolve.sh D-9999 --chosen X --rationale Y
  assert_exit_code 1
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
agent/scripts/test.sh --filter decisions
```

- [ ] **Step 3: Implement `decision-resolve.sh`**

```bash
#!/usr/bin/env bash
# decision-resolve.sh — move a decision from open to decided.
# Usage: decision-resolve.sh [--dry-run] <D-ID> --chosen "..." --rationale "..."
set -euo pipefail
source "$(git rev-parse --show-toplevel)/agent/scripts/lib/common.sh"

DRY_RUN=false; D_ID=""; CHOSEN=""; RAT=""
while [ $# -gt 0 ]; do
  case "$1" in
    --chosen)    CHOSEN="$2"; shift 2 ;;
    --rationale) RAT="$2"; shift 2 ;;
    --dry-run)   DRY_RUN=true; shift ;;
    --help|-h)   sed -n '2,4p' "$0"; exit 0 ;;
    -*) log_error "unknown flag: $1"; exit 1 ;;
    *)  D_ID="$1"; shift ;;
  esac
done

[ -n "$D_ID" ] && [ -n "$CHOSEN" ] && [ -n "$RAT" ] || {
  log_error "usage: decision-resolve [--dry-run] <D-ID> --chosen ... --rationale ..."
  exit 1
}

DECISIONS="$(state_file decisions.json)"
TASKS="$(state_file tasks.json)"

EXISTS="$(jq --arg id "$D_ID" '[.decisions[] | select(.id==$id)] | length' "$DECISIONS")"
[ "$EXISTS" -eq 1 ] || { log_error "unknown decision: $D_ID"; exit 1; }

$DRY_RUN && { log_info "dry-run: would resolve $D_ID"; exit 0; }

USER_NAME="$(git config user.name 2>/dev/null || echo unknown)"
NOW_DATE="$(date -u +%Y-%m-%d)"

jq_edit "$DECISIONS" --arg id "$D_ID" --arg c "$CHOSEN" --arg r "$RAT" --arg by "$USER_NAME" --arg d "$NOW_DATE" '
  .decisions |= map(if .id == $id then
    .status = "decided" | .chosen = $c | .rationale = $r | .decidedBy = $by | .decidedAt = $d
  else . end)
'

# Remove this decision id from any task.blockedBy.
jq_edit "$TASKS" --arg id "$D_ID" '
  .tasks |= map(.blockedBy |= map(select(. != $id)))
'

bash "$(repo_root)/agent/scripts/dashboard-refresh.sh"
log_info "resolved $D_ID = $CHOSEN"
```

- [ ] **Step 4: Run test to verify it passes**

```bash
agent/scripts/test.sh --filter decisions
```
Expected: 5/5 pass.

- [ ] **Step 5: Commit**

```bash
git add agent/scripts/decision-resolve.sh agent/scripts/tests/decisions.bats
git commit -m "feat(agent): add decision-resolve.sh with task blockedBy cascade"
```

---

## Phase 5 — Quality and Roadmap Sync

### Task 5.1: Replace `quality-check.sh` stub with full implementation

**Files:**
- Modify: `agent/scripts/quality-check.sh`
- Create: `agent/scripts/tests/quality.bats`

- [ ] **Step 1: Write the failing test**

```bash
#!/usr/bin/env bats
load helpers

setup() {
  REPO="$(make_temp_repo)"
  cd "$REPO"
  use_mocks
  cp "$REPO_ROOT_FROM_HELPERS/agent/scripts/quality-check.sh" agent/scripts/
  chmod +x agent/scripts/quality-check.sh
}
teardown() { rm -rf "$REPO"; }

@test "quality-check --help exits 0" {
  run agent/scripts/quality-check.sh --help
  assert_exit_code 0
}

@test "quality-check passes when no npm scripts present" {
  run agent/scripts/quality-check.sh
  assert_exit_code 0
}

@test "quality-check fails on stretch keyword in changed files" {
  echo "// optimizer scaffolding" > new.ts
  git add new.ts
  run agent/scripts/quality-check.sh --scope changed
  assert_exit_code 1
}

@test "quality-check --dry-run reports but does not fail" {
  echo "// optimizer scaffolding" > new.ts
  git add new.ts
  run agent/scripts/quality-check.sh --dry-run --scope changed
  assert_exit_code 0
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
agent/scripts/test.sh --filter quality
```

- [ ] **Step 3: Implement `quality-check.sh`**

```bash
#!/usr/bin/env bash
# quality-check.sh — lint + typecheck + test + scope-creep grep.
# Usage: quality-check.sh [--scope changed|all] [--dry-run]
set -euo pipefail
source "$(git rev-parse --show-toplevel)/agent/scripts/lib/common.sh"

SCOPE="changed"; DRY_RUN=false
while [ $# -gt 0 ]; do
  case "$1" in
    --scope)   SCOPE="$2"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    --help|-h) sed -n '2,4p' "$0"; exit 0 ;;
    *) log_error "unknown arg: $1"; exit 1 ;;
  esac
done

ROOT="$(repo_root)"
cd "$ROOT"

# 1. npm tasks — skip silently if package.json absent (pre-M0).
if [ -f package.json ]; then
  has_script() { jq -e --arg n "$1" '.scripts | has($n)' package.json >/dev/null 2>&1; }
  has_script lint      && npm run lint
  has_script typecheck && npm run typecheck
  has_script test      && npm test -- --run
fi

# 2. Stretch-keyword scope-creep grep.
STRETCH='optimizer|webrtc|yjs|multiplayer|mod-loader|island-template|timeline-mode'
FILES=()
if [ "$SCOPE" = "changed" ]; then
  while IFS= read -r f; do FILES+=("$f"); done < <(git diff --name-only --cached 2>/dev/null; git diff --name-only 2>/dev/null)
else
  while IFS= read -r f; do FILES+=("$f"); done < <(git ls-files)
fi

HITS=0
if [ "${#FILES[@]}" -gt 0 ]; then
  for f in "${FILES[@]}"; do
    [ -f "$f" ] || continue
    if grep -nE "$STRETCH" "$f" 2>/dev/null; then HITS=1; fi
  done
fi

# 3. Run bats tests for script changes.
if printf '%s\n' "${FILES[@]}" | grep -q '^agent/scripts/'; then
  bash "$ROOT/agent/scripts/test.sh"
fi

if [ "$HITS" -eq 1 ]; then
  log_warn "stretch-feature keywords detected"
  $DRY_RUN || exit 1
fi
log_info "quality-check ok"
```

- [ ] **Step 4: Run test to verify it passes**

```bash
agent/scripts/test.sh --filter quality
```
Expected: 4/4 pass.

- [ ] **Step 5: Commit**

```bash
git add agent/scripts/quality-check.sh agent/scripts/tests/quality.bats
git commit -m "feat(agent): full quality-check.sh with stretch-keyword scope-creep guard"
```

---

### Task 5.2: `roadmap-sync.sh` — reconcile `ROADMAP.md` ↔ `tasks.json`

**Files:**
- Create: `agent/scripts/roadmap-sync.sh`
- Create: `agent/scripts/tests/roadmap_sync.bats`

- [ ] **Step 1: Write the failing test**

```bash
#!/usr/bin/env bats
load helpers

setup() {
  REPO="$(make_temp_repo)"
  cd "$REPO"
  use_mocks
  cp "$REPO_ROOT_FROM_HELPERS/agent/scripts/roadmap-sync.sh" agent/scripts/
  cp "$REPO_ROOT_FROM_HELPERS/docs/ROADMAP.md" docs/ 2>/dev/null || true
  mkdir -p docs && cp "$REPO_ROOT_FROM_HELPERS/agent/scripts/tests/fixtures/ROADMAP.md" docs/ROADMAP.md
  chmod +x agent/scripts/roadmap-sync.sh
}
teardown() { rm -rf "$REPO"; }

@test "roadmap-sync --help exits 0" {
  run agent/scripts/roadmap-sync.sh --help
  assert_exit_code 0
}

@test "roadmap-sync --check passes on seeded state" {
  run agent/scripts/roadmap-sync.sh --check
  assert_exit_code 0
}

@test "roadmap-sync --check fails on drift" {
  agent/scripts/task-add.sh --milestone M0 --title "drift task" --owner kaleb 2>/dev/null || jq '.tasks += [{"id":"T-9999","milestone":"M0","title":"drift task","status":"todo","owner":"kaleb"}]' agent/state/tasks.json > tmp && mv tmp agent/state/tasks.json
  run agent/scripts/roadmap-sync.sh --check
  assert_exit_code 1
}

@test "roadmap-sync --write updates ROADMAP.md from tasks.json" {
  jq '(.tasks[] | select(.id=="T-0001") | .status) = "done"' agent/state/tasks.json > tmp && mv tmp agent/state/tasks.json
  agent/scripts/roadmap-sync.sh --write
  grep -F "[x] Scaffold Vite" docs/ROADMAP.md
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
agent/scripts/test.sh --filter roadmap_sync
```

- [ ] **Step 3: Implement `roadmap-sync.sh`**

```bash
#!/usr/bin/env bash
# roadmap-sync.sh — reconcile docs/ROADMAP.md ↔ agent/state/tasks.json
# Usage: roadmap-sync.sh --check | --write
set -euo pipefail
source "$(git rev-parse --show-toplevel)/agent/scripts/lib/common.sh"

MODE=""
while [ $# -gt 0 ]; do
  case "$1" in
    --check)   MODE=check; shift ;;
    --write)   MODE=write; shift ;;
    --dry-run) MODE=check; shift ;;
    --help|-h) sed -n '2,4p' "$0"; exit 0 ;;
    *) log_error "unknown arg: $1"; exit 1 ;;
  esac
done
[ -n "$MODE" ] || { log_error "specify --check or --write"; exit 1; }

ROAD="$(repo_root)/docs/ROADMAP.md"
TASKS="$(state_file tasks.json)"

# Build set of task titles per milestone from ROADMAP.md ("- [ ] <title>" lines under "## Mn ...").
parse_roadmap() {
  awk '
    /^## M[0-9]/ { ms = $2; next }
    /^- \[[ x~!]\]/ {
      sub(/^- \[[ x~!]\] /, "")
      print ms "\t" $0
    }
  ' "$ROAD"
}

# Build same set from tasks.json.
parse_tasks() {
  jq -r '.tasks[] | "\(.milestone)\t\(.title)"' "$TASKS"
}

RS_DIFF="$(diff <(parse_roadmap | sort) <(parse_tasks | sort) || true)"

if [ "$MODE" = check ]; then
  if [ -n "$RS_DIFF" ]; then
    log_error "drift between ROADMAP.md and tasks.json:"
    echo "$RS_DIFF"
    exit 1
  fi
  log_info "no drift"
  exit 0
fi

# write mode: regenerate the task checkbox lists in ROADMAP.md.
TMP="$(mktemp)"
awk -v TASKS_JSON="$TASKS" '
  BEGIN {
    while (("jq -r \"[.tasks[]] | group_by(.milestone) | .[] | .[0].milestone + \"\\t\" + (map(\"[\" + (if .status==\"done\" then \"x\" elif .status==\"active\" then \"~\" elif .status==\"blocked\" then \"!\" else \" \" end) + \"] \" + .title) | join(\"\\n\"))\" " TASKS_JSON | getline line) > 0) {
      split(line, p, "\t")
      block[p[1]] = p[2]
    }
  }
  /^\*\*Tasks\*\*/ { print; getline; print; ms_pending=1; next }
  ms_pending && /^- \[/ { skip=1 }
  ms_pending && /^[^-]/ && !/^$/ { ms_pending=0; skip=0 }
  /^## M[0-9]/ { ms=$2 }
  ms_pending && skip { next }
  { print }
' "$ROAD" > "$TMP"
mv "$TMP" "$ROAD"
log_info "ROADMAP.md regenerated from tasks.json"
```

> NOTE: The `--write` `awk` block above is intricate. If implementation proves too fragile in awk, switch to a small Python helper at `agent/scripts/lib/roadmap-write.py` invoked by the bash wrapper. The acceptance criterion is round-trip fidelity, not the language used. Add a Python-fallback test case if Python is chosen.

- [ ] **Step 4: Run test to verify it passes**

```bash
agent/scripts/test.sh --filter roadmap_sync
```
Expected: 4/4 pass.

- [ ] **Step 5: Commit**

```bash
git add agent/scripts/roadmap-sync.sh agent/scripts/tests/roadmap_sync.bats
git commit -m "feat(agent): add roadmap-sync.sh (--check/--write)"
```

---

## Phase 6 — Worktree and Agent-Start

### Task 6.1: `worktree-new.sh` and `worktree-clean.sh`

**Files:**
- Create: `agent/scripts/worktree-new.sh`
- Create: `agent/scripts/worktree-clean.sh`
- Create: `agent/scripts/tests/worktree.bats`

- [ ] **Step 1: Write the failing test**

```bash
#!/usr/bin/env bats
load helpers

setup() {
  REPO="$(make_temp_repo)"
  cd "$REPO"
  git commit -q --allow-empty -m "init"
  git branch kaleb
  cp "$REPO_ROOT_FROM_HELPERS/agent/scripts/worktree-new.sh" agent/scripts/
  cp "$REPO_ROOT_FROM_HELPERS/agent/scripts/worktree-clean.sh" agent/scripts/
  chmod +x agent/scripts/*.sh
}
teardown() {
  git worktree prune 2>/dev/null || true
  rm -rf "$REPO" "$BATS_TMPDIR"/anno-planner-wt-* 2>/dev/null || true
}

@test "worktree-new --help exits 0" {
  run agent/scripts/worktree-new.sh --help
  assert_exit_code 0
}

@test "worktree-new creates worktree at expected path" {
  run agent/scripts/worktree-new.sh T-0001 --base kaleb
  assert_exit_code 0
  [ -d "../anno-planner-wt-T-0001" ]
}

@test "worktree-clean lists worktrees" {
  agent/scripts/worktree-new.sh T-0001 --base kaleb
  run agent/scripts/worktree-clean.sh --list
  assert_exit_code 0
  echo "$output" | grep -q "T-0001"
}

@test "worktree-clean refuses on uncommitted changes" {
  agent/scripts/worktree-new.sh T-0001 --base kaleb
  echo dirty > "../anno-planner-wt-T-0001/dirty.txt"
  ( cd "../anno-planner-wt-T-0001" && git add dirty.txt )
  run agent/scripts/worktree-clean.sh
  assert_exit_code 1
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
agent/scripts/test.sh --filter worktree
```

- [ ] **Step 3: Implement `worktree-new.sh`**

```bash
#!/usr/bin/env bash
# worktree-new.sh — create an agent worktree on a human personal branch.
# Usage: worktree-new.sh [--dry-run] <task-id> [--base <branch>]
set -euo pipefail
source "$(git rev-parse --show-toplevel)/agent/scripts/lib/common.sh"

DRY_RUN=false; TASK_ID=""; BASE=""
while [ $# -gt 0 ]; do
  case "$1" in
    --base)    BASE="$2"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    --help|-h) sed -n '2,4p' "$0"; exit 0 ;;
    -*) log_error "unknown flag: $1"; exit 1 ;;
    *)  TASK_ID="$1"; shift ;;
  esac
done

[ -n "$TASK_ID" ] || { log_error "task id required"; exit 1; }
[ -n "$BASE" ] || BASE="$(git symbolic-ref --short HEAD)"

WT_PATH="$(repo_root)/../anno-planner-wt-${TASK_ID}"
SUB_BRANCH="${BASE}/${TASK_ID,,}"

$DRY_RUN && { log_info "dry-run: would create worktree at $WT_PATH on branch $SUB_BRANCH"; exit 0; }

git worktree add -b "$SUB_BRANCH" "$WT_PATH" "$BASE"
log_info "worktree at $WT_PATH on $SUB_BRANCH"
```

- [ ] **Step 4: Implement `worktree-clean.sh`**

```bash
#!/usr/bin/env bash
# worktree-clean.sh — list or prune merged worktrees.
# Usage: worktree-clean.sh [--list] [--dry-run]
set -euo pipefail
source "$(git rev-parse --show-toplevel)/agent/scripts/lib/common.sh"

LIST=false; DRY_RUN=false
while [ $# -gt 0 ]; do
  case "$1" in
    --list)    LIST=true; shift ;;
    --dry-run) DRY_RUN=true; shift ;;
    --help|-h) sed -n '2,4p' "$0"; exit 0 ;;
    *) log_error "unknown arg: $1"; exit 1 ;;
  esac
done

if $LIST; then
  git worktree list
  exit 0
fi

# Refuse on uncommitted changes in any worktree.
while IFS= read -r wt; do
  ( cd "$wt" && [ -z "$(git status --porcelain)" ] ) || {
    log_error "uncommitted changes in $wt"
    exit 1
  }
done < <(git worktree list --porcelain | awk '/^worktree / {print $2}' | tail -n +2)

$DRY_RUN && { log_info "dry-run: would prune merged worktrees"; exit 0; }

git worktree prune
log_info "worktrees pruned"
```

- [ ] **Step 5: Run test to verify it passes**

```bash
agent/scripts/test.sh --filter worktree
```
Expected: 4/4 pass.

- [ ] **Step 6: Commit**

```bash
git add agent/scripts/worktree-new.sh agent/scripts/worktree-clean.sh agent/scripts/tests/worktree.bats
git commit -m "feat(agent): add worktree-new.sh and worktree-clean.sh"
```

---

### Task 6.2: `agent-start.sh` — full bootstrap of a task work session

**Files:**
- Create: `agent/scripts/agent-start.sh`
- Modify: `agent/scripts/tests/session.bats` (append agent-start tests)

- [ ] **Step 1: Append failing tests**

```bash
@test "agent-start --help exits 0" {
  run agent/scripts/agent-start.sh --help
  assert_exit_code 0
}

@test "agent-start claims task and creates session symlink" {
  cp "$REPO_ROOT_FROM_HELPERS/agent/scripts/agent-start.sh" agent/scripts/
  cp "$REPO_ROOT_FROM_HELPERS/agent/scripts/task-claim.sh" agent/scripts/
  cp "$REPO_ROOT_FROM_HELPERS/agent/scripts/worktree-new.sh" agent/scripts/
  cp "$REPO_ROOT_FROM_HELPERS/agent/scripts/graph-status.sh" agent/scripts/
  chmod +x agent/scripts/*.sh
  git config user.name kaleb
  git commit -q --allow-empty -m init
  git branch kaleb
  agent/scripts/agent-start.sh T-0001 --agent clyde --no-worktree
  [ -L agent/state/.agent-session ]
  assert_json_field agent/state/tasks.json '.tasks[] | select(.id=="T-0001") | .status' "active"
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
agent/scripts/test.sh --filter session
```

- [ ] **Step 3: Implement `agent-start.sh`**

```bash
#!/usr/bin/env bash
# agent-start.sh — bootstrap a task session: worktree, claim, session file, context dump.
# Usage: agent-start.sh [--dry-run] <task-id> [--agent <name>] [--no-worktree]
set -euo pipefail
source "$(git rev-parse --show-toplevel)/agent/scripts/lib/common.sh"

DRY_RUN=false; TASK_ID=""; AGENT=""; NO_WT=false
while [ $# -gt 0 ]; do
  case "$1" in
    --agent)       AGENT="$2"; shift 2 ;;
    --no-worktree) NO_WT=true; shift ;;
    --dry-run)     DRY_RUN=true; shift ;;
    --help|-h)     sed -n '2,4p' "$0"; exit 0 ;;
    -*) log_error "unknown flag: $1"; exit 1 ;;
    *)  TASK_ID="$1"; shift ;;
  esac
done

[ -n "$TASK_ID" ] || { log_error "task id required"; exit 1; }
ROOT="$(repo_root)"

$DRY_RUN && { log_info "dry-run: would start session for $TASK_ID"; exit 0; }

if ! $NO_WT; then
  bash "$ROOT/agent/scripts/worktree-new.sh" "$TASK_ID"
fi

bash "$ROOT/agent/scripts/task-claim.sh" "$TASK_ID" ${AGENT:+--agent "$AGENT"}

# Open session file.
TODAY="$(date -u +%Y-%m-%d)"
SLUG="$(echo "${TASK_ID}" | tr '[:upper:]' '[:lower:]')"
USER_NAME="$(git config user.name 2>/dev/null || echo unknown)"
SESS_FILE="$ROOT/agent/state/sessions/${TODAY}-${USER_NAME}-${SLUG}.md"
cat > "$SESS_FILE" <<EOF
# Session ${TODAY} — ${USER_NAME} — ${SLUG}

## Goal
Work on ${TASK_ID}.

## Tasks
- ${TASK_ID} (claimed $(iso_now))

## Decisions made

## Blockers raised

## Notes

## Commits

## Handoff notes
EOF
ln -sf "../../$(realpath --relative-to="$ROOT/agent/state" "$SESS_FILE")" "$ROOT/agent/state/.agent-session" \
  || ln -sf "$SESS_FILE" "$ROOT/agent/state/.agent-session"

# Context dump.
log_info "=== TASK ==="
jq --arg id "$TASK_ID" '.tasks[] | select(.id == $id)' "$ROOT/agent/state/tasks.json"
log_info "=== MILESTONE GOAL ==="
MS="$(jq -r --arg id "$TASK_ID" '.tasks[] | select(.id == $id) | .milestone' "$ROOT/agent/state/tasks.json")"
jq --arg ms "$MS" '.milestones[] | select(.id == $ms) | { id, name, goal }' "$ROOT/agent/state/milestones.json"
log_info "=== OPEN DECISIONS ==="
jq '.decisions[] | select(.status == "open") | { id, topic }' "$ROOT/agent/state/decisions.json"
log_info "=== LAST 3 SESSIONS ==="
ls -1t "$ROOT/agent/state/sessions/"*.md 2>/dev/null | grep -v "$SESS_FILE" | head -3 || true
log_info "=== GRAPH STATUS ==="
bash "$ROOT/agent/scripts/graph-status.sh" 2>/dev/null || log_warn "graph-status unavailable"
```

- [ ] **Step 4: Run test to verify it passes**

Make sure `graph-status.sh` stub exists (from earlier mock or implement now as `#!/usr/bin/env bash; echo "{}"; exit 0`). Then:

```bash
agent/scripts/test.sh --filter session
```
Expected: all session tests pass.

- [ ] **Step 5: Commit**

```bash
git add agent/scripts/agent-start.sh agent/scripts/tests/session.bats
git commit -m "feat(agent): add agent-start.sh with worktree + claim + session"
```

---

### Task 6.3: `agent-status.sh` — one-shot snapshot

**Files:**
- Create: `agent/scripts/agent-status.sh`
- Create: `agent/scripts/tests/agent_status.bats`

- [ ] **Step 1: Write the failing test**

```bash
#!/usr/bin/env bats
load helpers

setup() {
  REPO="$(make_temp_repo)"
  cd "$REPO"
  cp "$REPO_ROOT_FROM_HELPERS/agent/scripts/agent-status.sh" agent/scripts/
  chmod +x agent/scripts/agent-status.sh
}
teardown() { rm -rf "$REPO"; }

@test "agent-status --help exits 0" {
  run agent/scripts/agent-status.sh --help
  assert_exit_code 0
}

@test "agent-status prints active tasks count" {
  jq '(.tasks[] | select(.id=="T-0001") | .status) = "active"' agent/state/tasks.json > tmp && mv tmp agent/state/tasks.json
  run agent/scripts/agent-status.sh
  assert_exit_code 0
  echo "$output" | grep -q "active tasks: 1"
}

@test "agent-status prints blocked tasks count" {
  jq '(.tasks[] | select(.id=="T-0002") | .status) = "blocked"' agent/state/tasks.json > tmp && mv tmp agent/state/tasks.json
  run agent/scripts/agent-status.sh
  echo "$output" | grep -q "blocked tasks: 1"
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
agent/scripts/test.sh --filter agent_status
```

- [ ] **Step 3: Implement `agent-status.sh`**

```bash
#!/usr/bin/env bash
# agent-status.sh — print active/blocked tasks, open sessions, worktrees.
# Usage: agent-status.sh [--help]
set -euo pipefail
source "$(git rev-parse --show-toplevel)/agent/scripts/lib/common.sh"

case "${1:-}" in --help|-h) sed -n '2,4p' "$0"; exit 0 ;; esac

TASKS="$(state_file tasks.json)"
echo "=== anno-planner agent status ($(iso_now)) ==="
echo "active tasks: $(jq '[.tasks[] | select(.status=="active")] | length' "$TASKS")"
echo "blocked tasks: $(jq '[.tasks[] | select(.status=="blocked")] | length' "$TASKS")"
echo "todo tasks: $(jq '[.tasks[] | select(.status=="todo")] | length' "$TASKS")"
echo "done tasks: $(jq '[.tasks[] | select(.status=="done")] | length' "$TASKS")"
echo
echo "=== open sessions (modified <24h) ==="
find "$(repo_root)/agent/state/sessions" -name "*.md" -mtime -1 2>/dev/null | sed 's|.*/||'
echo
echo "=== worktrees ==="
git worktree list
```

- [ ] **Step 4: Run test to verify it passes**

```bash
agent/scripts/test.sh --filter agent_status
```
Expected: 3/3 pass.

- [ ] **Step 5: Commit**

```bash
git add agent/scripts/agent-status.sh agent/scripts/tests/agent_status.bats
git commit -m "feat(agent): add agent-status.sh one-shot summary"
```

---

## Phase 7 — Code-Review-Graph Integration

### Task 7.1: `graph-status.sh` and `graph-update.sh` (replace stub)

**Files:**
- Create: `agent/scripts/graph-status.sh`
- Modify: `agent/scripts/graph-update.sh`
- Create: `agent/scripts/tests/crg.bats`

- [ ] **Step 1: Write the failing test**

```bash
#!/usr/bin/env bats
load helpers

setup() {
  REPO="$(make_temp_repo)"
  cd "$REPO"
  use_mocks
  cp "$REPO_ROOT_FROM_HELPERS/agent/scripts/graph-status.sh" agent/scripts/
  cp "$REPO_ROOT_FROM_HELPERS/agent/scripts/graph-update.sh" agent/scripts/
  chmod +x agent/scripts/*.sh
}
teardown() { rm -rf "$REPO"; }

@test "graph-status --help exits 0" {
  run agent/scripts/graph-status.sh --help
  assert_exit_code 0
}

@test "graph-status writes .crg-status.json" {
  agent/scripts/graph-status.sh
  [ -f agent/state/.crg-status.json ]
  assert_json_field agent/state/.crg-status.json '.nodes' "42"
}

@test "graph-update calls crg update and refreshes status" {
  agent/scripts/graph-update.sh
  [ -f agent/state/.crg-status.json ]
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
agent/scripts/test.sh --filter crg
```

- [ ] **Step 3: Implement `graph-status.sh`**

```bash
#!/usr/bin/env bash
# graph-status.sh — wrap `crg status`, write .crg-status.json.
# Usage: graph-status.sh [--help]
set -euo pipefail
source "$(git rev-parse --show-toplevel)/agent/scripts/lib/common.sh"
case "${1:-}" in --help|-h) sed -n '2,4p' "$0"; exit 0 ;; esac
require_dep code-review-graph

OUT="$(state_file .crg-status.json)"
RAW="$(code-review-graph status)"
LAST_UPDATE="$(iso_now)"

# Compose normalized status.
echo "$RAW" | jq --arg lu "$LAST_UPDATE" '
  { lastBuild: (.last_build // null), lastUpdate: $lu, nodes: (.nodes // 0), edges: (.edges // 0), fresh: true }
' > "$OUT"
cat "$OUT"
```

- [ ] **Step 4: Implement `graph-update.sh` (replace stub)**

```bash
#!/usr/bin/env bash
# graph-update.sh — incremental graph update + refresh status.
# Usage: graph-update.sh [--help]
set -euo pipefail
source "$(git rev-parse --show-toplevel)/agent/scripts/lib/common.sh"
case "${1:-}" in --help|-h) sed -n '2,4p' "$0"; exit 0 ;; esac
require_dep code-review-graph
code-review-graph update >/dev/null
bash "$(repo_root)/agent/scripts/graph-status.sh"
```

- [ ] **Step 5: Run test to verify it passes**

```bash
agent/scripts/test.sh --filter crg
```
Expected: 3/3 pass.

- [ ] **Step 6: Commit**

```bash
git add agent/scripts/graph-status.sh agent/scripts/graph-update.sh agent/scripts/tests/crg.bats
git commit -m "feat(agent): graph-status + graph-update via code-review-graph MCP"
```

---

### Task 7.2: `graph-bootstrap.sh`, `graph-watch.sh`, `graph-impact.sh`, `find-similar.sh`

**Files:**
- Create: `agent/scripts/graph-bootstrap.sh`
- Create: `agent/scripts/graph-watch.sh`
- Create: `agent/scripts/graph-impact.sh`
- Create: `agent/scripts/find-similar.sh`
- Modify: `agent/scripts/tests/crg.bats` (append cases)

- [ ] **Step 1: Append failing tests**

```bash
@test "graph-bootstrap calls register/init/build" {
  cp "$REPO_ROOT_FROM_HELPERS/agent/scripts/graph-bootstrap.sh" agent/scripts/
  chmod +x agent/scripts/graph-bootstrap.sh
  run agent/scripts/graph-bootstrap.sh
  assert_exit_code 0
}

@test "graph-impact returns JSON" {
  cp "$REPO_ROOT_FROM_HELPERS/agent/scripts/graph-impact.sh" agent/scripts/
  chmod +x agent/scripts/graph-impact.sh
  run agent/scripts/graph-impact.sh
  assert_exit_code 0
  echo "$output" | jq -e '.affected_modules' >/dev/null
}

@test "find-similar accepts query" {
  cp "$REPO_ROOT_FROM_HELPERS/agent/scripts/find-similar.sh" agent/scripts/
  chmod +x agent/scripts/find-similar.sh
  run agent/scripts/find-similar.sh "undo middleware"
  assert_exit_code 0
}
```

- [ ] **Step 2: Implement the four scripts**

`graph-bootstrap.sh`:
```bash
#!/usr/bin/env bash
# graph-bootstrap.sh — one-time crg register + init + build.
set -euo pipefail
source "$(git rev-parse --show-toplevel)/agent/scripts/lib/common.sh"
case "${1:-}" in --help|-h) sed -n '2,4p' "$0"; exit 0 ;; esac
require_dep code-review-graph
code-review-graph register
code-review-graph init
code-review-graph build
bash "$(repo_root)/agent/scripts/graph-status.sh"
log_info "graph bootstrap complete"
```

`graph-watch.sh`:
```bash
#!/usr/bin/env bash
# graph-watch.sh — start/stop background crg watch.
set -euo pipefail
source "$(git rev-parse --show-toplevel)/agent/scripts/lib/common.sh"
PID_FILE="$(state_file .crg-watch.pid)"
case "${1:-start}" in
  --stop|stop)
    [ -f "$PID_FILE" ] || { log_info "no watch running"; exit 0; }
    kill "$(cat "$PID_FILE")" 2>/dev/null || true
    rm -f "$PID_FILE"
    log_info "watch stopped"
    ;;
  --help|-h) sed -n '2,4p' "$0"; exit 0 ;;
  *)
    [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null && { log_warn "already running"; exit 0; }
    require_dep code-review-graph
    nohup code-review-graph watch >/dev/null 2>&1 &
    echo $! > "$PID_FILE"
    log_info "watch started (pid $!)"
    ;;
esac
```

`graph-impact.sh`:
```bash
#!/usr/bin/env bash
# graph-impact.sh — emit JSON impact for changes vs base branch.
set -euo pipefail
source "$(git rev-parse --show-toplevel)/agent/scripts/lib/common.sh"
BASE="dev"
while [ $# -gt 0 ]; do
  case "$1" in
    --base)    BASE="$2"; shift 2 ;;
    --help|-h) sed -n '2,4p' "$0"; exit 0 ;;
    *) log_error "unknown arg: $1"; exit 1 ;;
  esac
done
require_dep code-review-graph
code-review-graph detect-changes
```

`find-similar.sh`:
```bash
#!/usr/bin/env bash
# find-similar.sh — semantic redundancy guard via crg.
set -euo pipefail
source "$(git rev-parse --show-toplevel)/agent/scripts/lib/common.sh"
QUERY="${*:-}"
[ -n "$QUERY" ] || { log_error "usage: find-similar \"<query>\""; exit 1; }
require_dep code-review-graph
# Real CRG has search subcommand; mock just echoes ok.
code-review-graph search "$QUERY" 2>/dev/null || echo "[]"
```

- [ ] **Step 3: Run test to verify it passes**

```bash
agent/scripts/test.sh --filter crg
```
Expected: 6/6 pass.

- [ ] **Step 4: Commit**

```bash
git add agent/scripts/graph-bootstrap.sh agent/scripts/graph-watch.sh agent/scripts/graph-impact.sh agent/scripts/find-similar.sh agent/scripts/tests/crg.bats
git commit -m "feat(agent): graph-bootstrap/watch/impact + find-similar.sh"
```

---

## Phase 8 — PR Prep

### Task 8.1: `pr-prep.sh` — generate PR body with impact section

**Files:**
- Create: `agent/scripts/pr-prep.sh`
- Create: `agent/scripts/tests/pr_prep.bats`

- [ ] **Step 1: Write the failing test**

```bash
#!/usr/bin/env bats
load helpers

setup() {
  REPO="$(make_temp_repo)"
  cd "$REPO"
  use_mocks
  cp "$REPO_ROOT_FROM_HELPERS/agent/scripts/pr-prep.sh" agent/scripts/
  cp "$REPO_ROOT_FROM_HELPERS/agent/scripts/quality-check.sh" agent/scripts/
  cp "$REPO_ROOT_FROM_HELPERS/agent/scripts/graph-impact.sh" agent/scripts/
  chmod +x agent/scripts/*.sh
  git commit -q --allow-empty -m init
  git branch kaleb
}
teardown() { rm -rf "$REPO"; }

@test "pr-prep --help exits 0" {
  run agent/scripts/pr-prep.sh --help
  assert_exit_code 0
}

@test "pr-prep outputs PR body with required sections" {
  run agent/scripts/pr-prep.sh --target kaleb
  assert_exit_code 0
  echo "$output" | grep -q "## What changed"
  echo "$output" | grep -q "## Why"
  echo "$output" | grep -q "## Human reviewer checklist"
  echo "$output" | grep -q "## Impact"
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
agent/scripts/test.sh --filter pr_prep
```

- [ ] **Step 3: Implement `pr-prep.sh`**

```bash
#!/usr/bin/env bash
# pr-prep.sh — print a PR body to stdout. Run quality-check first.
# Usage: pr-prep.sh [--target <branch>]
set -euo pipefail
source "$(git rev-parse --show-toplevel)/agent/scripts/lib/common.sh"

TARGET="dev"
while [ $# -gt 0 ]; do
  case "$1" in
    --target)  TARGET="$2"; shift 2 ;;
    --help|-h) sed -n '2,4p' "$0"; exit 0 ;;
    *) log_error "unknown arg: $1"; exit 1 ;;
  esac
done

ROOT="$(repo_root)"
bash "$ROOT/agent/scripts/quality-check.sh"

# Gather active task titles.
ACTIVE_TASKS="$(jq -r '[.tasks[] | select(.status=="active") | .id + " " + .title] | .[]' "$ROOT/agent/state/tasks.json" 2>/dev/null || true)"

# Commits since target.
COMMITS="$(git log "${TARGET}..HEAD" --pretty='- %h %s' 2>/dev/null || echo "- (no commits since $TARGET)")"

# Impact section.
IMPACT="$(bash "$ROOT/agent/scripts/graph-impact.sh" --base "$TARGET" 2>/dev/null || echo '{}')"

# Most recent session handoff.
LATEST_SESSION="$(ls -1t "$ROOT/agent/state/sessions/"*.md 2>/dev/null | head -1 || true)"
HANDOFF=""
[ -n "$LATEST_SESSION" ] && HANDOFF="$(awk '/^## Handoff notes/{flag=1;next} /^## /{flag=0} flag' "$LATEST_SESSION")"

cat <<EOF
## What changed
${ACTIVE_TASKS:-(describe here)}

## Why
(motivation / ticket ref)

## Commits
$COMMITS

## Human reviewer checklist
- [ ] Canvas feel / UX (Kaleb)
- [ ] Math correctness (Ian)
- [ ] Stat accuracy vs wiki
- [ ] No stretch features introduced

## Impact (code-review-graph)
\`\`\`json
$IMPACT
\`\`\`

## Session handoff
${HANDOFF:-(none)}
EOF
```

- [ ] **Step 4: Run test to verify it passes**

```bash
agent/scripts/test.sh --filter pr_prep
```
Expected: 2/2 pass.

- [ ] **Step 5: Commit**

```bash
git add agent/scripts/pr-prep.sh agent/scripts/tests/pr_prep.bats
git commit -m "feat(agent): add pr-prep.sh with quality gate + impact section"
```

---

## Phase 9 — Stubs and Maintenance

### Task 9.1: Domain stubs (`building-add.sh`, `wiki-fetch.sh`, `wiki-cache-warm.sh`)

**Files:**
- Create: `agent/scripts/building-add.sh`
- Create: `agent/scripts/wiki-fetch.sh`
- Create: `agent/scripts/wiki-cache-warm.sh`
- Create: `agent/scripts/tests/stubs.bats`

- [ ] **Step 1: Write the failing test**

```bash
#!/usr/bin/env bats
load helpers

setup() {
  REPO="$(make_temp_repo)"
  cd "$REPO"
  for s in building-add.sh wiki-fetch.sh wiki-cache-warm.sh; do
    cp "$REPO_ROOT_FROM_HELPERS/agent/scripts/$s" agent/scripts/
  done
  chmod +x agent/scripts/*.sh
}
teardown() { rm -rf "$REPO"; }

@test "building-add --help exits 0" { run agent/scripts/building-add.sh --help; assert_exit_code 0; }
@test "wiki-fetch --help exits 0" { run agent/scripts/wiki-fetch.sh --help; assert_exit_code 0; }
@test "wiki-cache-warm --help exits 0" { run agent/scripts/wiki-cache-warm.sh --help; assert_exit_code 0; }

@test "building-add exits 2 when called pre-M2" { run agent/scripts/building-add.sh --slug x; assert_exit_code 2; }
@test "wiki-fetch exits 2 when called pre-M2" { run agent/scripts/wiki-fetch.sh x; assert_exit_code 2; }
```

- [ ] **Step 2: Implement the three stubs**

`building-add.sh`:
```bash
#!/usr/bin/env bash
# building-add.sh — STUB (lands in M2). Append a building to catalog JSON with schema check.
set -euo pipefail
case "${1:-}" in --help|-h) sed -n '2,3p' "$0"; exit 0 ;; esac
echo "building-add: not implemented until M2 (catalog milestone)" >&2
exit 2
```

`wiki-fetch.sh`:
```bash
#!/usr/bin/env bash
# wiki-fetch.sh — STUB (lands in M2). Fetch + cache an Anno 1800 wiki page.
set -euo pipefail
case "${1:-}" in --help|-h) sed -n '2,3p' "$0"; exit 0 ;; esac
echo "wiki-fetch: not implemented until M2 (catalog milestone)" >&2
exit 2
```

`wiki-cache-warm.sh`:
```bash
#!/usr/bin/env bash
# wiki-cache-warm.sh — STUB (lands in M2). Bulk pre-fetch wiki pages from a list file.
set -euo pipefail
case "${1:-}" in --help|-h) sed -n '2,3p' "$0"; exit 0 ;; esac
echo "wiki-cache-warm: not implemented until M2 (catalog milestone)" >&2
exit 2
```

- [ ] **Step 3: Run tests**

```bash
agent/scripts/test.sh --filter stubs
```
Expected: 5/5 pass.

- [ ] **Step 4: Commit**

```bash
git add agent/scripts/building-add.sh agent/scripts/wiki-fetch.sh agent/scripts/wiki-cache-warm.sh agent/scripts/tests/stubs.bats
git commit -m "feat(agent): add M2-deferred stubs (building-add, wiki-fetch, wiki-cache-warm)"
```

---

### Task 9.2: `coverage-report.sh`, `bundle-budget.sh`, `cleanup.sh`

**Files:**
- Create: `agent/scripts/coverage-report.sh`
- Create: `agent/scripts/bundle-budget.sh`
- Create: `agent/scripts/cleanup.sh`
- Create: `agent/scripts/tests/health.bats`

- [ ] **Step 1: Write the failing tests**

```bash
#!/usr/bin/env bats
load helpers

setup() {
  REPO="$(make_temp_repo)"
  cd "$REPO"
  for s in coverage-report.sh bundle-budget.sh cleanup.sh; do
    cp "$REPO_ROOT_FROM_HELPERS/agent/scripts/$s" agent/scripts/
  done
  chmod +x agent/scripts/*.sh
}
teardown() { rm -rf "$REPO"; }

@test "coverage-report --help exits 0" { run agent/scripts/coverage-report.sh --help; assert_exit_code 0; }
@test "bundle-budget --help exits 0"   { run agent/scripts/bundle-budget.sh --help;   assert_exit_code 0; }
@test "cleanup --help exits 0"         { run agent/scripts/cleanup.sh --help;         assert_exit_code 0; }

@test "coverage-report exits 0 if no coverage tool present" {
  run agent/scripts/coverage-report.sh
  assert_exit_code 0
}

@test "cleanup archives session files older than 30 days" {
  echo "old" > agent/state/sessions/2025-01-01-old.md
  touch -t 202501010000 agent/state/sessions/2025-01-01-old.md
  agent/scripts/cleanup.sh
  [ -f agent/state/sessions/archive/2025-01-01-old.md ]
}
```

- [ ] **Step 2: Implement the three scripts**

`coverage-report.sh`:
```bash
#!/usr/bin/env bash
# coverage-report.sh — per-module coverage breakdown (delegates to npm run coverage if present).
set -euo pipefail
source "$(git rev-parse --show-toplevel)/agent/scripts/lib/common.sh"
case "${1:-}" in --help|-h) sed -n '2,3p' "$0"; exit 0 ;; esac
if [ -f package.json ] && jq -e '.scripts.coverage' package.json >/dev/null 2>&1; then
  npm run coverage
else
  log_info "no coverage script configured; skipping"
fi
```

`bundle-budget.sh`:
```bash
#!/usr/bin/env bash
# bundle-budget.sh — fail if dist bundle exceeds threshold.
set -euo pipefail
source "$(git rev-parse --show-toplevel)/agent/scripts/lib/common.sh"

THRESHOLD_KB=500
while [ $# -gt 0 ]; do
  case "$1" in
    --threshold-kb) THRESHOLD_KB="$2"; shift 2 ;;
    --help|-h)      sed -n '2,3p' "$0"; exit 0 ;;
    *) log_error "unknown arg: $1"; exit 1 ;;
  esac
done

DIST="$(repo_root)/dist"
[ -d "$DIST" ] || { log_info "no dist/ yet; skipping"; exit 0; }
SIZE_KB=$(( $(du -sk "$DIST" | awk '{print $1}') ))
if [ "$SIZE_KB" -gt "$THRESHOLD_KB" ]; then
  log_error "bundle size ${SIZE_KB}kb exceeds threshold ${THRESHOLD_KB}kb"
  exit 1
fi
log_info "bundle size ${SIZE_KB}kb under ${THRESHOLD_KB}kb"
```

`cleanup.sh`:
```bash
#!/usr/bin/env bash
# cleanup.sh — prune merged worktrees; archive sessions older than 30 days.
set -euo pipefail
source "$(git rev-parse --show-toplevel)/agent/scripts/lib/common.sh"
case "${1:-}" in --help|-h) sed -n '2,3p' "$0"; exit 0 ;; esac

ROOT="$(repo_root)"
mkdir -p "$ROOT/agent/state/sessions/archive"

while IFS= read -r f; do
  mv "$f" "$ROOT/agent/state/sessions/archive/"
done < <(find "$ROOT/agent/state/sessions" -maxdepth 1 -name "*.md" -mtime +30 2>/dev/null)

git worktree prune || true
log_info "cleanup complete"
```

- [ ] **Step 3: Run tests**

```bash
agent/scripts/test.sh --filter health
```
Expected: 5/5 pass.

- [ ] **Step 4: Commit**

```bash
git add agent/scripts/coverage-report.sh agent/scripts/bundle-budget.sh agent/scripts/cleanup.sh agent/scripts/tests/health.bats
git commit -m "feat(agent): add coverage-report, bundle-budget, cleanup"
```

---

## Phase 10 — Git Hooks

### Task 10.1: Hook scripts and installer

**Files:**
- Create: `agent/scripts/hooks/post-commit`
- Create: `agent/scripts/hooks/pre-push`
- Create: `agent/scripts/hooks/post-merge`
- Create: `agent/scripts/tests/hooks.bats`

- [ ] **Step 1: Write the failing test**

```bash
#!/usr/bin/env bats
load helpers

setup() {
  REPO="$(make_temp_repo)"
  cd "$REPO"
  use_mocks
  cp -r "$REPO_ROOT_FROM_HELPERS/agent/scripts/hooks" agent/scripts/
  cp "$REPO_ROOT_FROM_HELPERS/agent/scripts/session-log.sh" agent/scripts/
  cp "$REPO_ROOT_FROM_HELPERS/agent/scripts/quality-check.sh" agent/scripts/
  cp "$REPO_ROOT_FROM_HELPERS/agent/scripts/graph-update.sh" agent/scripts/
  chmod +x agent/scripts/*.sh agent/scripts/hooks/*
  ln -sf "$(pwd)/agent/scripts/hooks/post-commit" .git/hooks/post-commit
  ln -sf "$(pwd)/agent/scripts/hooks/pre-push" .git/hooks/pre-push
  ln -sf "$(pwd)/agent/scripts/hooks/post-merge" .git/hooks/post-merge
  # seed active session
  mkdir -p agent/state/sessions
  f="agent/state/sessions/2026-05-15-test-foo.md"
  cat > "$f" <<'EOF'
# Session

## Commits

## Notes
EOF
  ln -sf "../../$f" agent/state/.agent-session
}
teardown() { rm -rf "$REPO"; }

@test "post-commit appends to session commit list" {
  echo "x" > a.txt; git add a.txt
  git commit -q -m "feat: a"
  assert_file_contains agent/state/sessions/2026-05-15-test-foo.md "feat: a"
}

@test "pre-push runs quality-check" {
  # Quality stub exits 0 by default; ensure hook invokes it without error.
  run bash agent/scripts/hooks/pre-push
  assert_exit_code 0
}

@test "post-merge calls graph-update" {
  run bash agent/scripts/hooks/post-merge
  assert_exit_code 0
}
```

- [ ] **Step 2: Implement the hooks**

`agent/scripts/hooks/post-commit`:
```bash
#!/usr/bin/env bash
# post-commit hook — append last commit to current session log.
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"
[ -L "$ROOT/agent/state/.agent-session" ] || exit 0
SUBJECT="$(git log -1 --pretty='%h %s')"
bash "$ROOT/agent/scripts/session-log.sh" --section commits "$SUBJECT" || true
```

`agent/scripts/hooks/pre-push`:
```bash
#!/usr/bin/env bash
# pre-push hook — run quality-check (which includes bats for script changes).
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"
bash "$ROOT/agent/scripts/quality-check.sh" --scope changed
```

`agent/scripts/hooks/post-merge`:
```bash
#!/usr/bin/env bash
# post-merge hook — refresh code-review-graph.
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"
bash "$ROOT/agent/scripts/graph-update.sh" || true
```

- [ ] **Step 3: Run tests**

```bash
agent/scripts/test.sh --filter hooks
```
Expected: 3/3 pass.

- [ ] **Step 4: Commit**

```bash
git add agent/scripts/hooks/ agent/scripts/tests/hooks.bats
git commit -m "feat(agent): post-commit/pre-push/post-merge hooks"
```

---

## Phase 11 — Bootstrap

### Task 11.1: `bootstrap.sh` — idempotent one-time setup

**Files:**
- Create: `agent/scripts/bootstrap.sh`
- Create: `agent/scripts/tests/bootstrap.bats`

- [ ] **Step 1: Write the failing test**

```bash
#!/usr/bin/env bats
load helpers

setup() {
  REPO="$(make_temp_repo)"
  cd "$REPO"
  use_mocks
  cp "$REPO_ROOT_FROM_HELPERS/agent/scripts/bootstrap.sh" agent/scripts/
  cp "$REPO_ROOT_FROM_HELPERS/agent/scripts/graph-bootstrap.sh" agent/scripts/
  cp "$REPO_ROOT_FROM_HELPERS/agent/scripts/graph-status.sh" agent/scripts/
  cp "$REPO_ROOT_FROM_HELPERS/agent/scripts/dashboard-refresh.sh" agent/scripts/
  cp -r "$REPO_ROOT_FROM_HELPERS/agent/scripts/hooks" agent/scripts/
  chmod +x agent/scripts/*.sh agent/scripts/hooks/*
}
teardown() { rm -rf "$REPO"; }

@test "bootstrap --help exits 0" {
  run agent/scripts/bootstrap.sh --help
  assert_exit_code 0
}

@test "bootstrap installs git hooks" {
  agent/scripts/bootstrap.sh
  [ -L .git/hooks/post-commit ]
  [ -L .git/hooks/pre-push ]
  [ -L .git/hooks/post-merge ]
}

@test "bootstrap is idempotent" {
  agent/scripts/bootstrap.sh
  run agent/scripts/bootstrap.sh
  assert_exit_code 0
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
agent/scripts/test.sh --filter bootstrap
```

- [ ] **Step 3: Implement `bootstrap.sh`**

```bash
#!/usr/bin/env bash
# bootstrap.sh — one-time agent infrastructure setup. Idempotent.
set -euo pipefail
source "$(git rev-parse --show-toplevel)/agent/scripts/lib/common.sh"
case "${1:-}" in --help|-h) sed -n '2,3p' "$0"; exit 0 ;; esac

ROOT="$(repo_root)"

# 1. Verify deps.
for dep in git jq; do require_dep "$dep"; done
command -v notify-send >/dev/null 2>&1 || log_warn "notify-send missing — escalation will print to stderr only"
command -v code-review-graph >/dev/null 2>&1 || log_warn "code-review-graph missing — graph features disabled"

# 2. Ensure state skeleton exists (idempotent).
mkdir -p "$ROOT/agent/state/sessions"
[ -f "$ROOT/agent/state/blockers.md" ] || printf '# Blockers Log\n\n---\n' > "$ROOT/agent/state/blockers.md"

# 3. Graph bootstrap (skip if no crg).
if command -v code-review-graph >/dev/null 2>&1; then
  bash "$ROOT/agent/scripts/graph-bootstrap.sh" || log_warn "graph-bootstrap failed"
fi

# 4. Install git hooks (idempotent symlinks).
for h in post-commit pre-push post-merge; do
  ln -sfn "$ROOT/agent/scripts/hooks/$h" "$ROOT/.git/hooks/$h"
done

# 5. Refresh dashboard.
bash "$ROOT/agent/scripts/dashboard-refresh.sh"

# 6. Run tests (gate on green).
bash "$ROOT/agent/scripts/test.sh" || { log_error "tests failed; bootstrap aborted"; exit 1; }

log_info "ready — open dashboard/index.html via:"
log_info "  cd $ROOT && python3 -m http.server 8000 && open http://localhost:8000/dashboard/"
```

- [ ] **Step 4: Run test to verify it passes**

```bash
agent/scripts/test.sh --filter bootstrap
```
Expected: 3/3 pass.

- [ ] **Step 5: Commit**

```bash
git add agent/scripts/bootstrap.sh agent/scripts/tests/bootstrap.bats
git commit -m "feat(agent): add bootstrap.sh (idempotent setup with test gate)"
```

---

## Phase 12 — Skill Documents

Each skill doc is short and declarative; bundle into one task with sub-step commits.

### Task 12.1: Write all nine skill docs

**Files:**
- Create: `agent/skills/README.md`
- Create: `agent/skills/task-assessment.md`
- Create: `agent/skills/coding-standards.md`
- Create: `agent/skills/code-structure.md`
- Create: `agent/skills/valid-sources.md`
- Create: `agent/skills/escalation.md`
- Create: `agent/skills/session-protocol.md`
- Create: `agent/skills/pr-protocol.md`
- Create: `agent/skills/code-graph.md`

- [ ] **Step 1: Write `README.md`**

```markdown
# Agent Skills

Protocols that gate agent actions. Read the relevant skill **before** the action.

| Skill | When to read | Automation |
|---|---|---|
| [task-assessment](task-assessment.md) | Before claiming a task | `agent-start.sh` |
| [coding-standards](coding-standards.md) | Before writing code | `quality-check.sh` |
| [code-structure](code-structure.md) | Before adding files / refactoring | `find-similar.sh` |
| [valid-sources](valid-sources.md) | Before citing data or library docs | (manual) |
| [escalation](escalation.md) | When blocked or over budget | `blocker.sh` |
| [session-protocol](session-protocol.md) | At session start, during, end | `agent-start.sh` / `session-end.sh` |
| [pr-protocol](pr-protocol.md) | Before opening a PR | `pr-prep.sh` |
| [code-graph](code-graph.md) | Before edits >2 files; pre-PR | `graph-impact.sh` |

**Invocation rule:** if a skill applies, read it. If automation enforces it, run the script. Skills override default behavior; user instructions in `CONTRIBUTING.md` override skills.
```

- [ ] **Step 2: Write `task-assessment.md`**

Copy content of spec §7.2 verbatim.

- [ ] **Step 3: Write `coding-standards.md`**

Copy content of spec §7.3 verbatim.

- [ ] **Step 4: Write `code-structure.md`**

Copy content of spec §7.4 verbatim.

- [ ] **Step 5: Write `valid-sources.md`**

Copy content of spec §7.5 verbatim.

- [ ] **Step 6: Write `escalation.md`**

Copy content of spec §7.6 verbatim.

- [ ] **Step 7: Write `session-protocol.md`**

Copy content of spec §7.7 verbatim.

- [ ] **Step 8: Write `pr-protocol.md`**

Copy content of spec §7.8 verbatim.

- [ ] **Step 9: Write `code-graph.md`**

Copy content of spec §7.9 verbatim.

- [ ] **Step 10: Verify all skills exist + linked**

```bash
for s in task-assessment coding-standards code-structure valid-sources escalation session-protocol pr-protocol code-graph; do
  [ -f "agent/skills/$s.md" ] || { echo "missing $s"; exit 1; }
  grep -q "$s" agent/skills/README.md || { echo "$s not linked from README"; exit 1; }
done
echo "all skills present and linked"
```

- [ ] **Step 11: Commit**

```bash
git add agent/skills/
git commit -m "docs(agent): add skill protocols (task-assessment, coding-standards, …, code-graph)"
```

---

## Phase 13 — Dashboard Live-Wiring

### Task 13.1: Rewire `dashboard/index.html` to fetch JSON

**Files:**
- Modify: `dashboard/index.html`

- [ ] **Step 1: Replace hardcoded sections with template containers**

Locate the existing `<div class="milestones">…</div>` block and replace its inner HTML with `<div id="milestones"></div>`. Do the same for `Current Focus` `<ul>` → `<ul id="current-focus" class="task-list"></ul>`; `Open Decisions` `<ul>` → `<ul id="decisions" class="decision-list"></ul>`. Add new cards:

```html
<div class="grid-3">
  <div class="card">
    <h3>Graph Health</h3>
    <div id="graph-health" style="font-size:.85rem;color:var(--muted)"></div>
  </div>
  <div class="card">
    <h3>Active Sessions (24h)</h3>
    <ul id="active-sessions" class="task-list"></ul>
  </div>
  <div class="card">
    <h3>Recent Blockers</h3>
    <ul id="recent-blockers" class="task-list"></ul>
  </div>
</div>
```

Update header subtitle to `<span class="subtitle" id="updated-stamp">Loading…</span>`.

- [ ] **Step 2: Append `<script>` block before `</body>`**

```html
<script>
const STATE = '../agent/state';

const statusBadge = (status) => {
  const map = { active: 'active', pending: 'pending', done: 'done', blocked: 'blocked' };
  return `<span class="badge ${map[status] || 'pending'}">${status}</span>`;
};

async function loadMilestones() {
  const data = await fetch(`${STATE}/milestones.json`).then(r => r.json());
  const root = document.getElementById('milestones');
  root.innerHTML = data.milestones.map(m => {
    const c = m.taskCounts;
    const pct = c.total ? Math.round((c.done / c.total) * 100) : 0;
    return `
      <div class="milestone ${m.status === 'active' ? 'active' : ''}">
        <div>
          <div class="label">${m.id} · ${m.name}</div>
          <div class="desc">${m.estDays[0]}–${m.estDays[1]} days</div>
        </div>
        <div>
          <div class="name">${m.goal}</div>
          <div class="progress-wrap">
            <div class="progress-bar"><div class="fill ${pct === 100 ? 'done' : ''}" style="width:${pct}%"></div></div>
            <div class="progress-label">${c.done} / ${c.total} tasks${c.blocked ? ' · ' + c.blocked + ' blocked' : ''}</div>
          </div>
        </div>
        ${statusBadge(m.status)}
      </div>`;
  }).join('');
  document.getElementById('updated-stamp').textContent = `Dev Dashboard — updated ${data.updated || 'never'}`;
}

async function loadCurrentFocus() {
  const [tasks, milestones] = await Promise.all([
    fetch(`${STATE}/tasks.json`).then(r => r.json()),
    fetch(`${STATE}/milestones.json`).then(r => r.json()),
  ]);
  const active = milestones.milestones.find(m => m.status === 'active');
  const ul = document.getElementById('current-focus');
  if (!active) { ul.innerHTML = '<li class="todo">No active milestone</li>'; return; }
  ul.innerHTML = tasks.tasks
    .filter(t => t.milestone === active.id && t.status !== 'done')
    .map(t => `<li class="${t.status === 'active' ? 'active' : t.status === 'blocked' ? 'blocked' : 'todo'}">${t.title}</li>`)
    .join('');
}

async function loadDecisions() {
  const { decisions } = await fetch(`${STATE}/decisions.json`).then(r => r.json());
  const ul = document.getElementById('decisions');
  ul.innerHTML = decisions.map(d => `
    <li><span class="status ${d.status}">${d.status}</span> ${d.topic}${d.chosen ? ` — ${d.chosen}` : ''}</li>
  `).join('');
}

async function loadGraphHealth() {
  try {
    const s = await fetch(`${STATE}/.crg-status.json`).then(r => r.json());
    document.getElementById('graph-health').innerHTML = `
      Last update: ${s.lastUpdate}<br>
      Nodes: ${s.nodes} · Edges: ${s.edges}<br>
      Status: ${s.fresh ? '<span style="color:var(--done)">fresh</span>' : '<span style="color:var(--blocked)">stale</span>'}
    `;
  } catch { document.getElementById('graph-health').textContent = '(graph not built yet)'; }
}

async function loadActiveSessions() {
  // Not enumerable via fetch from a directory; rely on a generated index.
  try {
    const idx = await fetch(`${STATE}/sessions/index.json`).then(r => r.json());
    const ul = document.getElementById('active-sessions');
    ul.innerHTML = idx.recent.map(s => `<li class="active">${s.name} — ${s.modified}</li>`).join('') || '<li class="todo">(none)</li>';
  } catch { document.getElementById('active-sessions').innerHTML = '<li class="todo">(no session index)</li>'; }
}

async function loadRecentBlockers() {
  try {
    const text = await fetch(`${STATE}/blockers.md`).then(r => r.text());
    const entries = text.split('---').map(s => s.trim()).filter(Boolean).slice(-5);
    document.getElementById('recent-blockers').innerHTML = entries.map(e => {
      const head = (e.match(/^## (.+)$/m) || [])[1] || '(unparsed)';
      return `<li class="blocked">${head}</li>`;
    }).join('') || '<li class="todo">(none)</li>';
  } catch { document.getElementById('recent-blockers').innerHTML = '<li class="todo">(no blocker log)</li>'; }
}

async function refresh() {
  await Promise.all([loadMilestones(), loadCurrentFocus(), loadDecisions(), loadGraphHealth(), loadActiveSessions(), loadRecentBlockers()]);
}

window.addEventListener('error', e => {
  if (e.message.includes('fetch')) {
    const banner = document.createElement('div');
    banner.style.cssText = 'background:#3a1a1a;color:#e05c5c;padding:.75rem;margin-bottom:1rem;border-radius:6px';
    banner.textContent = 'Fetch blocked — run `python3 -m http.server 8000` from repo root and reload via http://localhost:8000/dashboard/';
    document.body.prepend(banner);
  }
});

refresh();
setInterval(refresh, 30000);
</script>
```

- [ ] **Step 3: Create `agent/state/sessions/index.json` generator hook**

Add `agent/scripts/lib/build-session-index.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"
SESS_DIR="$ROOT/agent/state/sessions"
RECENT="$(find "$SESS_DIR" -maxdepth 1 -name "*.md" -mtime -1 -printf '%f\t%TY-%Tm-%Td %TH:%TM\n' 2>/dev/null \
  | jq -R 'split("\t") | { name: .[0], modified: .[1] }' \
  | jq -s '{ recent: . }')"
echo "${RECENT:-{\"recent\":[]}}" > "$SESS_DIR/index.json"
```

Modify `dashboard-refresh.sh` to call this helper at the end:
```bash
bash "$(repo_root)/agent/scripts/lib/build-session-index.sh" || true
```

- [ ] **Step 4: Smoke-test in a browser**

```bash
python3 -m http.server 8000 &
sleep 1
curl -s http://localhost:8000/dashboard/ | grep -q "Anno Planner"
kill %1
```

- [ ] **Step 5: Commit**

```bash
git add dashboard/index.html agent/scripts/lib/build-session-index.sh agent/scripts/dashboard-refresh.sh
git commit -m "feat(dashboard): live-wire to agent/state JSON via fetch (no framework added)"
```

---

## Phase 14 — Integration Test (Tier 2)

### Task 14.1: End-to-end workflow integration test

**Files:**
- Create: `agent/scripts/tests/integration/e2e.bats`

- [ ] **Step 1: Write the test**

```bash
#!/usr/bin/env bats
load ../helpers

@test "e2e: bootstrap → task-add → agent-start → commit → task-complete → pr-prep" {
  REPO="$(make_temp_repo)"
  cd "$REPO"
  use_mocks
  # Copy all scripts.
  cp -r "$REPO_ROOT_FROM_HELPERS/agent/scripts/" agent/scripts/
  find agent/scripts -name "*.sh" -exec chmod +x {} \;
  find agent/scripts/hooks -type f -exec chmod +x {} \;
  git commit -q --allow-empty -m init
  git branch kaleb
  git config user.name kaleb

  agent/scripts/bootstrap.sh
  agent/scripts/task-add.sh --milestone M0 --title "smoke test task" --owner kaleb
  local id="$(jq -r '.tasks[-1].id' agent/state/tasks.json)"
  agent/scripts/agent-start.sh "$id" --no-worktree
  echo content > smoke.txt
  git add smoke.txt
  git commit -q -m "feat: smoke"
  agent/scripts/task-complete.sh "$id" --actual-hours 0.1
  assert_json_field agent/state/tasks.json ".tasks[] | select(.id==\"$id\") | .status" "done"
  run agent/scripts/pr-prep.sh --target kaleb
  assert_exit_code 0
  echo "$output" | grep -q "## Impact"

  rm -rf "$REPO"
}
```

- [ ] **Step 2: Run the integration test**

```bash
agent/scripts/test.sh --integration --filter e2e
```
Expected: 1/1 pass.

- [ ] **Step 3: Commit**

```bash
git add agent/scripts/tests/integration/e2e.bats
git commit -m "test(agent): end-to-end integration test for full workflow"
```

---

## Phase 15 — Cross-Reference and CLAUDE.md Update

### Task 15.1: Update `CLAUDE.md` and `CONTRIBUTING.md` cross-refs

**Files:**
- Modify: `CLAUDE.md`
- Modify: `CONTRIBUTING.md`

- [ ] **Step 1: Add `## Agent Infrastructure` section near top of `CLAUDE.md`**

```markdown
## Agent Infrastructure

Live state, scripts, and protocols live under `agent/`:

- `agent/state/` — JSON + markdown source of truth (read by `dashboard/index.html`)
- `agent/scripts/` — bash helpers, all with bats tests
- `agent/skills/` — protocol docs; read the relevant skill before any matching action

**Common entry points:**
- New task session: `agent/scripts/agent-start.sh T-NNNN`
- Finish a task:   `agent/scripts/task-complete.sh T-NNNN --actual-hours 2`
- Open a PR:       `agent/scripts/pr-prep.sh --target kaleb | gh pr create --body-file -`
- Get blocked:     `agent/scripts/blocker.sh T-NNNN --what … --tried … --need …`
- Status snapshot: `agent/scripts/agent-status.sh`

Read `agent/skills/README.md` before working.

Design spec: `docs/superpowers/specs/2026-05-15-agent-protocols-and-scripts-design.md`
```

- [ ] **Step 2: Add brief pointer in `CONTRIBUTING.md` under existing Agent Roles**

After the "Agent guardrails" list, append:

```markdown
### Agent infrastructure (scripts + protocols)

All agent flow operations are wrapped in scripts under `agent/scripts/`. Read `agent/skills/README.md` for protocol docs. Skip scripts at your peril — they enforce `quality-check`, dashboard refresh, blocker notifications, and PR body templates consistently.
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md CONTRIBUTING.md
git commit -m "docs: point CLAUDE.md and CONTRIBUTING.md at agent/ infrastructure"
```

---

## Final Verification

- [ ] **Run the full suite:**

```bash
agent/scripts/test.sh
```
Expected: all `*.bats` files pass.

- [ ] **Run the integration tier:**

```bash
agent/scripts/test.sh --integration
```
Expected: e2e passes.

- [ ] **Confirm acceptance criteria from spec §16:**

```bash
# Every script in agent/scripts/ exists and is executable.
find agent/scripts -maxdepth 1 -name "*.sh" -executable | wc -l   # should be ≥ 26

# Every script has a corresponding bats file.
for s in $(find agent/scripts -maxdepth 1 -name "*.sh" -printf '%f\n'); do
  name="${s%.sh}"
  ls agent/scripts/tests/${name//-/_}*.bats agent/scripts/tests/${name}.bats 2>/dev/null \
    || echo "MISSING TESTS: $s"
done

# Dashboard renders from JSON.
grep -q "fetch.*agent/state" dashboard/index.html

# roadmap-sync no drift.
agent/scripts/roadmap-sync.sh --check
```

- [ ] **Open dashboard in a browser:**

```bash
python3 -m http.server 8000 &
xdg-open http://localhost:8000/dashboard/ || open http://localhost:8000/dashboard/
```

Confirm all cards populate from JSON.

- [ ] **Final commit (if anything pending):**

```bash
git status
# resolve as needed
```

---

## Self-Review (post-write)

**Spec coverage:** Each spec section maps to one or more tasks above.

| Spec §  | Subject                          | Covered by |
|---------|----------------------------------|------------|
| §4      | Directory layout                 | Task 0.1, 0.2, 0.3, 1.2 |
| §5.1-.6 | State schemas                    | Task 1.1, 1.2 |
| §6.2    | Script catalog (all 26+)         | Tasks 2.1 – 9.2, 11.1 |
| §6.3    | Bats testing                     | Tasks 0.2, 0.4, 0.5; every script task adds tests |
| §6.4    | `lib/common.sh`                  | Task 0.3 |
| §7      | Skill docs                       | Task 12.1 |
| §8      | Dashboard integration            | Task 13.1 |
| §9      | Git hooks                        | Task 10.1 |
| §10     | Bootstrap                        | Task 11.1 |
| §11     | End-to-end workflow              | Task 14.1 |
| §12     | Dependencies                     | Task 0.2 (bats), 11.1 (verify) |
| §13     | Risks/mitigations                | All hooks + tests cover risk controls |
| §16     | Acceptance criteria              | Final Verification block |

**Placeholder scan:** All steps include concrete code. Two known intentional notes:
- Task 5.2 carries a fallback note for the awk-heavy `roadmap-sync.sh --write` path: if awk proves fragile during implementation, swap in a small Python helper. Test contract unchanged. This is a documented contingency, not an undefined behavior.
- Task 4.1 contains a first-pass `jq` ID-counter expression that proved overcomplicated; the actual implementation uses a simpler `COUNT+1` approach in the same step.

**Type consistency:** Script names, state file paths, and CLI flags are stable across tasks. Cross-checked: `state_file`, `iso_now`, `jq_edit`, `require_dep`, `koad_present`, `current_session` are defined in Task 0.3 and consumed thereafter with consistent signatures.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-15-agent-protocols-and-scripts.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — fresh subagent per task with review checkpoints between tasks. Fast iteration, isolated context per task.

**2. Inline Execution** — execute tasks in this session via `superpowers:executing-plans`, batched with review checkpoints.

**Which approach?**
