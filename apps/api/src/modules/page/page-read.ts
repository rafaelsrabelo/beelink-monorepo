// Types
import type { Section } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';

// App
import { sectionInclude, toSection } from './page.mapper.js';

/**
 * The panel's read of a shop's page: hidden bands and hidden components included, in the arranged
 * order. The id breaks a tie, so a list read twice is the same list, and the one an add counts in.
 *
 * A function over a client and not a service method, because both page services answer with it
 * after a write that changes more than one row, and ownership is checked before either gets here.
 */
export async function pageOf(db: Prisma.TransactionClient, storeId: string): Promise<Section[]> {
  const rows = await db.storeSection.findMany({
    where: { storeId },
    include: sectionInclude,
    orderBy: [{ position: 'asc' }, { id: 'asc' }],
  });

  return rows.map(toSection);
}
