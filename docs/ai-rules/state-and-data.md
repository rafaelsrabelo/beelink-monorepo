# State and data

> **Tier:** rules — holds on web and mobile. Overrides default judgment on its topic.

## Where state lives — decide in this order

| The data is… | It lives in… |
|---|---|
| from the API | **TanStack Query** — a hook in `src/services/<domain>/` |
| derived from other state | `useMemo` — not a second source of truth |
| a form's fields | the form library, or refs |
| in the URL (filters, tabs, page) | search params — shareable and back-button safe |
| shared by components that are not parent and child | a **Zustand** store, one per domain |
| ephemeral UI (open / closed) | `useState` — and more than two in one component means the approach is wrong |

## Services

- One folder per domain. Request functions and their query hooks live together.
- Request and response types come from `@harness-monorepo/contracts`. A component imports them from there — it never redeclares a wire shape.
- **Query keys are factories, not constants** — `tasksKeys.list(filter)`, so a key is built from its inputs at call time.

## Zustand

- One store per domain, in `src/stores/<domain>.ts`.
- Select one field per subscription — `useTasksFilter((s) => s.status)`, never the whole store. A component that reads the whole store re-renders on every change to any of it.
- Server data never enters a store. If it came from the API, it belongs to TanStack Query, which already owns caching, refetching and invalidation.
