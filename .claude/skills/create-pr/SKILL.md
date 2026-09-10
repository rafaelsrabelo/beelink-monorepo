---
name: create-pr
description: Open or update a pull request — Conventional Commit title, the repository's template as the body, every checkbox left unchecked, draft by default. Trigger on /create-pr, "open a PR", "update the PR".
---

# create-pr

## Before

- `pnpm ci-check` is green and `delivery-check` has no blocker. If not, stop and say which.
- The branch is pushed.

## Title

A Conventional Commit in English, scoped to the workspace: `feat(web): list tasks by status`.

## Body

Use `.github/pull_request_template.md` as it is, and fill every prose section:

- **Summary** — two to four bullets: what changed and *why*, not a file list.
- **Coverage** — one row per Definition-of-Done line, each with real evidence.
- **Not covered** — what the ticket asked for and this PR does not deliver. "Nothing" is valid; silence is not.
- **Mobile release** — when `apps/mobile` changed: the `ota:check` verdict and the changeset bump.

**Leave every checkbox in the developer checklist unchecked.** A tick is a person attesting they did it; an agent ticking one is fabricating evidence.

## Open

```bash
gh pr create --draft --base main --title "<title>" --body-file <file>
```

Draft by default. The person marks it ready after exercising it by hand.
