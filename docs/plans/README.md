# Plans

> **Tier:** plans — true at one moment, for one ticket. Stale by design.

- **Name:** `YYYY-MM-DD--<TICKET>--<slug>.md`.
- **Where:** a plan for one workspace lives in that workspace (`apps/<app>/docs/plans/`); a plan that spans workspaces lives here.
- **Append-only.** A plan is never rewritten to match what happened later. Scope changed? Append a dated section. The plan was wrong? Append the correction. Why: [../repo/harness.md](../repo/harness.md#plans-are-append-only).
- **Not gated.** Plans are excluded from `docs-gate` — they are snapshots, and a snapshot is allowed to be out of date. They are not listed in [the docs index](../README.md) for the same reason: an index would imply they are kept current.
- **Language follows the room.** A plan records a decision as it was taken, and BEE-1 was taken in Portuguese. The rest of the documentation is in English, and so are identifiers and comments everywhere.

## What is here

| Plan | What it decided | Why it is still here |
|---|---|---|
| `2026-09-10--TPL-1--bootstrap.md` | the workspace layout, the version pins, the gates | that code runs in this repository. The pins it argues for are the pins installed today, and the traps in [the root contract](../../AGENTS.md) are its conclusions in short form |
| `2026-09-10--AUTH-1--auth-starter.md` | accounts end to end, and the design system the screens are drawn with | the shopkeeper signs in with exactly this. Every rule in [docs/product/](../product/README.md#accounts) about verification, sessions and password reset was decided here, and the reasoning is nowhere else |
| `2026-09-20--BEE-1--migracao-bee-link.md` | bringing bee-link over from the legacy monolith, domain by domain | the work in progress. Read its appendix first: the target changed the day it was written |

The first two arrived with the harness template this repository was cloned from, and they are **kept rather than moved**. A plan justifies code, and their code is here and running: deleting them would leave the auth flow, the version pins and the gates standing with no record of why they are shaped that way, which is the exact failure the append-only rule exists to prevent. They stay dated as they were — a plan written for the template and inherited by a product is still a true account of the moment it was written.
