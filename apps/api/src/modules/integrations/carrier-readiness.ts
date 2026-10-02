// Types
import type { CarrierGap } from '@harness-monorepo/contracts';

/** What a carrier measures of one variant: grams and millimetres, each possibly not given. */
export interface VariantParcel {
  weightGrams: number | null;
  lengthMm: number | null;
  widthMm: number | null;
  heightMm: number | null;
}

/**
 * Whether a carrier can quote a product, from its active variants (BEELINK-184): any of them with no
 * weight cannot be quoted — the customer may pick that one — and any with no size needs the shop's
 * default parcel. Null when nothing is missing. The one reading of it: the panel's list says it, and
 * the quote (N4) leaves the carriers out by it.
 */
export function carrierGapOf(variants: readonly VariantParcel[], hasDefaultPackage: boolean): CarrierGap | null {
  if (variants.some((variant) => variant.weightGrams === null || variant.weightGrams <= 0)) return 'NO_WEIGHT';
  const sized = (variant: VariantParcel) => [variant.lengthMm, variant.widthMm, variant.heightMm].every((size) => size !== null && size > 0);
  if (!hasDefaultPackage && variants.some((variant) => !sized(variant))) return 'NO_SIZE';
  return null;
}
