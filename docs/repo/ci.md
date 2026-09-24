# CI and verification

> **Tier:** repo. The hooks, the local mirror, the CI jobs — and the reasoning behind their shape.

## Three layers, one set of checks

| Layer | When | Runs | Budget |
|---|---|---|---|
| `pre-commit` | every commit | `arch-gates` + `docs-gate` | seconds |
| `pre-push` | every push | `pnpm ci-check --no-doctor` | a minute or two |
| CI | every PR, every push to `main` | everything, per workspace touched | minutes |

**Why `pre-commit` stays tiny.** A hook that takes a minute trains people to type `--no-verify`, and then the hook no longer exists. Anything that needs a build or a running server is CI's job.

## `pnpm ci-check` — [scripts/ci-check.sh](../../scripts/ci-check.sh)

The local mirror of CI. It runs **every** step even after one fails, then summarises — one run tells you everything that is red, instead of one failure per push.

- `run_step` — blocking.
- `run_warn_step` — **report-only**: for a check that has a known backlog. It runs and reports, but does not fail, until the backlog is zero and it is promoted to `run_step`. Nothing in this template starts report-only; the helper is there for the day a new lint rule lands on existing code.
- `--no-doctor` skips `expo-doctor`, the one step that needs the network.
- `--e2e` adds the suites that need Postgres and Mailpit — `pnpm stack:up` first, since they build both apps and drive a browser. `pre-push` leaves them out on purpose: a hook that takes minutes is a hook people bypass.

## The CI jobs — [.github/workflows/ci.yml](../../.github/workflows/ci.yml)

| Job | Runs when | What |
|---|---|---|
| `changes` | always | decides which workspaces the change touches |
| `gates` | always | `arch-gates` + `docs-gate` — seconds, and they cover every workspace |
| `web` | web or packages changed | type-check · lint · build |
| `api` | api or packages changed | Prisma generate · type-check · lint · test · build |
| `mobile` | mobile or packages changed | type-check · lint · `expo-doctor` |
| `e2e` | api or web changed | API e2e against a real Postgres and Mailpit, then Playwright through a real browser |
| `changeset` | mobile changed | a PR touching the app must add a changeset — the app's version is its OTA runtime |

### Why `e2e` calls pnpm directly instead of turbo

Turborepo's strict env mode passes a task only the variables a `turbo.json` task declares, and a job's `env:` block is not one of them. `pnpm --filter api test:e2e` keeps the job's `DATABASE_URL`, `SMTP_URL` and the rest, without teaching `turbo.json` about CI's secrets. Service containers also start before the checkout, so the test database is created by the image's `POSTGRES_DB` rather than by the init script that local compose uses.

### Why `type-check`, `lint` and `test` depend on `transit`

A turbo task's cache key holds its own package's files and the tasks it `dependsOn`, and nothing else. With `"type-check": {}`, a change to `packages/contracts` left the web's key unchanged, so `pnpm ci-check` replayed yesterday's green for a web that no longer compiled. It was measured on BEELINK-52: a field added to `PublicComponent` broke four web files, and `turbo type-check` answered from cache.

`transit` is turbo's documented transit node. It does no work, and `"dependsOn": ["^transit"]` chains it through every internal dependency, so a task that depends on it is re-run when any package it imports changes. `build` needs no transit because `^build` already is one.

### Why jobs are filtered inside the workflow, not with `on.paths`

A workflow filtered out at the trigger reports **no status at all**. If that workflow backs a required check, the check stays *pending* forever and the PR cannot merge. A job skipped by `if:` reports **skipped**, which branch protection accepts as satisfied. So the `changes` job computes what was touched, and every other job reads its output.

## Ratchets

A new gate on code that already violates it has two bad options: fix everything first (the gate never lands) or exclude the violations (the gate never bites). The third option is a ratchet — `baseline_for` in `scripts/arch-gates.sh` freezes today's count:

- a count **at or below** the baseline passes, and prints who owns the cleanup;
- a count **above** it fails — nobody adds a new violation;
- the owner burns it to zero and deletes the entry, making the gate absolute.

**Never raise a baseline to make a gate pass.** That turns the ratchet into a permission slip.
