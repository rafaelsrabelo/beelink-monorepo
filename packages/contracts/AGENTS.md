# packages/contracts — workspace contract

> Root contract: [/AGENTS.md](../../AGENTS.md). It applies here in full.
> This file records only what is true in `packages/contracts` and not at the root.

**What:** the shapes that cross the network between `apps/api` and the two apps. Nothing here runs.

## Rules in addition to the root's

1. **Types only** — `type` and `interface`, never `const`, `function`, `class` or `enum`. The package is TypeScript source consumed straight from the workspace: the web and mobile bundlers compile it, but the compiled API runs on Node, which will not strip types from a file under `node_modules`. A value exported here works in development and crashes the running API. Gate: `contracts-types-only`.
2. **Consumers import with `import type`.** The API is gated on it: `api/contracts-type-only`.
3. **Runtime validation lives at the edge that validates.** The API's DTOs hold the allowed values and are checked against these types with `satisfies`, so a type change the DTO does not follow fails to compile.
4. **Dates travel as ISO-8601 strings.** JSON has no date type; pretending otherwise makes every consumer parse differently.
5. **A breaking change moves every consumer in the same PR.** Nothing is versioned here: the package is consumed at source, so a renamed field is a compile error in all three apps at once — which is the point.

## Exports

One entry, `.`, with only a `types` condition. A runtime import therefore fails at resolution — loudly, at the import line — instead of deep inside Node.
