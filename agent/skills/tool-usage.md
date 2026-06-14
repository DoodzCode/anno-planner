# Project Tool Usage

Agents working on this project have access to the following tools beyond the standard Claude Code toolkit. Each section states what the tool is, when to use it, and what to do with the output.

---

## code-review-graph (CRG)

**What it is:** A knowledge graph and static-analysis tool that builds a dependency graph of the codebase. It identifies which files call which, surfaces high-impact files, and can run as an MCP server for graph queries mid-session.

**When to use:**

| Situation | Action |
|---|---|
| Before editing a file that other files import | Run `graph-impact.sh` to see what breaks |
| After adding a new export | Run `graph-update.sh` so the graph stays current |
| Suspecting a file is unused | Query CRG before deleting |
| Writing a plan for a >2-file change | Include CRG impact analysis in the plan |
| PR prep | Run `graph-status.sh` and include findings in PR body |

**Commands (from repo root):**

```bash
# Check if CRG is bootstrapped
bash agent/scripts/graph-status.sh

# Bootstrap (first time or after major refactor)
bash agent/scripts/graph-bootstrap.sh

# Update graph after commits
bash agent/scripts/graph-update.sh

# Show impact of touching a file
bash agent/scripts/graph-impact.sh src/data/catalog.ts

# Find files similar to a given file (reuse check)
bash agent/scripts/find-similar.sh src/stores/blueprintStore.ts
```

**What to do with output:**
- If impact shows >3 dependents, note them in your plan and test each after your change.
- If `find-similar.sh` returns a close match, prefer extending that file over creating a new one.
- Include the CRG summary in PR body under "Impact analysis".

---

## code-review (Superpowers skill)

**What it is:** A diff-level code review skill that runs at configurable depth.

**When to use:**
- Before opening any PR: run `/code-review medium` on your diff.
- After a large refactor: run `/code-review high`.
- For a quick sanity check mid-session: run `/code-review low`.

**Usage:**
```
/code-review low     # fast, high-confidence findings only
/code-review medium  # balanced (recommended for PRs)
/code-review high    # broad coverage, may include uncertain findings
```

Fix all `critical` and `error` severity findings before opening the PR. `warning` findings require judgment.

---

## agent/scripts/ — project bash scripts

All agent-owned repeatable actions have a corresponding script. Prefer running these over ad-hoc bash.

| Script | Purpose |
|---|---|
| `agent-start.sh` | Start a session: claim milestone, open session journal |
| `agent-status.sh` | Print current task state from `agent/state/tasks.json` |
| `task-claim.sh <id>` | Mark a task in-progress in `tasks.json` |
| `task-complete.sh <id>` | Mark a task done + log commit hash |
| `task-add.sh` | Add a new task to `tasks.json` |
| `blocker.sh` | Log a blocker to `agent/state/blockers.md` + notify |
| `quality-check.sh` | Run tests + lint; required to pass before PR |
| `pr-prep.sh` | Generate PR body from session journal + task state |
| `dashboard-refresh.sh` | Regenerate `dashboard/index.html` from state JSON |
| `roadmap-sync.sh` | Sync ROADMAP.md changes to ROADMAP.html |
| `graph-update.sh` | Rebuild CRG graph after commits |
| `graph-impact.sh <file>` | Show dependents of a file |

Run `bash agent/scripts/<name>.sh --help` for full flags.

---

## Koad / Citadel (optional)

If `koad` is available in the environment (`command -v koad`), agents may use:

```bash
koad signal send <owner>   # escalate a blocker to a human
koad intel store            # persist a decision to CASS memory
```

These are optional. The workflow functions correctly without Citadel.

---

## Rules for all tools

1. **Always run `quality-check.sh` before opening a PR.** If it fails, fix the issue — do not bypass with `--no-verify`.
2. **Always run `graph-update.sh` after any commit that adds, removes, or renames an export.**
3. **Always update the HTML tracker** (per `html-tracking.md`) when claiming or completing tasks — tool runs alone are not sufficient.
