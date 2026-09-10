<!--
Fill every section. If one does not apply, write "n/a" and one line of why — do not delete it.

The developer checklist at the bottom is an ATTESTATION, not a summary: a ticked box means the
person ticking it did the thing. An agent opening this PR fills the sections above and leaves
every box unchecked.
-->

## Summary

<!-- 2 to 4 bullets: what changed and why. Not a file list. -->

## Related task(s)

- <!-- ticket link -->

## Changes

<!-- Grouped by workspace: apps/web, apps/api, apps/mobile, packages/*, docs, scripts, .github -->

## How to test

<!-- Numbered steps someone else can follow: command, route or screen, expected result. -->

## Coverage

<!-- One row per acceptance criterion, with concrete evidence: file:line, a command's output, a driven flow. -->

| DoD | Criterion | Evidence |
|---|---|---|
|  |  |  |

## Not covered

<!-- Anything in the ticket this PR does not deliver, and where it went instead. "Nothing" is a valid answer. -->

## Mobile release

<!-- Only when apps/mobile changed: the `pnpm --filter mobile ota:check` verdict, and whether a changeset bumps the version. -->

## Risk and rollback

<!-- What breaks if this is wrong, and how to undo it. -->

---

## Developer checklist

<!-- Only the developer ticks these. An agent cannot attest to having looked at a screen. -->

- [ ] I read my own diff end to end
- [ ] `pnpm ci-check` is green on my machine
- [ ] `delivery-check` ran, and no blocker is left
- [ ] I ran the change and exercised the affected screens or endpoints by hand
- [ ] Every new env var is in that workspace's `.env.example`
- [ ] Screenshots or a short video attached — anything visual
- [ ] Mobile: ran on a real device, and the OTA verdict is in the section above
