# docs — index

Every document under `docs/` is linked from this page; `docs-gate` fails the build otherwise. How the tiers work, and how they are gated: [repo/harness.md](repo/harness.md).

| Tier | Folder | The question that decides it |
|---|---|---|
| Product | `product/` | If we rewrote every app from scratch, would this still be true? |
| Repo | `repo/` | If the company pivoted to another business, would this still be true? |
| Rules | `ai-rules/` | Is this an instruction about how to write code, in two or more workspaces? |
| Plans | `plans/` | Was this true at one moment, for one ticket? |

## Product

- [product/README.md](product/README.md) — what bee-link is, independent of any app

## Repo

- [repo/harness.md](repo/harness.md) — how this documentation works, how it is gated, and how to tell if it helps
- [repo/ci.md](repo/ci.md) — the hooks, the local mirror, the CI jobs, and why they are shaped that way
- [repo/mcp-dev-tools.md](repo/mcp-dev-tools.md) — the browser tools an agent uses to see runtime state

## Rules

- [ai-rules/code-quality.md](ai-rules/code-quality.md) — responsibilities per folder, component shape, errors
- [ai-rules/state-and-data.md](ai-rules/state-and-data.md) — where every kind of state lives
- [ai-rules/styling.md](ai-rules/styling.md) — tokens, Tailwind, and owning your shadcn components

## Plans

- [plans/README.md](plans/README.md) — naming, and why a plan is never rewritten

The plan files themselves are **not** listed here, and their absence is deliberate: `docs-gate` excludes `plans/` from every gate, because a snapshot is allowed to go stale and an index of snapshots would claim they had not. Read the folder.

## Workspace map

Every workspace, and nothing else. `docs-gate` fails when a workspace is added without a row here, or a row outlives its workspace.

| Workspace | Contract |
|---|---|
| `apps/web` | [apps/web/AGENTS.md](../apps/web/AGENTS.md) |
| `apps/api` | [apps/api/AGENTS.md](../apps/api/AGENTS.md) |
| `packages/contracts` | [packages/contracts/AGENTS.md](../packages/contracts/AGENTS.md) |
| `packages/ui` | [packages/ui/AGENTS.md](../packages/ui/AGENTS.md) |

`apps/web` is the bee-link web app. The workspace keeps the template's name on purpose — [the root contract](../AGENTS.md) says why.
