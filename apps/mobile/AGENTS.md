# apps/mobile — workspace contract

> Root contract: [/AGENTS.md](../../AGENTS.md). It applies here in full.
> This file records only what is true in `apps/mobile` and not at the root.

**What:** the iOS and Android app — Expo SDK 57, built with EAS Build, updated with EAS Update.
**Release and OTA:** [docs/release-ota.md](docs/release-ota.md)

## Rules in addition to the root's

1. **The version is the runtime.** `runtimeVersion.policy` is `appVersion`, and `app.json` carries no `version` of its own — `package.json` drives it. An over-the-air update only reaches binaries built with the same version, so a native change bumps the version (a changeset, minor or major) and ships through the store.
2. **Over the air only from `main`, only for JS and assets.** `ota:check` classifies the diff; `ota` publishes, and refuses anything else.
3. **`ios/` and `android/` are generated.** Continuous Native Generation: native configuration lives in `app.json` and config plugins, and `expo prebuild` writes the folders. They are gitignored — an edit there is lost on the next build.
4. **Native modules arrive through `npx expo install`,** never a bare `pnpm add`: Expo pins the version that matches the SDK, and a mismatch builds fine and crashes on launch.
5. **No web-only modules** — no `next/*`, no `react-dom`. Gate: `mobile/no-web-imports`.

## Commands

| Command | What it does |
|---|---|
| `pnpm dev:mobile` | Expo dev server, from the root |
| `pnpm --filter mobile ota:check` | can this diff ship over the air? |
| `pnpm --filter mobile ota -- "fix: …"` | publish to the production channel |
| `pnpm --filter mobile build:preview` | internal build, preview channel |
| `pnpm --filter mobile build:production` | store build, production channel |

## Traps

- **The EAS project is not bound yet.** `eas init` writes the project id and `eas update:configure` writes `updates.url` into `app.json`; until then builds and updates have nowhere to go.
- **`bundleIdentifier` and `package` are placeholders** (`com.example.harnessmobile`). They are permanent once an app is in a store — change them before the first build.
