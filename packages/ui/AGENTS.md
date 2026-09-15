# packages/ui — workspace contract

> Root contract: [/AGENTS.md](../../AGENTS.md). It applies here in full.
> This file records only what is true in `packages/ui` and not at the root.

**What:** the design system — tokens, the shadcn primitives, and presentational blocks built from them. Consumed by `apps/web` only. Storybook on port `6006`.
**Surface map:** [docs/README.md](docs/README.md)

## Rules in addition to the root's

1. **Presentational only.** Nothing here fetches, routes or reads a session. Data, callbacks and links arrive through props — which is why every block renders in Storybook with no server behind it. Gate: `web/no-fetch-in-components` scans this package too.
2. **Every block has a story and a test.** The story is the catalogue and the a11y panel; the test — Testing Library plus an axe check — is what CI runs. A primitive earns its own story the day someone edits it: from then on it is ours, not the registry's.
3. **Tokens are defined once, in `src/styles/globals.css`.** Light and dark share variable names; a component uses a token's Tailwind class, never a colour. Gate: `web/no-hex-colors` scans this package too.
4. **Links are injected.** A block that navigates takes a `linkComponent` prop, `<a>` by default. The web passes `next/link`; Storybook keeps the default. Nothing here imports `next/*`. A link component passes every prop through — the primitives inject `aria-current`, data attributes and handlers, and swallowing them loses behaviour, not just styling.
5. **Copy is pt-BR and overridable.** A block ships its text as default props, so a screen changes one sentence without forking the block. Error sentences arrive ready-made from the screen — this package never sees an `errorCode`.
6. **Primitives are owned code.** `shadcn add` writes them here and they are ours to edit — but a primitive's change reaches every screen, so its story changes in the same commit.
7. **The 250-line rule covers what we write, not what the registry writes.** A primitive is a whole family in one file — `sidebar.tsx` exports fifteen components in 723 lines — and splitting it would end any chance of `shadcn add` updating it. Blocks, screens and services stay under the limit.

## Exports

Source files, compiled by the consumer — `apps/web`'s Next build.

| Import | What |
|---|---|
| `@harness-monorepo/ui/components/<name>` | a shadcn primitive |
| `@harness-monorepo/ui/blocks/<name>` | a presentational block |
| `@harness-monorepo/ui/hooks/<name>` | a hook the primitives share |
| `@harness-monorepo/ui/lib/utils` | `cn()` |
| `@harness-monorepo/ui/globals.css` | tokens, base layer and Tailwind's entry |

## Commands

```bash
pnpm storybook                                   # http://localhost:6006
pnpm --filter @harness-monorepo/ui test          # component tests, with axe
pnpm --filter @harness-monorepo/ui build-storybook
pnpm --filter web exec shadcn add <name>         # run from the app: primitives land here
```

## Traps

- **React is a peer dependency.** Declared as a dependency, pnpm could install a second copy for this package — an "Invalid hook call" at runtime, with nothing in the diff to explain it (root trap 3).
- **Tailwind generates only the classes it finds.** `apps/web`'s CSS is the entry point, and the `@source` line in `src/styles/globals.css` is what makes Tailwind read this package — a class used only here, outside that path, never reaches the page.
