# Contributing to Anno Planner

## Branch Strategy

```
origin/main   ← production; only receives merges from dev via PR
origin/dev    ← integration branch; all feature work merges here first
origin/kaleb  ← Kaleb's personal branch, cut from dev
origin/ian    ← Ian's personal branch, cut from dev
```

- **Humans** cut their personal branch from `dev` and merge back to `dev` via PR.
- **Agents** operate in git worktrees on the human's personal branch — never directly on `dev` or `main`.
- `dev → main` merges happen only after a human review pass.

### Starting work

```bash
# human cutting a fresh branch
git checkout dev && git pull origin dev
git checkout -b kaleb   # or ian

# agent worktree from within the human's branch
git worktree add ../anno-planner-agent-wt kaleb
```

---

## Human Roles

| Developer | Domain | Responsibilities |
|---|---|---|
| **Kaleb** | Canvas / UX | Pan/zoom feel, snap behavior, rotate UX, sprite review, visual polish |
| **Ian** | Data / Math | Production math correctness, building stat accuracy, influence radius values |

Both humans review all agent-generated PRs before merge. One human sign-off required per PR.

### Human review priorities

- **Canvas feel** — pan/zoom responsiveness, snap accuracy, rotate behavior
- **Production math** — ratio correctness against known Anno 1800 values
- **Influence radius accuracy** — cross-reference wiki tile values
- **Building stat accuracy** — flag any agent-ingested data that diverges from the wiki

---

## Agent Roles

| Domain | Agent-owned |
|---|---|
| Stack scaffolding, Vite/build config | Yes |
| Boilerplate stores, hotkey wiring | Yes |
| Unit + Playwright test generation | Yes |
| JSON catalog ingestion + icon wiring | Yes |
| Export pipelines (PNG, URL, JSON serialize) | Yes |
| Service worker / PWA config | Yes |
| Onboarding tutorial scaffolding | Yes |
| Canvas interaction model, UX feel | **Human** |
| Production math correctness | **Human** |
| Visual polish, sprite/icon review | **Human** |

### Agent guardrails (strictly enforced)

1. **Branch scope** — Agents work only inside the worktree on the human's personal branch. Never push directly to `dev` or `main`.
2. **Scope guard** — Optimizer, multiplayer (WebRTC/Yjs), mod support, and island templates are Phase 2. Do not implement stretch features during M0–M5 without explicit human approval.
3. **Stack lock** — No framework or major library changes after M0 spike without a human decision recorded in `docs/`.
4. **No silent decisions** — Any design decision spanning >2 files must be proposed in a plan before implementation.
5. **Math correctness deferred to humans** — Agents scaffold the production math engine structure; humans verify ratio values against the Anno 1800 wiki before merge.
6. **PR hygiene** — Agent PRs must include: what changed, why, and what a human reviewer should check.

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

---

### Tool Usage Protocol

13. **code-review-graph** — Run `graph-impact.sh` before editing any file with >2 importers. Run `graph-update.sh` after every commit. Include CRG impact summary in PR body.
14. **code-review skill** — Run `/code-review medium` before opening any PR. Fix all `critical`/`error` findings. Document `warning` findings in PR if not fixed.
15. **quality-check.sh** — Must pass before any `git push`. Never bypass.

Full tool documentation: `agent/skills/tool-usage.md`.

---

## Pull Request Workflow

1. Agent finishes work on a worktree branch → opens a PR targeting the human's personal branch.
2. Human reviews (canvas feel, math, stats) → merges to personal branch.
3. Human opens a PR from their personal branch → `dev`.
4. Second human reviews → merges to `dev`.
5. Periodic `dev → main` promotions after a human integration test.

### PR template

```
## What changed
< one-paragraph summary >

## Why
< motivation or ticket reference >

## Human reviewer checklist
- [ ] Canvas feel / UX (Kaleb)
- [ ] Math correctness (Ian)
- [ ] Stat accuracy vs wiki
- [ ] No stretch features introduced
```

---

## Decisions log

Stable decisions live in `docs/`. Brainstorming and open questions live in `docs/Anno_1800_Offline_Blueprint_Builder.md`. When a section stabilizes, promote it to a dedicated subpage.
