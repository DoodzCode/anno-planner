# Agent Tracker Protocols Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bake HTML tracker creation/update protocol and tool-usage guidance into every agent's working knowledge by shipping two skill files and updating the project's agent guardrails.

**Architecture:** Two new markdown skills in `agent/skills/` define the protocol; `CONTRIBUTING.md` makes tracker updates a hard guardrail (not a suggestion); project `CLAUDE.md` points agents to those skills at session start. No new HTML scaffolding tool — agents write HTML by hand following the design-system reference in the skill.

**Tech Stack:** Markdown (skill files), HTML/CSS (design system reference), Bash (no new scripts needed).

---

## Context for the implementing agent

This project tracks all development progress in hand-authored HTML artifacts. There are three existing artifacts to study before implementing:

- `docs/ROADMAP.html` — top-level milestone tracker; one milestone per `<section>`, cards grid + detail blocks
- `docs/M4B-PROGRESS.html` — quest-level tracker; phases as detail blocks + stat cards at top
- `dashboard/index.html` — dev dashboard overview

**Established design system** (CSS vars used across all three):

```css
--bg:       #0c0c14;
--surface:  #13131f;
--surface2: #1a1a2e;
--border:   #252538;
--border2:  #303050;
--accent:   #c8a96e;   /* gold — titles, active state */
--blue:     #5b8dd9;
--text:     #d8d8e8;
--muted:    #6a6a90;
--done:     #4caf7d;
--done-bg:  #0d2a1a;
--prog:     #c8a96e;
--prog-bg:  #2a2010;
--todo-bg:  #1a1a2e;
--block:    #e05c5c;
```

**Status class convention:**
- `.done` — completed (green)
- `.active` — in progress (gold/accent)
- `.todo` — not started (muted)
- `.block` — blocked (red)

Task list icons: `✓` (done), `▶` (in progress), `` empty (todo), `✕` (blocked).

---

## File Structure Map

| Path | Role |
|---|---|
| `agent/skills/html-tracking.md` | Design system reference + creation rules + update protocol |
| `agent/skills/tool-usage.md` | code-review-graph and other project-wide tool instructions |
| `CONTRIBUTING.md` | Add Tracker Protocol + Tool Usage sections to agent guardrails |
| `CLAUDE.md` (project root) | Reference new skills from Agent Collaboration section |

---

## Task 1: Create `agent/skills/html-tracking.md`

**Files:**
- Create: `agent/skills/html-tracking.md`

- [ ] **Step 1: Write the skill file**

Create `agent/skills/html-tracking.md` with the following exact content:

````markdown
# HTML Tracker Protocol

All development progress, tasks, and phases in this project are tracked via HTML artifacts — **not** in chat, not in plain markdown. Agents must read and update these files as they work.

---

## 1. When to create vs. update

| Scope | Action |
|---|---|
| Single small task (≤1 day, ≤3 files) | Add a task row to the nearest existing tracker section |
| Quest / sub-milestone (multi-phase, named work unit) | Create `docs/<QUEST-ID>-PROGRESS.html` |
| New top-level milestone | Add a card + detail block to `docs/ROADMAP.html` |
| Cross-milestone summary | Update `dashboard/index.html` |

**Quest ID convention:** uppercase, hyphenated (e.g. `M4-B`, `AGENT-DOCS`, `PROD-MATH`).

---

## 2. Design system

Every tracker uses the same CSS variable set. Copy this `<style>` block verbatim into new files — do not invent new colors or fonts.

