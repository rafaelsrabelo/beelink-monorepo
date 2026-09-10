# Styling

> **Tier:** rules — holds on web and mobile. Overrides default judgment on its topic.

## Tokens, never literals

- Colours come from tokens: the CSS variables shadcn declares in `apps/web/src/app/globals.css`, and the theme object on mobile. A hex literal in a component fails `web/no-hex-colors`.
- Tailwind 4 has no config file — `@import "tailwindcss"` in `globals.css` is the whole setup. Theme values extend through `@theme` in CSS.

## shadcn/ui is owned code

`npx shadcn add <component>` **copies** the component into `apps/web/src/components/ui/`. From that moment it is this repository's code:

- **Edit it in place.** Change the variant, the spacing, the radius right there.
- **Never wrap it** in another component just to override its classes. A wrapper that fights the original's classes is two components doing one job, and the next `shadcn add --overwrite` silently undoes the wrong one.
- Add components with `pnpm --filter web exec shadcn add <name>`, never by hand-copying from the website.

## Loading

A skeleton that matches the final layout — same heights, same gaps. Never a spinner, never "Loading…" text: a layout that jumps when data arrives reads as broken.
