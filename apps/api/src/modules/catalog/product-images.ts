// Nest
import { NotFoundException } from '@nestjs/common';

// Types
import type { ProductImagePayload } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';

// App
import { catalogError } from './catalog-slug.service.js';

type Db = Prisma.TransactionClient;

/** Each photo's values once: the pair is the join row's key, and a repeat would be a 500. */
function valueIdsOf(image: ProductImagePayload): string[] {
  return [...new Set(image.optionValueIds ?? [])];
}

/** The rows a write stores for a product's photos, in the order they were sent, with their values. */
export function imageRows(images: readonly ProductImagePayload[] | undefined) {
  return (images ?? []).map((image, position) => ({
    url: image.url,
    alt: image.alt ?? null,
    position,
    values: { create: valueIdsOf(image).map((valueId) => ({ valueId })) },
  }));
}

/**
 * Every value a photo names is a value of this product's own options. The join row's keys cannot
 * say so — a value is a value of some product — and a photo tied to another product's value would
 * be shown for combinations this product never has.
 *
 * `productId` is null while the product is being created: it has no options yet, so any value is
 * foreign.
 */
export async function refuseForeignImageValues(
  tx: Db,
  productId: string | null,
  images: readonly ProductImagePayload[] | undefined,
): Promise<void> {
  const sent = [...new Set((images ?? []).flatMap(valueIdsOf))];
  if (sent.length === 0) return;

  const known = productId
    ? await tx.productOptionValue.count({ where: { id: { in: sent }, option: { productId } } })
    : 0;

  if (known !== sent.length) {
    throw new NotFoundException(
      catalogError('PRODUCT_OPTION_NOT_FOUND', 'A photo names a value that is not one of this product’s options'),
    );
  }
}
