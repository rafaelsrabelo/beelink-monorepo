# harness-monorepo — AI Rules

> **Single source of truth for every AI tool** (Claude Code, Cursor, Codex, Copilot…).
> Read this file before writing any code. `CLAUDE.md` only imports it.

## How this harness is organized

> **The rule:** applies to more than one workspace → it lives in `docs/`.
> Belongs to one workspace → it lives inside that workspace, next to its code.

| Tier | Where | The question that decides it |
|---|---|---|
| **Product** | [docs/product/](docs/product/README.md) | *If we rewrote every app from scratch, would this still be true?* |
| **Repo** | [docs/repo/](docs/repo/harness.md) | *If the company pivoted to another business, would this still be true?* |
| **Rules** | [docs/ai-rules/](docs/ai-rules/code-quality.md) | *Is this an instruction about how to write code, in two or more workspaces?* |
| **Plans** | [docs/plans/](docs/plans/README.md) | *Was this true at one moment, for one ticket?* — stale by design, append-only |
| **Workspace** | `apps/<app>/AGENTS.md` + its `docs/` | *Does this die the day this workspace is deleted?* |

Index of every doc: [docs/README.md](docs/README.md). How the harness itself works and how it is gated: [docs/repo/harness.md](docs/repo/harness.md).

**Precedence.** This file plus the **nearest workspace `AGENTS.md`** are the contract. `docs/ai-rules/` overrides default judgment on its topic. `CLAUDE.local.md` (untracked, per developer) carries **no authority** — if it disagrees with this file, this file wins.

## Rules by topic (read on demand)

| Topic | File | When it applies |
|---|---|---|
| Code quality | [code-quality.md](docs/ai-rules/code-quality.md) | Every line of code |
| State & data | [state-and-data.md](docs/ai-rules/state-and-data.md) | Any state, any API call |
| Styling | [styling.md](docs/ai-rules/styling.md) | Any Tailwind, token or UI component work |

## Workspaces — read the nearest `AGENTS.md` first

| Workspace | What | Contract |
|---|---|---|
| `apps/web` | Next.js 16 · shadcn/ui · Zustand · TanStack Query | [AGENTS.md](apps/web/AGENTS.md) |
| `apps/api` | NestJS 12 on Fastify · Prisma · pino · Swagger | [AGENTS.md](apps/api/AGENTS.md) |
| `apps/mobile` | Expo SDK 57 · EAS Build · EAS Update (OTA) | [AGENTS.md](apps/mobile/AGENTS.md) |
| `packages/contracts` | Wire types shared by the three apps — types only | [AGENTS.md](packages/contracts/AGENTS.md) |

## Non-Negotiables

1. **The wire is typed once.** A shape that crosses the network lives in `packages/contracts`. The API implements it, the apps import it — nobody redeclares it.
2. **Server state is TanStack Query; client state is Zustand.** Never `fetch` in a component, never `useState` for data that came from an API.
3. **Loading is a skeleton.** Never a spinner, never "Loading…" text.
4. **No hardcoded colors.** Tokens only — CSS variables on web, the theme object on mobile.
5. **Typed everything.** No `any`; prefer `satisfies`.
6. **One component per file, under 250 lines.** Split before it grows.
7. **English identifiers and comments.** UI copy follows the product's locale.
8. **Comments state constraints, not narration.** A comment says what the code cannot show — never what the next line does.
9. **Working inside a workspace? Read its `AGENTS.md` first.** It records what is true there and not here.
10. **`pnpm ci-check` is green before you say "done".**

## Stack

- **pnpm 10 workspaces + Turborepo 2** — one lockfile, one task graph
- **TypeScript 6.0** in every workspace — see trap 2
- **Web:** Next.js 16 (App Router) · React 19.2 · Tailwind 4 · shadcn/ui · Zustand 5 · TanStack Query 5
- **API:** NestJS 12 on Fastify · Prisma 7 · Postgres · zod-validated env · pino · Swagger · Vitest
- **Mobile:** Expo SDK 57 · React Native 0.86 · EAS Build · EAS Update

## Architecture

```
harness-monorepo/
├── apps/
│   ├── web/          # Next.js — the browser surface
│   ├── api/          # NestJS — the backend
│   └── mobile/       # Expo — iOS + Android, updated over the air
├── packages/
│   └── contracts/    # wire types, types only — the one place a shape is defined
├── docs/             # product · repo · ai-rules · plans
├── scripts/          # gates + the local CI mirror — plain shell, any tool can run them
├── .claude/skills/   # the workflows an agent runs: implement, deliver, learn
├── .github/          # CI + PR template
└── .husky/           # the gates, run before you commit and before you push
```

## Commands

```bash
pnpm dev            # every app in parallel
pnpm dev:web        # web → http://localhost:3000
pnpm dev:api        # api → http://localhost:3001/api  (Swagger at /api/docs)
pnpm dev:mobile     # Expo dev server
pnpm db:up          # Postgres for the API (Docker)
pnpm ci-check       # the local mirror of CI — run before "done"
pnpm arch-gates     # structural rules a type-checker cannot express
pnpm docs-gate      # the documentation harness's own gates
```

## Monorepo traps — read before touching config

Each is a rule because it breaks something **without an error message** pointing at the cause.

1. **The linker is hoisted** (`.npmrc`). Expo's Metro and native autolinking expect a flat `node_modules`; pnpm's default isolated layout hides transitive packages, and the app fails on device, not at install.
2. **TypeScript is 6.0, not the npm `latest` 7.0.** 7 is the native rewrite; the Nest CLI 12 bundles `~6.0.2` and the Expo 57 template pins `~6.0.3`. Upgrade every workspace together, on purpose.
3. **One React for web and mobile: 19.2.3.** Expo SDK 57 pins it and Next accepts any `^19`. Two physical copies of React is an "Invalid hook call" at runtime, with nothing in the diff to explain it.
4. **Prisma is pinned to a stable release.** Its npm `latest` tag points at a release candidate, so a bare `pnpm add prisma` installs an RC.

## CI / verification

- **Hooks:** `pre-commit` runs the fast gates (`arch-gates` + `docs-gate`, seconds); `pre-push` runs `pnpm ci-check`.
- **CI** is [.github/workflows/ci.yml](.github/workflows/ci.yml): jobs are filtered per workspace **inside** the workflow, never through `on.paths` — [ci.md](docs/repo/ci.md) explains why that matters to a required check.
- **PRs** use [.github/pull_request_template.md](.github/pull_request_template.md): fill the prose, **leave every checkbox unchecked** — a tick is a person's attestation.

## Lessons from review

There is no misc section here, by design. A lesson learned in review is routed to exactly one tier by the [delivery-check-learnings](.claude/skills/delivery-check-learnings/SKILL.md) skill. If a lesson fits no tier, it is not a rule yet.

## Git

- Branches: `feat/<TICKET>-<slug>`, `fix/<slug>`, `chore/<slug>`. PRs target `main`.
- Conventional Commits, in English.
- Never commit `.env` — every new variable goes in that workspace's `.env.example`.
