// Types
import type { Prisma } from '../../generated/prisma/client.js';

// App
import { asJson, documentOf } from './page-document.js';
import { sectionInclude } from './page.mapper.js';

/** A version as the history lists it: who froze it, and when. */
export const VERSION_SELECT = {
  id: true,
  number: true,
  note: true,
  createdAt: true,
  author: { select: { id: true, name: true } },
} satisfies Prisma.StorePageVersionSelect;

export type VersionRow = Prisma.StorePageVersionGetPayload<{ select: typeof VERSION_SELECT }>;

/**
 * The page's draft, frozen as its next version: the rows in the panel's order, as one document. The
 * caller's transaction holds the shop's lock, which is what keeps two publishes from taking one number
 * (and `@@unique([pageId, number])` is the backstop).
 *
 * A function and not a service, because the shop's own create calls it for a new home and the stores
 * module is below the page module.
 */
export async function freezePage(
  tx: Prisma.TransactionClient,
  page: { storeId: string; pageId: string; authorId: string | null; note?: string | null },
): Promise<VersionRow> {
  const rows = await tx.storeSection.findMany({
    where: { pageId: page.pageId },
    include: sectionInclude,
    orderBy: [{ position: 'asc' }, { id: 'asc' }],
  });
  const last = await tx.storePageVersion.findFirst({
    where: { pageId: page.pageId },
    orderBy: { number: 'desc' },
    select: { number: true },
  });

  return tx.storePageVersion.create({
    data: {
      pageId: page.pageId,
      storeId: page.storeId,
      number: (last?.number ?? 0) + 1,
      document: asJson(documentOf(rows)),
      note: page.note ?? null,
      authorId: page.authorId,
    },
    select: VERSION_SELECT,
  });
}
