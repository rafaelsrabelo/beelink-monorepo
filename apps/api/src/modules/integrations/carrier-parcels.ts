// Types
import type { CarrierGap } from '@harness-monorepo/contracts';

// App
import { carrierGapOf, type VariantParcel } from './carrier-readiness.js';
import type { MelhorEnvioQuoteProduct } from './melhor-envio/melhor-envio.client.js';

/** One line of a cart as a carrier weighs it: the variant's parcel, how many, and what one is paid for. */
export interface CartParcel extends VariantParcel {
  variantId: string;
  quantity: number;
  /** What the customer pays for one unit, after promotions: the value the carrier insures. */
  unitValueCents: number;
}

/** The three sizes used for a product that has none: the shop's default parcel. */
export interface ParcelSize {
  lengthMm: number;
  widthMm: number;
  heightMm: number;
}

/** A carrier measures whole centimetres, and a parcel a hair over is the next one up. */
const centimetres = (millimetres: number) => Math.max(1, Math.ceil(millimetres / 10));

/**
 * A cart as Melhor Envio quotes it (BEELINK-185) — centimetres, kilograms, reais — or what keeps a
 * carrier from quoting it, by the one rule the panel's product list already says (BEELINK-184). A
 * variant with no size takes the default parcel's three sizes and keeps its own weight, which is
 * weighed with its packaging already.
 */
export function quoteProductsOf(cart: readonly CartParcel[], defaultSize: ParcelSize | null): MelhorEnvioQuoteProduct[] | CarrierGap {
  const gap = carrierGapOf(cart, defaultSize !== null);
  if (gap) return gap;

  return cart.map((line) => {
    const sized = line.lengthMm !== null && line.widthMm !== null && line.heightMm !== null && line.lengthMm > 0 && line.widthMm > 0 && line.heightMm > 0;
    // `carrierGapOf` let through only a variant with its sizes, or a shop with a default parcel.
    const size = sized ? { lengthMm: line.lengthMm!, widthMm: line.widthMm!, heightMm: line.heightMm! } : defaultSize!;
    return {
      id: line.variantId,
      lengthCm: centimetres(size.lengthMm),
      widthCm: centimetres(size.widthMm),
      heightCm: centimetres(size.heightMm),
      weightKg: line.weightGrams! / 1000,
      insuranceReais: line.unitValueCents / 100,
      quantity: line.quantity,
    };
  });
}
