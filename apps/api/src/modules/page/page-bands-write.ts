// Types
import type { Prisma } from '../../generated/prisma/client.js';
import type { SeededBand } from './page-seed.js';

/**
 * A page's opening bands, written in order: a new shop's home, a landing made from a template.
 *
 * A component carries its shop's id beside its band's, so each band is written after the page exists
 * rather than nested inside its create; the caller's transaction holds them together.
 */
export async function writeBands(
  tx: Prisma.TransactionClient,
  storeId: string,
  pageId: string,
  bands: readonly SeededBand[],
): Promise<void> {
  for (const band of bands) {
    await tx.storeSection.create({
      data: {
        storeId,
        pageId,
        ...band.section,
        components: { create: band.components.map((component) => ({ storeId, ...component })) },
      },
    });
  }
}
