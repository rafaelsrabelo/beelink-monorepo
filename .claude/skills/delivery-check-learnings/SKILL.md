---
name: delivery-check-learnings
description: Turn the lessons from a code review into rules — routes each lesson to exactly one tier of the harness, and proposes a gate when a grep can catch it. Reads the review; writes only after confirmation; never commits. Trigger on /delivery-check-learnings, "record the review lesson", "so we don't repeat this".
---

# delivery-check-learnings

A review comment is a lesson. Written in the wrong place it becomes noise; written nowhere it becomes the same comment next month. This skill decides **where**.

## Step 1 — Collect

List each distinct lesson from the review, one line each: *"never / always …, because …"*. A lesson without a *because* is a preference, not a rule — ask for the reason, or drop it.

## Step 2 — Check it is new

Search the harness for it. If it already exists, the problem is not a missing rule: it is a rule nobody reads, or one no gate enforces. Say which.

## Step 3 — Route by scope

Taxonomy: [docs/repo/harness.md](../../../docs/repo/harness.md). Answer in order. **The first yes wins, and there is exactly one destination.**

| # | Question | Destination |
|---|---|---|
| 1 | Would it still be true if every app were rewritten? | `docs/product/` |
| 2 | Is it a **fact or inventory** about exactly one workspace? | that workspace's `docs/README.md` |
| 3 | Is it a **rule or prohibition** for exactly one workspace? | that workspace's `AGENTS.md` |
| 4 | Is it about repo wiring — CI, hooks, gates, scripts? | `docs/repo/` |
| 5 | Is it a decision made at one moment, with alternatives weighed? | a dated file in `docs/repo/decisions/` |
| 6 | Is it a coding convention holding in **two or more** workspaces? | `docs/ai-rules/<topic>.md` |
| 7 | Is it a repo-wide non-negotiable that must be read every session? | root `AGENTS.md` — **into an existing section only** |
| — | Nothing matched | **Stop.** Report it as `unrouted` and write nothing. |

## Step 4 — Mechanize

Independent of step 3: it fires **in addition** to the route.

| # | Question | Action |
|---|---|---|
| 8 | Can a grep catch it on a diff? | add a numbered check to `delivery-check`, tagged with its scope |
| 9 | Is it an absolute structural rule over a directory? | **propose** a gate for `scripts/arch-gates.sh` or `scripts/docs-gate.sh` — a gate beats a doc. Propose only; a person lands it. |

## Hard rules

- **Root `AGENTS.md` is never a fallback.** It is reachable only through question 7, and only into a section that already exists. There is no misc section, by design.
- **A rule true in two or more workspaces is written once** — at the root or in `docs/ai-rules/`. `docs-gate`'s `no-duplicate-contract` fails a root rule restated in a workspace.
- **One destination per lesson.** If it fits two, it is two lessons — split them and route each.
- **Echo the routing** for every lesson, as `lesson → question N → path`, so the person corrects the *routing* and not only the wording.

## Step 5 — Apply

Only what was confirmed. Show the diff of the rule files, run `pnpm docs-gate`, and **never commit** — the person reviews and commits rule changes themselves.
