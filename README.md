# harness-monorepo

A full-stack monorepo template — **Next.js**, **NestJS** and **Expo** — wired with an **AI harness**: a written contract every coding agent reads, documentation organised so an agent finds what it needs, and gates that turn the rules into build failures instead of review comments.

Start a project from it with **Use this template**, or clone it.

## What is in it

| Workspace | Stack |
|---|---|
| `apps/web` | Next.js 16 · Tailwind 4 · shadcn/ui · Zustand · TanStack Query |
| `apps/api` | NestJS 12 on Fastify · Prisma 7 · Postgres · pino · Swagger |
| `apps/mobile` | Expo SDK 57 · EAS Build · EAS Update (over the air) |
| `packages/contracts` | the wire types all three share |

## Quick start

Needs Node 22+, pnpm 10 and Docker.

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm db:up                                   # Postgres on :5432
pnpm --filter api exec prisma migrate dev    # create the schema
pnpm dev                                     # web :3000 · api :3001
```

Mobile: `pnpm dev:mobile`, then open it in Expo Go. Over-the-air updates need a one-time `eas init` — see [apps/mobile/docs/release-ota.md](apps/mobile/docs/release-ota.md).

## The harness in one minute

1. **One contract.** [AGENTS.md](AGENTS.md) is read by Claude Code, Cursor, Codex and Copilot alike; `CLAUDE.md` only imports it. Each workspace adds a short delta of what is true *there*.
2. **A place for every fact.** Docs live in four tiers — product, repo, rules, plans — each decided by one question. A fact that belongs to one app lives inside that app, and dies with it.
3. **Rules become gates.** [scripts/arch-gates.sh](scripts/arch-gates.sh) greps for what a type-checker cannot express; [scripts/docs-gate.sh](scripts/docs-gate.sh) keeps the docs themselves honest. Both run on every commit.
4. **Skills are the workflows.** [.claude/skills/](.claude/skills/implement-task/SKILL.md) holds how a task is implemented and delivered — and, most important, how a review lesson is **routed** to the one tier where it belongs, so the contract never grows into an encyclopedia.

The full design, and how to tell whether it is working: [docs/repo/harness.md](docs/repo/harness.md).

## Verification

```bash
pnpm ci-check   # type-check · lint · test · expo-doctor · arch-gates · docs-gate
```

CI runs the same checks, and `pre-push` runs them for you.
