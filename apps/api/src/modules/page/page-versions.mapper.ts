// Types
import type { PageVersionSummary } from '@harness-monorepo/contracts';
import type { VersionRow } from './page-freeze.js';

/** A version as the history lists it. `live` is the caller's to know: it depends on the page's status. */
export function toVersionSummary(row: VersionRow, live: boolean): PageVersionSummary {
  return {
    id: row.id,
    number: row.number,
    note: row.note,
    author: row.author ? { id: row.author.id, name: row.author.name } : null,
    createdAt: row.createdAt.toISOString(),
    live,
  } satisfies PageVersionSummary;
}
