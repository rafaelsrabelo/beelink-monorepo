# packages/ui — surface map

> Facts about this workspace. Rules live in [../AGENTS.md](../AGENTS.md).

## Layout

```
src/
├── styles/globals.css   # tokens (light + dark), base layer, @source for this package
├── lib/utils.ts         # cn()
├── components/          # shadcn primitives — written by `shadcn add`
├── hooks/               # hooks the primitives share
└── blocks/              # presentational compositions: auth, dashboard
.storybook/              # Storybook config — Vite, Tailwind, a11y, light/dark toggle
```
