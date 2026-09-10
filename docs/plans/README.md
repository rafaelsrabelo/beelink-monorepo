# Plans

> **Tier:** plans — true at one moment, for one ticket. Stale by design.

- **Name:** `YYYY-MM-DD--<TICKET>--<slug>.md`.
- **Where:** a plan for one workspace lives in that workspace (`apps/<app>/docs/plans/`); a plan that spans workspaces lives here.
- **Append-only.** A plan is never rewritten to match what happened later. Scope changed? Append a dated section. The plan was wrong? Append the correction. Why: [../repo/harness.md](../repo/harness.md#plans-are-append-only).
- **Not gated.** Plans are excluded from `docs-gate` — they are snapshots, and a snapshot is allowed to be out of date.
