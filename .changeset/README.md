# Changesets

**This tool currently has no job in this repository, and that is a decision waiting to be taken rather than a state to rely on.**

It was configured for a mobile app whose version *was* its over-the-air runtime: a changeset bumped `apps/mobile/package.json`, and that bump is what made a build a new runtime. That app is gone from this repository — it lives in the `harness-monorepo` template — and with it the only reason anything here was versioned.

What is left: `config.json` ignores `web`, `api` and `@harness-monorepo/contracts`, which leaves `@harness-monorepo/ui` as the only versioned package. `ui` is private, pinned at `0.0.0`, consumed only through `workspace:*` by `apps/web`, and never published — so bumping it changes nothing that any person, agent or deploy can observe.

So there are two honest options, and neither is "leave a pending changeset lying around":

- **Remove it** — `.changeset/`, the `changeset` script in the root `package.json`, and `@changesets/cli`. This is the likely answer while the web app and the API deploy continuously and nothing is published.
- **Give it a job** — if a package here ever ships to a registry or carries a runtime version, add it back deliberately, with the bump rule written here in the same commit.

Until one of those happens: `pnpm changeset version` reads every `*.md` in this folder and **errors on a changeset naming a package that no longer exists**, so a stale file here breaks the command rather than being ignored.
