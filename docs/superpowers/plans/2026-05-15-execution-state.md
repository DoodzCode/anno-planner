# Execution State — Agent Protocols Implementation

> Companion to `2026-05-15-agent-protocols-and-scripts.md`. Tracks subagent-driven execution progress so a future session can resume.

**Branch:** `dev` (do NOT switch).
**Working dir:** `/home/ideans/data/projects/anno-planner`.
**Skill in use:** `superpowers:subagent-driven-development`.
**Spec:** `docs/superpowers/specs/2026-05-15-agent-protocols-and-scripts-design.md`.
**Plan:** `docs/superpowers/plans/2026-05-15-agent-protocols-and-scripts.md`.

---

## Completed

| Plan task | Subject | Commit(s) | Status |
|---|---|---|---|
| P0.1 | Scaffold `agent/` directory tree | `9d8df1b` | ✅ DONE — spec + code review approved |
| P0.2 | Vendor bats-core submodule | `b1d52de` | ✅ DONE — spec + code review approved (bats v1.13.0 pinned at `d9faff0`) |
| P0.3 | `lib/common.sh` + `helpers.bash` + `lib_common.bats` | `4b15cd8` | ✅ DONE — TDD red→green, 8/8 pass, spec + code review approved |
| P0.4 | `test.sh` bats runner | `d9a9ad4`, fix `55ceae3` | ✅ DONE — initial review flagged I1 (`--filter` arg safety), fix applied + re-reviewed |

**Resume head SHA:** `55ceae3` on `dev`.

---

## Remaining tasks (in order)

Each task follows the same loop:
1. Dispatch implementer subagent with the FULL task text + context (do NOT have them read the plan).
2. On DONE: dispatch spec-compliance reviewer subagent.
3. On ✅ spec: dispatch code-quality reviewer subagent.
4. On ✅ quality (or after fix loop): mark complete, advance.

Prompt templates: `/home/ideans/.claude/plugins/cache/claude-plugins-official/superpowers/5.1.0/skills/subagent-driven-development/{implementer,spec-reviewer,code-quality-reviewer}-prompt.md`.

| Plan task | Subject | Tracking ID |
|---|---|---|
| P0.5 | Write mocks (`notify-send`, `koad`, `code-review-graph`) | task #11 |
| P1.1 | Seed `tasks.json`, `decisions.json`, `milestones.json` from `ROADMAP.md` + brainstorm §8 | task #12 |
| P1.2 | Copy seeded state to `agent/scripts/tests/fixtures/` | task #13 |
| P2.1 | `dashboard-refresh.sh` + bats (TDD) | task #14 |
| P2.2 | `spec-check.sh` + bats (TDD) | task #15 |
| P3.1 | `session-log.sh` + bats (TDD) | task #16 |
| P3.2 | `session-end.sh` + extend `session.bats` | task #17 |
| P3.3 | `blocker.sh` + `blockers.bats` (TDD) | task #18 |
| P4.1 | `task-add.sh` + bats (TDD) | task #19 |
| P4.2 | `task-claim.sh` + bats (TDD) | task #20 |
| P4.3 | `task-complete.sh` + stub `quality-check.sh` / `graph-update.sh` + bats (TDD) | task #21 |
| P4.4 | `decision-resolve.sh` + bats (TDD) | task #22 |
| P5.1 | Replace `quality-check.sh` stub with full implementation + bats | task #23 |
| P5.2 | `roadmap-sync.sh` + bats (`--check` / `--write`) | task #24 |
| P6.1 | `worktree-new.sh` + `worktree-clean.sh` + bats | task #25 |
| P6.2 | `agent-start.sh` + extend `session.bats` | task #26 |
| P6.3 | `agent-status.sh` + bats | task #27 |
| P7.1 | `graph-status.sh` + replace `graph-update.sh` stub + `crg.bats` | task #28 |
| P7.2 | `graph-bootstrap.sh` + `graph-watch.sh` + `graph-impact.sh` + `find-similar.sh` + extend `crg.bats` | task #29 |
| P8.1 | `pr-prep.sh` + bats | task #30 |
| P9.1 | Domain stubs: `building-add.sh`, `wiki-fetch.sh`, `wiki-cache-warm.sh` + `stubs.bats` | task #31 |
| P9.2 | `coverage-report.sh`, `bundle-budget.sh`, `cleanup.sh` + `health.bats` | task #32 |
| P10.1 | Git hooks: `post-commit`, `pre-push`, `post-merge` + `hooks.bats` | task #33 |
| P11.1 | `bootstrap.sh` (idempotent) + `bootstrap.bats` | task #34 |
| P12.1 | Skill docs: `README.md` + 8 protocol files (`task-assessment`, `coding-standards`, `code-structure`, `valid-sources`, `escalation`, `session-protocol`, `pr-protocol`, `code-graph`) | task #35 |
| P13.1 | Live-wire `dashboard/index.html` to `agent/state/*.json` + `lib/build-session-index.sh` | task #36 |
| P14.1 | E2E integration test `tests/integration/e2e.bats` | task #37 |
| P15.1 | Update `CLAUDE.md` + `CONTRIBUTING.md` cross-refs | task #38 |

