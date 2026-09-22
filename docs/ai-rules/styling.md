# Styling

> **Tier:** rules — holds on web and mobile. Overrides default judgment on its topic.

## Tokens, never literals

- Colours come from tokens: the CSS variables shadcn declares in `apps/web/src/app/globals.css`, and the theme object on mobile. A hex literal in a component fails `web/no-hex-colors`.
- Tailwind 4 has no config file — `@import "tailwindcss"` in `globals.css` is the whole setup. Theme values extend through `@theme` in CSS.

## Reach for shadcn before writing a component

Before writing any UI component, look for it in the registry. If shadcn has it and this repository does not, **install it and use it** — never hand-roll a second version of something the registry already ships.

```bash
ls packages/ui/src/components/            # what is already here
pnpm --filter web exec shadcn add <name>  # lands in packages/ui, not in the app
```

A hand-rolled select is a select with its own keyboard behaviour, its own ARIA and its own bugs, sitting three screens away from one that got all of that right. The registry's version is the one the whole ecosystem has already debugged, and adopting it is cheaper than the second bug report.

**Every primitive gets a Storybook story on the day it is installed**, not the day someone edits it. A primitive nobody can see is a primitive the next person installs again under a different name.

### When the primitive is the wrong trade, write down why

Reaching for it first is the rule; using it regardless of what it costs is not. A primitive can carry an assumption that is wrong for one surface, and the answer then is to say so **in the file that does something else** — not to quietly diverge.

The worked example is in this repository. `components/carousel` is Embla, and Embla owns the overflow: its viewport is `overflow-hidden` and every step is a transform. Behind a login that is free. On the storefront it is not — a visitor whose script has not arrived sees the first cards and cannot reach the rest — so `blocks/storefront/scroll-rail.tsx` scrolls natively and puts the arrows on top, and its doc comment carries that reasoning. The carousel stays installed and storied, because the admin and the design editor will want exactly what it does.

## shadcn/ui is owned code

`shadcn add <component>` **copies** the component into `packages/ui/src/components/`. From that moment it is this repository's code:

- **Edit it in place.** Change the variant, the spacing, the radius right there.
- **Never wrap it** in another component just to override its classes. A wrapper that fights the original's classes is two components doing one job, and the next `shadcn add --overwrite` silently undoes the wrong one.
- Add components with `pnpm --filter web exec shadcn add <name>`, never by hand-copying from the website. The command runs from the app because that is where `components.json` lives; the file it writes lands in `packages/ui`.

## Loading

A skeleton that matches the final layout — same heights, same gaps. Never a spinner, never "Loading…" text: a layout that jumps when data arrives reads as broken.
