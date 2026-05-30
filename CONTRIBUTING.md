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
