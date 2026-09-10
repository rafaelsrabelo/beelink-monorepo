---
name: implement-task
description: Run a task end to end — ticket to Definition of Done, a plan in the right tier, a branch, progressive commits, a coverage check, ci-check, delivery-check and a draft PR. Trigger on /implement-task, "implement the task", "do <TICKET> end to end".
---

# implement-task

Takes one ticket from description to a draft PR. Stops and asks when the ticket is ambiguous in a way that changes the work — it never guesses a contract.

## Steps

1. **Read the ticket** and write its **Definition of Done**: one numbered line per acceptance criterion, each one checkable.
2. **Write the plan before the code**, as `YYYY-MM-DD--<TICKET>--<slug>.md` — in `apps/<app>/docs/plans/` when one workspace changes, in `docs/plans/` when several do. It names the decisions and what is out of scope. It is never rewritten afterwards; changes are appended.
3. **Branch** from `main`: `feat/<TICKET>-<slug>`.
4. **Read the contracts that apply** — root `AGENTS.md`, then the nearest workspace `AGENTS.md`, then the `docs/ai-rules/` topics the change touches.
5. **Implement in small conventional commits**, each leaving the tree green. A wire shape goes to `packages/contracts` first, then the API, then the apps.
6. **Check coverage** against the Definition of Done. Every line gets evidence — a file and line, a test, a command's output. A line with no evidence is not done.
7. **Run `pnpm ci-check`** and fix what is red. Never report done with a red step.
8. **Run `delivery-check`** and resolve every blocker.
9. **Open a draft PR** with `create-pr`.

## Never

- Invent an API shape. Ask for it, or read it from `packages/contracts`.
- Skip the plan because the task "looks small" — the plan is where scope creep becomes visible.
- Tick a checkbox in the PR template.
