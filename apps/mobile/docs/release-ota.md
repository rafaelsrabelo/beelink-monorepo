# Release and over-the-air updates

> Facts and procedure for this workspace. Rules live in [../AGENTS.md](../AGENTS.md).

## Two ways a change reaches a phone

| | Store build | Over the air (OTA) |
|---|---|---|
| Ships | a new binary — native code and JS | a new JS bundle and assets, into a binary already installed |
| Tool | `eas build`, then `eas submit` | `eas update` |
| Reaches users | hours to days — store review | on the next app launch |
| Needed for | a native module, `app.json`, an SDK upgrade, the icon, a permission | logic, screens, copy, images the JS requires |

## The one rule: the runtime version

An update is only offered to binaries whose **runtime version** matches the one it was published for. The reason is a crash: new JS calling a native module the old binary does not contain fails on launch — for every user, with no store review to catch it.

This app uses the `appVersion` policy:

```json
"runtimeVersion": { "policy": "appVersion" }
```

and `app.json` deliberately has **no `version`**, so Expo falls back to `apps/mobile/package.json`. That makes the version bump — done by a changeset — the moment a build becomes a new runtime:

```
1.4.0  store build       → runtime 1.4.0
1.4.0  OTA "fix copy"    → reaches every 1.4.0 install
1.5.0  store build       → runtime 1.5.0  (a native module was added)
1.5.0  OTA               → reaches 1.5.0 installs only; 1.4.0 keeps what it has
```

**The alternative is `fingerprint`**, which hashes the native project and changes the runtime by itself whenever native code changes. It cannot be forgotten — its strength. But it also moves on incidental native edits, splitting the audience into more runtimes than necessary. `appVersion` keeps the decision explicit, and `ota:check` is the guard rail for it.

## Channels

Each profile in [../eas.json](../eas.json) builds for a **channel**. An update is published to a channel and reaches only the builds made for it.

| Profile | Channel | For |
|---|---|---|
| `development` | `development` | a dev client on your own device |
| `preview` | `preview` | internal testers |
| `production` | `production` | the stores |

Build numbers are managed by EAS (`appVersionSource: remote`, `autoIncrement` on production); the version users see stays in `package.json`, where the changeset puts it.

## Can this change go over the air? — `ota:check`

```bash
pnpm --filter mobile ota:check
pnpm --filter mobile ota:check -- <base> <head>
```

Three answers, not two:

| Exit | Verdict | Meaning |
|---|---|---|
| `0` | OTA-eligible | only JS, JS-required images and docs changed under `apps/mobile` |
| `1` | needs a native build | something outside the allowlist changed — `app.json`, `package.json`, `eas.json`, the `assets/` folder |
| `2` | irrelevant | `apps/mobile` was not touched |

It is **conservative by design**: anything it does not recognise forces a store build. The top-level `assets/` folder is left off the allowlist on purpose — it holds the icon and the splash that `app.json` bakes into the binary. Images the JS requires belong under `src/`, where they ship over the air.

The root `package.json`, `pnpm-lock.yaml` and `.npmrc` count as native risk too: they decide what gets installed into the binary. A web-only dependency bump therefore reads as "needs a native build" — the safe side of the mistake.

## Publishing — `ota`

```bash
pnpm --filter mobile ota -- "fix: correct the empty-state copy"
pnpm --filter mobile ota -- --dry-run "fix: …"
```

It refuses to run unless:

1. you are on `main`, clean, and in sync with `origin/main` — an update is never published from a branch;
2. `apps/mobile/package.json` matches the latest `mobile@<version>` tag, so the update targets the runtime that is actually in the stores;
3. the diff since that tag is OTA-eligible.

Then it runs one `eas update --channel production`, for both platforms at once.

## Rolling back

An update that broke something is replaced, not deleted: republish the last good commit, or run `eas update:rollback` and choose the previous update on the `production` channel. Installs pick it up on their next launch.

## First-time setup

The template is not bound to any Expo account — that is yours to run, once:

```bash
cd apps/mobile
pnpm exec eas login
pnpm exec eas init
pnpm exec eas update:configure
```

Commit the fields they add to `app.json`. Then replace `ios.bundleIdentifier` and `android.package` — they are placeholders, and permanent once an app is in a store.
