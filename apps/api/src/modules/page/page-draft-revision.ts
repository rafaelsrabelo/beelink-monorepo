// Nest
import { ConflictException } from '@nestjs/common';

// Types
import type { Prisma } from '../../generated/prisma/client.js';

// App
import { pageError } from './page.rules.js';

/*
  The draft's revision: how two tabs editing one page find out about each other.

  Every accepted write to a page's bands or blocks bumps it by exactly one, inside the write's own
  transaction, so a refused write rolls the bump back with it. That invariant is what lets the editor
  know its next revision without being told: it sent `n`, the write succeeded, the page is at `n + 1`.
  A write that sends no revision is not checked — every caller from before this existed keeps working.

  Order in a write: the shop's lock, then the ownership check that yields the page, then this, then
  the write. One order everywhere, so no two writes can wait on each other the other way round.
*/

const STALE = 'Outra aba alterou esta página.';

/**
 * The page's draft is about to change: its revision goes up by one, or — when the caller named the
 * revision it read and another write landed since — nothing is written and the answer is 409.
 *
 * Raw SQL and not `storePage.update`: the page's `updatedAt` means its settings changed, and a drag
 * of a band is not that.
 */
export async function touchDraft(tx: Prisma.TransactionClient, pageId: string, expected?: number): Promise<void> {
  const changed = await tx.$executeRaw`
    UPDATE "store_pages" SET "draftRevision" = "draftRevision" + 1
    WHERE "id" = ${pageId}::uuid AND (${expected ?? null}::int IS NULL OR "draftRevision" = ${expected ?? null}::int)`;

  if (changed === 0) throw new ConflictException(pageError('PAGE_DRAFT_STALE', STALE));
}

/** The same check without the bump, for a read that must be of the draft the caller saw: Publicar. */
export async function checkDraft(tx: Prisma.TransactionClient, pageId: string, expected?: number): Promise<void> {
  if (expected === undefined) return;

  const page = await tx.storePage.findUniqueOrThrow({ where: { id: pageId }, select: { draftRevision: true } });
  if (page.draftRevision !== expected) throw new ConflictException(pageError('PAGE_DRAFT_STALE', STALE));
}
