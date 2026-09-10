# Changesets

Only `apps/mobile` is versioned — its version is its over-the-air runtime. The web and the API deploy continuously and are ignored in `config.json`.

```bash
pnpm changeset          # describe the change and choose the bump
pnpm changeset version  # apply pending changesets: bumps apps/mobile/package.json
pnpm changeset tag      # tag the release, as mobile@<version>
```

**Which bump?** A change to native code or config — a new native module, `app.json`, an SDK upgrade — is **minor** or **major**, because it needs a new store build and therefore a new runtime. A JS-only change is **patch**, and can ship over the air.
