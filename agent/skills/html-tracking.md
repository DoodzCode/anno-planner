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
