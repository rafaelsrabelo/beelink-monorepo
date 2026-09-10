---
name: delivery-check
description: Pre-PR checklist for harness-monorepo — reads the diff and checks it against AGENTS.md, the nearest workspace contract and the gates. Reports only; never edits. Trigger on /delivery-check, "check delivery", "pre-PR check".
---

# delivery-check

Runs before a PR is opened. It reads the diff, checks it against the contract, and reports. **It never changes a file.**

## How to run

```bash
git diff main...HEAD --name-only
git diff main...HEAD
pnpm ci-check
```

## Checks

Each check names its scope; apply it only when the diff touches that scope.

| # | Scope | Check | Source |
|---|---|---|---|
| 1 | all | No wire shape declared outside `packages/contracts` | root `AGENTS.md`, non-negotiable 1 |
| 2 | apps/web | No `fetch` in a component; no `useState` holding API data | `docs/ai-rules/state-and-data.md` |
| 3 | apps/web | A shadcn component is edited in place under `src/components/ui`, not wrapped | `docs/ai-rules/styling.md` |
| 4 | all | No hardcoded colour, no `any`, no component over 250 lines | root `AGENTS.md`, 4–6 |
| 5 | apps/api | A new module has module · controller · service · `dto/`; contracts imported as `type` | `apps/api/AGENTS.md` |
| 6 | apps/api | A schema change ships its Prisma migration in the same PR | `apps/api/AGENTS.md` |
| 7 | apps/mobile | A native change bumps the version through a changeset; the `ota:check` verdict is in the PR | `apps/mobile/AGENTS.md` |
| 8 | all | Comments state constraints, not narration; identifiers in English | root `AGENTS.md`, 7–8 |
| 9 | docs | A new doc is linked from `docs/README.md`; a new workspace is in the map | `docs-gate` |
| 10 | all | The PR body follows the template, every checkbox left unchecked | root `AGENTS.md` → Git |

## Report

```
delivery-check — <branch>

BLOCKER  #<n> <file:line> — <what>  (<source>)
WARNING  #<n> <file:line> — <what>
OK       <checks that passed>

ci-check: green | red (<steps>)
```

A blocker is anything that fails a gate or breaks a non-negotiable. Everything else is a warning.

## When a check keeps catching the same thing

That is a lesson, not a check. Run `delivery-check-learnings` — it decides whether it becomes a gate.
