# Code quality

> **Tier:** rules — holds in two or more workspaces. Overrides default judgment on its topic.

## Responsibilities per folder

| Where | Holds | Never holds |
|---|---|---|
| `apps/web/src/services/<domain>/` | request functions + TanStack Query hooks for one domain | JSX, copy |
| `apps/web/src/stores/` | Zustand stores, one per domain | server data |
| `apps/web/src/components/` | presentational components | a request |
| `apps/web/src/components/ui/` | shadcn components — **owned code**, edited in place | business logic |
| `apps/api/src/modules/<domain>/` | module · controller · service · `dto/` | `process.env`, `console.*` |
| `packages/contracts/src/` | wire types | anything that runs |

## Component shape

- One component per file, under 250 lines. Past that, split by responsibility, not by size.
- Props are typed in the file or a sibling `*.types.ts`; never `any`.
- A component that needs no state or effect stays a Server Component on web.

## TypeScript

- `strict` everywhere. No `any`, no `@ts-ignore` without a comment saying why.
- Prefer `satisfies` over a type annotation when the value's own type should survive.
- `import type` for anything used only as a type — mandatory for `@harness-monorepo/contracts`.

## Errors

- The API answers errors as `{ statusCode, errorCode, message }`. `errorCode` is a stable machine string; `message` is for logs.
- Services on web emit **codes**, never sentences. The UI maps a code to copy.

## Imports

Group them, with a one-line label per group and a blank line between groups; `import type` goes last.

```ts
// React
import { useMemo } from "react";

// Libs
import { useQuery } from "@tanstack/react-query";

// Services
import { useLogin } from "@/services/auth";

// Types
import type { User } from "@harness-monorepo/contracts";
```
