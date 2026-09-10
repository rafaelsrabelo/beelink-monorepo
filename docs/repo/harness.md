# The AI harness — how this documentation works

> **Tier:** repo. How the docs are organised, gated, and judged. The index lives in [docs/README.md](../README.md).

Every AI tool that works in this repository — Claude Code, Cursor, Codex, Copilot — reads the same contract. This document explains the shape of that contract, so that it stays a contract instead of decaying into an encyclopedia.

## The rule

> **Applies to more than one workspace → `docs/`. Belongs to one workspace → inside that workspace.**

That is the whole taxonomy, and it applies identically to rules, plans and surface maps — so there is never a judgement call about *which kind* of doc follows *which* rule.

Two consequences:

- **Co-location is a lifecycle feature.** When a workspace is deleted, its docs die in the same commit. A central `docs/apps/old-app.md` would survive it as a confident lie.
- **A doc that fits two tiers is two docs.** Split it. If it truly cannot be split, the higher tier wins (product > repo > workspace) and the lower keeps a one-line pointer, never a copy.

## Precedence

1. `/AGENTS.md` plus the **nearest** workspace `AGENTS.md` are the contract.
2. `docs/ai-rules/` overrides default judgment on its topic.
3. `CLAUDE.local.md` (untracked, per developer) carries **no authority**.

Point 3 exists because a private, untracked file loads with equal weight in every session and is invisible to code review — the one place a stale instruction could outrank the repository forever.

## Why a product tier exists

Product facts — what a task is, which transitions are legal — outlive every app. Stored inside one app's folder, they become unreachable the moment that app is frozen or rewritten, and an agent obeying the rules can no longer find them. The test: if the knowledge outlives every app, it belongs in `docs/product/`.

## The gates

Gates prove consistency, not usefulness — but consistency is what decays first, silently, one merge at a time.

### `pnpm docs-gate` — [scripts/docs-gate.sh](../../scripts/docs-gate.sh)

Budget under a second. Runs in `pre-commit` and in CI. A gate whose target does not exist yet passes trivially.

| Gate | Asserts | Catches |
|---|---|---|
| `docs-links` | every relative markdown link resolves; no `[[wikilinks]]` | the first failure of any docs refactor |
| `docs-indexed` | every doc under `docs/` is linked from `docs/README.md` | a doc nobody can discover |
| `docs-tier` | no loose `.md` at the `docs/` root; no folder outside the four tiers | a junk drawer forming |
| `workspace-contract` | every workspace ships `AGENTS.md` **and** `CLAUDE.md`; delta header present; ≤ 120 lines | half-wired workspaces, and contracts growing into encyclopedias |
| `no-duplicate-contract` | no root non-negotiable restated in a workspace `AGENTS.md` | two copies of a rule, silently diverging |
| `workspace-map` | every workspace is in the `docs/README.md` map, and vice versa | "we added an app and forgot the docs" — found at build time, not six weeks later |

`plans/` are excluded from every gate: they are snapshots, and go stale by design.

### `pnpm arch-gates` — [scripts/arch-gates.sh](../../scripts/arch-gates.sh)

Structural rules a type-checker cannot express, as greps over a directory. Each gate names the doc it enforces, so a failure reads as an explanation rather than an accusation.

A gate added to code that already breaks it starts with a **ratchet**: today's violation count is frozen as a baseline, so only a *new* violation fails. Every baseline must name who burns it to zero — a baseline with no owner is a permanently tolerated violation. See [ci.md](ci.md#ratchets).

## Plans are append-only

> **A plan that has been created is never rewritten.** New ticket → new plan file.

A plan records what was decided for one ticket at one moment. Editing it to match what happened later destroys the only record of the reasoning that produced the code — and a plan that silently tracks the present is indistinguishable from one that was right all along.

- A different ticket gets its own file, `YYYY-MM-DD--<TICKET>--<slug>.md`.
- Scope changed mid-ticket? **Append** a dated section saying what changed and why.
- The plan was wrong? **Append** the correction. A plan that records a wrong call and what was learned is worth more than one edited into being right.
- Typos, dead links and headings are fine to fix. The rule is about rewriting decisions.

This is not gated — no script can tell a legitimate append from a rewrite. It holds because the diff shows it: a plan file with deletions in a PR is the signal to look.

## Why the routing table matters more than the tree

`delivery-check-learnings` records lessons from review. If its routing had a catch-all — "anything else goes in `AGENTS.md`" — every lesson about one app, one package or one product fact would land in the repo-wide contract read by every agent on every task, and the contract would reach 400 lines within a quarter.

**Reorganising the tree without fixing that pump re-flattens it.** So the table routes by scope: `AGENTS.md` is reachable only for genuine repo-wide non-negotiables and only into an existing section, and a lesson with no tier is **reported, not written** — a lesson that fits nowhere is not a rule yet.

## Does it actually help?

Run these in a **fresh session with no prior context** and record three numbers each: correct y/n · files opened before answering · did it open a file it did not need.

1. "The API returns a task and the web renders it — where is the type?" → `packages/contracts`, imported as `type` by the API.
2. "Two web components share a filter — `useState`, TanStack Query or Zustand?" → a Zustand store → `docs/ai-rules/state-and-data.md`.
3. "Can this change ship to the app over the air?" → `pnpm --filter mobile ota:check` → `apps/mobile/docs/release-ota.md`.
4. "Where does a rule about NestJS DTOs go?" → `apps/api/AGENTS.md` — one workspace, so not `docs/ai-rules/`.
5. "Mobile says 'Invalid hook call' after a web dependency bump — why?" → two copies of React → root `AGENTS.md`, trap 3.
6. "Review found a service reading `process.env` — where is that rule, and what enforces it?" → `apps/api/AGENTS.md` + the `api/env-through-schema` gate. *(Probes the routing, not the content.)*

**Target:** ≥ 5/6 correct · median ≤ 3 files opened.

**A metric that needs no ceremony:** the share of `delivery-check-learnings` lessons landing somewhere other than `AGENTS.md`. Target ≥ 70%.