```html
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:       #0c0c14;
    --surface:  #13131f;
    --surface2: #1a1a2e;
    --border:   #252538;
    --border2:  #303050;
    --accent:   #c8a96e;
    --blue:     #5b8dd9;
    --text:     #d8d8e8;
    --muted:    #6a6a90;
    --done:     #4caf7d;
    --done-bg:  #0d2a1a;
    --prog:     #c8a96e;
    --prog-bg:  #2a2010;
    --todo-bg:  #1a1a2e;
    --block:    #e05c5c;
  }

  html { scroll-behavior: smooth; }
  body {
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.6;
    padding-bottom: 4rem;
  }

  /* ── Top bar ── */
  .topbar {
    position: sticky; top: 0; z-index: 100;
    background: #0c0c14ee; backdrop-filter: blur(8px);
    border-bottom: 1px solid var(--border);
    padding: .75rem 2rem;
    display: flex; align-items: center; gap: 1.5rem;
  }
  .topbar h1 { font-size: 1.1rem; color: var(--accent); letter-spacing: .04em; white-space: nowrap; }
  .topbar .date { font-size: .78rem; color: var(--muted); white-space: nowrap; }
  .topbar nav { margin-left: auto; display: flex; gap: 1.25rem; }
  .topbar nav a { font-size: .78rem; color: var(--muted); text-decoration: none; transition: color .15s; }
  .topbar nav a:hover { color: var(--text); }

  /* ── Layout ── */
  .page { max-width: 900px; margin: 0 auto; padding: 2rem; }
  section { margin-bottom: 3rem; }
  section > h2 {
    font-size: .7rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: .14em;
    color: var(--muted); margin-bottom: 1rem;
    padding-bottom: .4rem; border-bottom: 1px solid var(--border);
  }

  /* ── Stat cards (summary strip) ── */
  .summary-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: .75rem; margin-bottom: 2rem; }
  @media (max-width: 640px) { .summary-strip { grid-template-columns: 1fr 1fr; } }
  .stat-card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: .85rem 1rem; }
  .stat-card .stat-val { font-size: 1.5rem; font-weight: 700; color: var(--accent); line-height: 1.1; }
  .stat-card .stat-label { font-size: .72rem; color: var(--muted); margin-top: .2rem; }

  /* ── Overview cards ── */
  .overview { display: grid; grid-template-columns: repeat(3, 1fr); gap: .75rem; }
  @media (max-width: 640px) { .overview { grid-template-columns: 1fr 1fr; } }
  .m-card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 1rem; }
  .m-card.done   { border-color: #1e4030; }
  .m-card.active { border-color: var(--prog); }
  .m-card .m-id { font-size: .7rem; font-weight: 700; text-transform: uppercase; letter-spacing: .1em; color: var(--muted); margin-bottom: .25rem; }
  .m-card .m-name { font-size: .9rem; font-weight: 600; color: var(--text); margin-bottom: .1rem; }
  .m-card .m-est { font-size: .72rem; color: var(--muted); margin-bottom: .65rem; }

  /* ── Progress bar ── */
  .pbar-track { height: 5px; border-radius: 3px; background: var(--border2); overflow: hidden; margin-bottom: .35rem; }
  .pbar-fill  { height: 100%; border-radius: 3px; background: var(--prog); transition: width .4s ease; }
  .pbar-fill.full { background: var(--done); }
  .pbar-label { font-size: .68rem; color: var(--muted); display: flex; justify-content: space-between; align-items: center; }

  /* ── Badges ── */
  .badge {
    display: inline-block; padding: .15rem .5rem; border-radius: 3px;
    font-size: .65rem; font-weight: 700; text-transform: uppercase; letter-spacing: .06em;
  }
  .badge.done    { background: var(--done-bg); color: var(--done); }
  .badge.active  { background: var(--prog-bg); color: var(--prog); }
  .badge.pending { background: var(--todo-bg); color: var(--muted); }

  /* ── Phase / milestone detail blocks ── */
  .phase-block { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; margin-bottom: 1.25rem; }
  .phase-block.done   { border-color: #1e4030; }
  .phase-block.active { border-color: var(--prog); }
  .phase-block.todo   { border-color: var(--border); opacity: .85; }
  .phase-header {
    padding: 1rem 1.25rem .75rem;
    display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem;
    border-bottom: 1px solid var(--border);
  }
  .phase-header h3 { font-size: 1rem; font-weight: 700; color: var(--accent); }
  .phase-header .est { font-size: .75rem; color: var(--muted); margin-top: .1rem; }
  .phase-header .goal { font-size: .82rem; color: var(--muted); margin-top: .3rem; }
  .phase-body { padding: 1rem 1.25rem; }

  /* ── Sub-labels ── */
  .sub-label {
    font-size: .65rem; font-weight: 700; text-transform: uppercase; letter-spacing: .1em;
    color: var(--muted); margin-bottom: .5rem; margin-top: .9rem;
  }
  .sub-label:first-child { margin-top: 0; }

  /* ── Task lists ── */
  .tasks { list-style: none; display: flex; flex-direction: column; gap: .3rem; }
  .tasks li { display: flex; align-items: flex-start; gap: .6rem; font-size: .84rem; }
  .tasks li .icon {
    margin-top: .18em; flex-shrink: 0;
    width: 14px; height: 14px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: .6rem; font-weight: 900;
  }
  .tasks li.done  .icon { background: var(--done);  color: #0d2a1a; }
  .tasks li.prog  .icon { background: var(--prog);  color: #2a2010; }
  .tasks li.todo  .icon { background: transparent;  border: 1.5px solid var(--border2); }
  .tasks li.block .icon { background: var(--block); color: #fff; }
  .tasks li.done  > span { color: var(--muted); text-decoration: line-through; text-decoration-color: #3a4030; }
  .tasks li.prog  > span { color: var(--text); }
  .tasks li.todo  > span { color: var(--muted); }
  .tasks li.block > span { color: var(--block); }

  /* ── Commit chips ── */
  .commit-row { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: .75rem; }
  .commit-chip {
    display: inline-flex; align-items: center; gap: .4rem;
    background: var(--surface2); border: 1px solid var(--border2);
    border-radius: 4px; padding: .2rem .6rem;
    font-size: .72rem; font-family: 'Cascadia Code', 'Fira Code', monospace;
    color: var(--blue);
  }
  .commit-chip .msg { color: var(--muted); font-family: inherit; }

  /* ── Callouts ── */
  .callout {
    margin-top: .75rem; padding: .6rem .85rem;
    background: var(--surface2);
    border-left: 2px solid var(--border2);
    border-radius: 0 4px 4px 0;
    font-size: .78rem; color: var(--muted);
  }
  .callout strong { color: var(--text); }
  .callout.warn { border-left-color: var(--prog); }
  .callout.info { border-left-color: var(--blue); }

  /* ── Data pills ── */
  .data-stats { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: .75rem; }
  .data-pill {
    background: var(--surface2); border: 1px solid var(--border2);
    border-radius: 4px; padding: .2rem .65rem;
    font-size: .74rem; color: var(--muted);
  }
  .data-pill strong { color: var(--accent); }

  /* ── Legend ── */
  .legend { display: flex; gap: 1.5rem; flex-wrap: wrap; }
  .legend-item { display: flex; align-items: center; gap: .45rem; font-size: .8rem; color: var(--muted); }
  .legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }

  footer {
    margin-top: 3rem; padding-top: 1rem;
    border-top: 1px solid var(--border);
    text-align: center; font-size: .75rem; color: var(--muted);
  }
</style>
```

