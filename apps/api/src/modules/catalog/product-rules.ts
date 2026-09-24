// Nest
import { BadRequestException, ConflictException } from '@nestjs/common';

// App
import { catalogError } from './catalog-slug.service.js';

/**
 * The rules a product and each of its variants share, stated once: the product's own fields are a
 * cache of its variants, and the two must refuse the same things.
 */

/**
 * The model whose unique index refused a write, or null when the error is something else. A product
 * write can trip two: the slug on Product, and the SKU on ProductVariant — including through a
 * nested create, which Prisma still reports under the variant.
 */
export function uniqueViolationOn(error: unknown): string | null {
  if (typeof error !== 'object' || error === null || !('code' in error) || error.code !== 'P2002') return null;

  const meta = 'meta' in error ? (error.meta as { modelName?: unknown } | undefined) : undefined;
  return typeof meta?.modelName === 'string' ? meta.modelName : null;
}

/**
 * A "was" price at or below the price is not a discount, it is a number that makes the storefront
 * render a negative percentage. Refused here rather than in the DTO because it is a rule about
 * two fields, and on update one of them may be the stored value rather than one that was sent.
 */
export function assertPrices(priceCents: number, compareAtPriceCents: number | null): void {
  if (compareAtPriceCents !== null && compareAtPriceCents <= priceCents) {
    throw new BadRequestException(
      catalogError(
        'CATALOG_PRICE_INVALID',
        'compareAtPriceCents must be above priceCents, or absent when there is no discount',
      ),
    );
  }
}

/**
 * All three sides or none.
 *
 * A carrier quotes on a box, and a box with two of its three sides is not a box. Refusing it
 * here is what stops the shape reaching Melhor Envio in phase 4 and being refused there — where
 * the message is about their API and arrives while a customer is waiting at a checkout.
 */
export function assertParcel(length: number | null, width: number | null, height: number | null): void {
  const given = [length, width, height].filter((side) => side !== null).length;
  if (given !== 0 && given !== 3) {
    throw new BadRequestException(
      catalogError(
        'CATALOG_PARCEL_INCOMPLETE',
        'Send all three of lengthMm, widthMm and heightMm, or none of them',
      ),
    );
  }
}

/** A code another variant of the shop already carries. */
export function skuTaken(): ConflictException {
  return new ConflictException(
    catalogError('PRODUCT_SKU_TAKEN', 'Another product of this shop already uses this SKU'),
  );
}
