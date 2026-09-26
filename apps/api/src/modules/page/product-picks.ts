// Types
import type { ShowcaseProduct } from '@harness-monorepo/contracts';
import type { PrismaService } from '../../shared/prisma/prisma.service.js';

/**
 * Products picked for a block — a showcase's hand-picked list, a featured product — have to be this
 * shop's own, and what answers is the pick without the products that no longer exist.
 *
 * Gone and foreign are told apart on purpose. The panel serves a pick as it was stored, deleted
 * products included, and sends it back on the next save: refusing those would make a list the
 * owner was just served impossible to reorder, with a message blaming another shop. A product that
 * exists and is another shop's is the only refusal, and the caller says which one it is.
 */
export async function keptPicks(
  prisma: PrismaService,
  storeId: string,
  picks: readonly ShowcaseProduct[],
  refusal: () => Error,
): Promise<ShowcaseProduct[]> {
  if (!picks.length) return [];

  const found = await prisma.product.findMany({
    where: { id: { in: picks.map((row) => row.productId) } },
    select: { id: true, storeId: true },
  });

  if (found.some((product) => product.storeId !== storeId)) throw refusal();

  const existing = new Set(found.map((product) => product.id));
  return picks.filter((row) => existing.has(row.productId));
}