---

## 3. Task item HTML patterns

Always use these exact class/icon combinations. Do not use emoji or other icon systems.

```html
<!-- Not started -->
<li class="todo"><span class="icon"></span><span>Task description</span></li>

<!-- In progress -->
<li class="prog"><span class="icon">▶</span><span>Task description</span></li>

<!-- Done -->
<li class="done"><span class="icon">✓</span><span>Task description — brief outcome note</span></li>

<!-- Blocked -->
<li class="block"><span class="icon">✕</span><span>Task description — blocker reason</span></li>
```

---

## 4. Phase block pattern

```html
<!-- todo state -->
<div class="phase-block todo" id="p3">
  <div class="phase-header">
    <div>
      <h3>Phase 3 — Component Integration</h3>
      <div class="est">Branch: feat/my-branch · Agent: Clyde</div>
      <div class="goal">One sentence describing what this phase ships.</div>
    </div>
    <span class="badge pending">Pending</span>
  </div>
  <div class="phase-body">
    <div class="sub-label">Tasks</div>
    <ul class="tasks">
      <li class="todo"><span class="icon"></span><span>Task one</span></li>
    </ul>
  </div>
</div>

<!-- active state — change class and badge -->
<div class="phase-block active" id="p3">
  ...
  <span class="badge active">In Progress</span>
  ...
</div>

<!-- done state — add commit chips and outcome notes -->
<div class="phase-block done" id="p3">
  ...
  <span class="badge done">Done</span>
  ...
  <div class="commit-row">
    <span class="commit-chip">abc1234 <span class="msg">feat: short commit message</span></span>
  </div>
</div>
```

---

## 5. Creating a new quest tracker

1. Decide quest ID (e.g. `AGENT-DOCS`).
2. Create `docs/<QUEST-ID>-PROGRESS.html`.
3. Copy the `<style>` block from §2 verbatim.
4. Topbar: `<h1>Anno Planner — <QUEST-ID></h1>` + date span + nav links to each phase anchor.
5. Add legend section (copy from M4B-PROGRESS.html §Legend).
6. Add optional stat cards section for key numbers.
7. Add an overview grid (`.overview`) with one `.m-card` per phase — all start as `pending`.
8. Add phase detail blocks — all start as `todo`.
9. Add a link to the new tracker from `docs/ROADMAP.html` in the relevant milestone section and from `dashboard/index.html`.
10. Commit: `docs: create <QUEST-ID>-PROGRESS.html tracker`.

---

## 6. Updating a tracker as work progresses

**Run these updates at every meaningful checkpoint — not just at phase end.**

