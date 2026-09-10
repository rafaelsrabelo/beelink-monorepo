# TPL-1 — Bootstrap the template

## Context

A monorepo template with a web app, an API and a mobile app, whose main product is the harness around them: a contract every AI tool reads, docs an agent can navigate, and gates that enforce the rules.

## Decisions

**TypeScript 6.0, not 7.0.** npm's `latest` is 7.0.2, the native rewrite. The ecosystem is not there yet: the Nest CLI 12 bundles `~6.0.2` and the Expo SDK 57 template pins `~6.0.3`. Every workspace is pinned to `~6.0.3`, to be upgraded together.

**Prisma 7.10.0.** Prisma's `latest` dist-tag points at `8.0.0-rc.13`, so an unpinned install gets a release candidate. 7.10.0 is the newest stable.

**React 19.2.3 in every workspace.** Expo SDK 57 pins it, with React Native 0.86.3; Next 16.3 accepts any `^19`. Aligning on Expo's pin keeps one physical copy of React in the monorepo.

**Hoisted linker.** Expo's Metro and autolinking expect a flat `node_modules`.

**Fastify, not Express, for the API.** Faster, schema-friendly, and it forces the plugin model for CORS and security headers instead of ad hoc middleware.

**`packages/contracts` is types only.** It is TypeScript source consumed straight from the workspace. The bundlers on web and mobile compile it; the compiled API runs on Node, which refuses to strip types from files under `node_modules`. A value exported from contracts would work in development and crash the running API. So it exports types, and a gate (`contracts-types-only`) keeps it that way.

**The mobile version is the OTA runtime.** `runtimeVersion.policy: appVersion`, `app.json` carries no `version`, so `package.json` drives it and a changeset bump is what makes a build a new runtime.

**Scaffolds were generated, then shaped.** `create-expo-app` ran with `--no-agents-md`, and the `AGENTS.md`/`CLAUDE.md` that `create-next-app` generated were replaced — a scaffold's own agent files would compete with this contract.

## Not covered

- Authentication. The API has no guard; the template's domain is deliberately small.
- An EAS project. `eas init` binds the app to an Expo account, and that is the user's to run.
