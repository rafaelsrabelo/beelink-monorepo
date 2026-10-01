// Types
import type { Prisma } from '../../generated/prisma/client.js';
import type { ProductVariantModel } from '../../generated/prisma/models.js';

// App
import { isSoldOut } from '../catalog/catalog.visibility.js';
import { SELLING_VARIANTS } from './favorite-reading.js';

type Tx = Prisma.TransactionClient;
type Stock = Pick<ProductVariantModel, 'trackStock' | 'stockQuantity'>;

/** At most one notice per shopper and product in this long (BEELINK-155). */
export const NOTICE_EVERY_MS = 7 * 24 * 60 * 60_000;

/** What a favourite is today: its price, whether it is sold out, and whether that price can be ordered now. */
export interface FavoriteToday {
  priceCents: number;
  soldOut: boolean;
  orderable: boolean;
}

/** What a favourite last saw (`seenPriceCents`, `seenSoldOut`). */
export interface FavoriteSeen {
  priceCents: number;
  soldOut: boolean;
}

export interface FavoriteWatch {
  seen: FavoriteSeen;
  /** What to tell, when anything: the price it had (a drop) and whether it came back. */
  notice: { previousPriceCents: number | null; backInStock: boolean } | null;
}

/**
 * One favourite, looked at again. A drop is a price below the mark that can be ordered now — a
 * cheaper price nobody can buy is not news yet, so the mark only rises while it cannot be; a return
 * is sold out then and not now. Both at once are one notice.
 */
export function watchOf(seen: FavoriteSeen, today: FavoriteToday): FavoriteWatch {
  const dropped = today.orderable && today.priceCents < seen.priceCents;
  const back = seen.soldOut && !today.soldOut;
  return {
    seen: { priceCents: today.orderable ? today.priceCents : Math.max(seen.priceCents, today.priceCents), soldOut: today.soldOut },
    notice: dropped || back ? { previousPriceCents: dropped ? seen.priceCents : null, backInStock: back } : null,
  };
}

/**
 * The product's favourites, looked at again after a write changed its variants — called by
 * `syncProductCache`, inside that write's transaction, so no price or stock change escapes it: the
 * panel's edits, a sale and a cancel alike — and by a draft's publishing, which moves no variant.
 *
 * A handful of statements whatever the number of favourites: a sale's transaction runs this for
 * every product it takes. Priced as the list prices them — the combination liked while the shop
 * sells it; a product liked as a whole by its cheapest combination on sale — and a combination the
 * shop stopped selling is left alone. Nothing moves while the product is a draft, so what changed
 * meanwhile is told when it is published.
 *
 * A notice is owed only to a confirmed account that kept the notice on, once in 7 days per product;
 * the e-mail goes after the commit (`FavoriteNoticeMailer`). Answers how many were owed.
 */
export async function watchFavorites(tx: Tx, productId: string, now = new Date()): Promise<number> {
  const product = await tx.product.findUnique({
    where: { id: productId },
    select: { status: true, priceCents: true, trackStock: true, stockQuantity: true, variants: { ...SELLING_VARIANTS, select: { priceCents: true, trackStock: true, stockQuantity: true } } },
  });
  if (product?.status !== 'ACTIVE') return 0;
  const favorites = await tx.customerFavorite.findMany({
    where: { productId },
    select: { id: true, customerId: true, variantId: true, seenPriceCents: true, seenSoldOut: true, customer: { select: { notifyFavorites: true, user: { select: { emailVerifiedAt: true } } } } },
  });
  if (favorites.length === 0) return 0;

  const liked = [...new Set(favorites.flatMap((favorite) => (favorite.variantId ? [favorite.variantId] : [])))];
  const variants = new Map(
    (await tx.productVariant.findMany({ where: { id: { in: liked }, productId, isActive: true, archivedAt: null }, select: { id: true, priceCents: true, trackStock: true, stockQuantity: true } })).map((row) => [row.id, row]),
  );
  const cheapest: Stock & { priceCents: number } = product.variants[0] ?? product;
  const whole: FavoriteToday = { priceCents: cheapest.priceCents, soldOut: isSoldOut(product), orderable: !isSoldOut(cheapest) };

  const marks = new Map<string, string[]>();
  const owed: { customerId: string; variantId: string | null; previousPriceCents: number | null; backInStock: boolean; priceCents: number }[] = [];
  for (const favorite of favorites) {
    const variant = favorite.variantId ? variants.get(favorite.variantId) : undefined;
    if (favorite.variantId && !variant) continue;
    const today = variant ? { priceCents: variant.priceCents, soldOut: isSoldOut(variant), orderable: !isSoldOut(variant) } : whole;
    const { seen, notice } = watchOf({ priceCents: favorite.seenPriceCents, soldOut: favorite.seenSoldOut }, today);

    if (seen.priceCents !== favorite.seenPriceCents || seen.soldOut !== favorite.seenSoldOut) {
      const key = `${seen.priceCents}:${seen.soldOut}`;
      marks.set(key, [...(marks.get(key) ?? []), favorite.id]);
    }
    if (notice && favorite.customer.notifyFavorites && favorite.customer.user?.emailVerifiedAt) {
      owed.push({ customerId: favorite.customerId, variantId: favorite.variantId, priceCents: today.priceCents, ...notice });
    }
  }

  for (const [key, ids] of marks) {
    const [price, soldOut] = key.split(':');
    await tx.customerFavorite.updateMany({ where: { id: { in: ids } }, data: { seenPriceCents: Number(price), seenSoldOut: soldOut === 'true' } });
  }
  if (owed.length === 0) return 0;

  // Serialized with any other write to this product by its lock, which every caller holds.
  const told = new Set(
    (
      await tx.favoriteNotice.findMany({
        where: { productId, customerId: { in: owed.map((notice) => notice.customerId) }, createdAt: { gt: new Date(now.getTime() - NOTICE_EVERY_MS) } },
        select: { customerId: true },
      })
    ).map((notice) => notice.customerId),
  );
  const fresh = owed.filter((notice) => !told.has(notice.customerId));
  if (fresh.length > 0) await tx.favoriteNotice.createMany({ data: fresh.map((notice) => ({ productId, ...notice })) });
  return fresh.length;
}