### When a task starts
- Change `<li class="todo">` → `<li class="prog">`
- Change icon from empty to `▶`
- Change phase block class from `todo` → `active` (if not already)
- Change phase badge from `pending` → `active` / `In Progress`
- Update `.m-card` for this phase: progress bar width estimate, badge to `active`
- Update topbar `.date` to today

### When a task completes
- Change `<li class="prog">` (or `todo`) → `<li class="done">`
- Change icon to `✓`
- Append a brief outcome note to the task text if non-obvious
- Update the phase overview card: increment completed count (e.g. `2 / 5 tasks`), widen progress bar
- If all tasks in phase are done: mark phase block `.done`, badge to `Done`, add commit chip(s)
- Update topbar `.date`

### When a phase completes
- Phase block: class → `done`, badge → `Done`
- Overview card: `pbar-fill` width → `100%`, add `.full` class, badge → `Done`
- Add `.commit-row` with all commits from the phase
- Add `.callout.info` for any important design decisions or caveats discovered
- Update parent ROADMAP.html: update the milestone's overview card progress bar and task count
- Commit: `docs: update <QUEST-ID>-PROGRESS.html — Phase N complete`

### When blocked
- Change task to `<li class="block">`, icon `✕`, describe the blocker
- Add a `.callout.warn` below the task list: `<strong>Blocked:</strong> description + who can unblock`
- File a blocker entry in `agent/state/blockers.md`

---

## 7. Callout patterns

```html
<!-- Design decision (blue) -->
<div class="callout info">
  <strong>Design decision:</strong> Why you made the call you made.
</div>

<!-- Warning / human gate / back-compat note (gold) -->
<div class="callout warn">
  <strong>Human gate:</strong> What the human reviewer must verify before merge.
</div>

<!-- Blocked (gold) -->
<div class="callout warn">
  <strong>Blocked:</strong> What's blocking + who can unblock.
</div>
```

---

## 8. Commit chip pattern

```html
<div class="commit-row">
  <span class="commit-chip">abc1234 <span class="msg">feat: short message from git log</span></span>
  <span class="commit-chip">def5678 <span class="msg">fix: follow-up</span></span>
</div>
```

Commit hash: first 7 chars of `git log --oneline`. Message: verbatim from git log, truncated to ~60 chars.

---

## 9. Stat card pattern (quest summary strip)

```html
<div class="summary-strip">
  <div class="stat-card">
    <div class="stat-val">47</div>
    <div class="stat-label">Tests passing</div>
  </div>
  <div class="stat-card">
    <div class="stat-val">133</div>
    <div class="stat-label">Building families</div>
  </div>
</div>
```

Use stat cards for numerical milestones that tell the story of the quest at a glance (test count, record count, coverage %, etc.).

---

## 10. Checklist before committing tracker updates

- [ ] Topbar date updated to today (`YYYY-MM-DD`)
- [ ] All completed tasks are class `done` with `✓` icon
- [ ] Active tasks are class `prog` with `▶` icon
- [ ] Phase blocks have correct class (`todo`/`active`/`done`)
- [ ] Overview card progress bar width matches actual ratio (e.g. `width:40%` for 2/5 phases)
- [ ] ROADMAP.html milestone card updated if a phase completed
- [ ] Commit chips added for any new commits in completed phases
- [ ] No placeholder text ("TBD", "TODO") left in tracker HTML
````

- [ ] **Step 2: Verify file was written**

```bash
wc -l agent/skills/html-tracking.md
head -5 agent/skills/html-tracking.md
```

Expected: file exists, first line is `# HTML Tracker Protocol`.

- [ ] **Step 3: Commit**

```bash
git add agent/skills/html-tracking.md
git commit -m "docs(agent): add html-tracking skill — design system + tracker protocol"
```

---

## Task 2: Create `agent/skills/tool-usage.md`

**Files:**
- Create: `agent/skills/tool-usage.md`

- [ ] **Step 1: Write the skill file**

Create `agent/skills/tool-usage.md` with the following exact content:

````markdown
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
````

- [ ] **Step 2: Verify file was written**

```bash
wc -l agent/skills/tool-usage.md
head -5 agent/skills/tool-usage.md
```

Expected: file exists, first line is `# Project Tool Usage`.

- [ ] **Step 3: Commit**

```bash
git add agent/skills/tool-usage.md
git commit -m "docs(agent): add tool-usage skill — CRG, code-review, scripts reference"
```

---

## Task 3: Update `CONTRIBUTING.md`

**Files:**
- Modify: `CONTRIBUTING.md`

- [ ] **Step 1: Add Tracker Protocol section after Agent guardrails**