---

## Notes carried forward from review cycles

- **Exit-code policy** (established by `common.sh`): `0` ok, `1` user error, `2` state error, `3` missing dep. Every script must respect this.
- **TDD discipline holds** — every script task should follow red → green → commit. Reviewers verified this on P0.3.
- **`--filter` arg-safety pattern** introduced in `test.sh` fix (`55ceae3`). Apply the same guard pattern to other scripts with required-value flags as they're built (don't retrofit existing — only enforce going forward).
- **Plan adherence** so far has been byte-equivalent. Continue that discipline; deviations require explicit reasoning.
- **`make_temp_repo` helper brittleness** (noted as a Minor in P0.3 review): if any of `tasks.json`/`milestones.json`/`decisions.json`/`blockers.md` is renamed in a future task, the brace-expansion `cp` will fail. Watch for this when P1.1 lands.
- **Two reviewer-flagged minors deferred**:
  - `state_file` accepts empty arg silently (`common.sh:11`). Consider `${1:?…}` guard if a caller bug surfaces.
  - `test.sh` does not resolve symlinks (`BASH_SOURCE[0]`). Plan-consistent with peer scripts; revisit only if symlinked invocation becomes a use case.

---

## How to resume

1. Read this file + the plan + the spec.
2. Verify head matches `55ceae3` on `dev`. If not, reconcile before proceeding.
3. Run `agent/scripts/test.sh` — must show 8/8 pass on `lib_common.bats`. If not, stop and diagnose.
4. Confirm submodule fresh: `git submodule status` shows `agent/scripts/tests/bats` at `d9faff0…`.
5. Read prompt templates listed above so subagent dispatch matches established patterns.
6. Resume with **P0.5** (task #11): write the three test mocks.
7. Follow the same dispatch loop (implementer → spec reviewer → code-quality reviewer → fix loop if needed → next).

---

## Quick reference — invariants used by every later task

- `repo_root` returns `$(git rev-parse --show-toplevel)`.
- `state_file <name>` resolves to `<repo>/agent/state/<name>`.
- `jq_edit <file> <jq-expr>` is the only sanctioned mutator for JSON state files (atomic via `mktemp` + `mv`).
- All state-mutating scripts must support `--dry-run` and `--help`.
- Bats helpers: `make_temp_repo`, `use_mocks`, `assert_exit_code`, `assert_json_field`, `assert_file_contains`, `assert_notify_sent`.
- Mocks (to be created in P0.5) live at `agent/scripts/tests/mocks/{notify-send,koad,code-review-graph}` and are activated by prepending the mocks dir to `$PATH` via `use_mocks`.
