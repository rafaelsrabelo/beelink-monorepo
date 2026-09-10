# apps/web — surface map

> Facts about this workspace. Rules live in [../AGENTS.md](../AGENTS.md).

## Layout

```
src/
└── app/
    ├── layout.tsx     # <html>, fonts, global CSS
    ├── page.tsx       # "/" → redirect("/dashboard")
    └── globals.css    # Tailwind 4 entry
```

## Routes

| Path | What |
|---|---|
| `/` | redirects to `/dashboard` |

## Environment

No variables yet.