Open `CONTRIBUTING.md`. After the closing `---` of the "Agent guardrails" section (after guardrail #6, before the "Pull Request Workflow" heading), insert this block:

```markdown
### Agent skills

Agents **must** read the relevant skill file before acting:

| When | Read |
|---|---|
| Starting any task | `agent/skills/html-tracking.md` |
| Before editing a shared file or opening a PR | `agent/skills/tool-usage.md` |
| Before starting a new quest / sub-milestone | Both of the above |

Skill files are the source of truth for protocols. This file describes *what* is expected; the skill files describe *how*.

---

### Tracker Protocol (strictly enforced)

Every task, phase, and milestone has a corresponding HTML tracker entry. **Tracker updates are not optional.** An agent that completes a task without updating the tracker has not finished the task.

**Rules:**

7. **Tracker at task start** — When claiming a task, update its HTML tracker entry from `todo` → `prog` (or create the entry if it doesn't exist). Update the topbar date.
8. **Tracker at task end** — When completing a task, update its entry from `prog` → `done` with `✓` icon and a brief outcome note. If it's the last task in a phase, mark the phase done, add commit chips, and update the ROADMAP.html overview card.
9. **Scope → tracker type** — Small task: update nearest existing tracker section. Quest (multi-phase named work): create `docs/<QUEST-ID>-PROGRESS.html`. New top-level milestone: add to `docs/ROADMAP.html`.
10. **Design system** — All HTML trackers use the design system defined in `agent/skills/html-tracking.md`. No new color palettes, no markdown-converted HTML.
11. **Blocker** — If blocked, update the task to `block` class in the tracker, add a `.callout.warn`, and file a blocker entry in `agent/state/blockers.md`.
12. **Commit trackers separately** — Tracker HTML changes commit separately from code changes: `docs: update <TRACKER>-PROGRESS.html — <what changed>`.

```

- [ ] **Step 2: Add Tool Usage section after the new Tracker Protocol section**

Append this block after the Tracker Protocol (still before the "Pull Request Workflow" heading):

```markdown
### Tool Usage Protocol

13. **code-review-graph** — Run `graph-impact.sh` before editing any file with >2 importers. Run `graph-update.sh` after every commit. Include CRG impact summary in PR body.
14. **code-review skill** — Run `/code-review medium` before opening any PR. Fix all `critical`/`error` findings. Document `warning` findings in PR if not fixed.
15. **quality-check.sh** — Must pass before any `git push`. Never bypass.

Full tool documentation: `agent/skills/tool-usage.md`.

```

- [ ] **Step 3: Verify the edit looks correct**

```bash
grep -n "Tracker Protocol\|Tool Usage Protocol\|agent/skills" CONTRIBUTING.md
```

Expected: lines present for "Tracker Protocol", "Tool Usage Protocol", and both skill file references.

- [ ] **Step 4: Commit**

```bash
git add CONTRIBUTING.md
git commit -m "docs: add Tracker Protocol + Tool Usage Protocol to CONTRIBUTING.md agent guardrails"
```

---

## Task 4: Update project `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add skill references to the Agent Collaboration section**

Open `CLAUDE.md`. Find the `### Spawning agents` subsection. After the last bullet (`- Verify before claiming done: \`superpowers:verification-before-completion\`.`), add:

```markdown
- Before any task or phase, read: `agent/skills/html-tracking.md` and `agent/skills/tool-usage.md`.
- Update the HTML tracker at task start (→ in progress) and task end (→ done). See `agent/skills/html-tracking.md §6`.
```

- [ ] **Step 2: Verify edit**

```bash
grep -n "html-tracking\|tool-usage" CLAUDE.md
```

Expected: two lines found.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: reference html-tracking and tool-usage skills from CLAUDE.md"
```

---

## Self-Review

**Spec coverage:**
- ✅ HTML design system documented (§2 of html-tracking.md — full CSS block)
- ✅ When to create vs update (§1 scope table)
- ✅ Task-level update protocol (§6 — start, complete, block)
- ✅ Phase-level update protocol (§6 — phase complete)
- ✅ Quest tracker creation walkthrough (§5)
- ✅ code-review-graph integration (tool-usage.md)
- ✅ code-review skill usage (tool-usage.md)
- ✅ Baked into CONTRIBUTING.md as enforced guardrails (guardrails 7–15)
- ✅ Baked into CLAUDE.md agent collaboration section
- ✅ Commit message convention for tracker updates defined

**Placeholder scan:** None. All sections contain actual content, exact HTML, exact commands.

**Type consistency:** HTML class names match across §2 CSS, §3 task patterns, §4 phase pattern, §6 update protocol, §7 callout patterns, §8 commit chips, §9 stat cards. No mismatches.
