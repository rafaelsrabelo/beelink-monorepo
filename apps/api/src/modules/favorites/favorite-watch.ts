// Types
import type { Prisma } from '../../generated/prisma/client.js';

// App
import { favoriteInclude, toCustomerFavorite } from './favorite-reading.js';

type Tx = Prisma.TransactionClient;

/** At most one notice per shopper and product in this long (BEELINK-155). */
export const NOTICE_EVERY_MS = 7 * 24 * 60 * 60_000;

/** A favourite as it is watched: priced as the list prices it, with who would be told. */
const watchInclude = {
  ...favoriteInclude,
  product: { select: { ...favoriteInclude.product.select, status: true } },
  customer: { select: { notifyFavorites: true, user: { select: { emailVerifiedAt: true } } } },
} as const satisfies Prisma.CustomerFavoriteInclude;

/**
 * The product's favourites, looked at again after a write changed its variants — called by
 * `syncProductCache`, inside that write's transaction, so no price or stock change escapes it: the
 * panel's edits, a sale and a cancel alike. Each favourite compares today with what it last saw:
 *
 * - cheaper, and on sale (not sold out), is a drop to tell;
 * - sold out then and not now is a return to tell;
 * - both at once are one notice.
 *
 * What it saw moves every time, told or not — a price that rose is the new mark. A combination the
 * shop stopped selling is left alone: its price is not the product's. A notice is owed only for a
 * published product, to a confirmed account that kept the notice on, and once in 7 days per product.
 * The e-mail itself goes after the commit (`FavoriteNoticeMailer`). Answers how many were owed.
 */
export async function watchFavorites(tx: Tx, productId: string, now = new Date()): Promise<number> {
  const rows = await tx.customerFavorite.findMany({ where: { productId }, include: watchInclude });
  let owed = 0;

  for (const row of rows) {
    const today = toCustomerFavorite(row);
    if (row.variantId !== null && today.variant === null) continue;

    const dropped = today.priceCents < row.seenPriceCents && !today.soldOut;
    const back = row.seenSoldOut && !today.soldOut;
    if (today.priceCents !== row.seenPriceCents || today.soldOut !== row.seenSoldOut) {
      await tx.customerFavorite.update({ where: { id: row.id }, data: { seenPriceCents: today.priceCents, seenSoldOut: today.soldOut } });
    }

    if (!dropped && !back) continue;
    if (row.product.status !== 'ACTIVE' || !row.customer.notifyFavorites || !row.customer.user?.emailVerifiedAt) continue;
    const told = await tx.favoriteNotice.count({ where: { customerId: row.customerId, productId, createdAt: { gt: new Date(now.getTime() - NOTICE_EVERY_MS) } } });
    if (told > 0) continue;

    await tx.favoriteNotice.create({
      data: { customerId: row.customerId, productId, priceCents: today.priceCents, previousPriceCents: dropped ? row.seenPriceCents : null, backInStock: back },
    });
    owed += 1;
  }
  return owed;
}
