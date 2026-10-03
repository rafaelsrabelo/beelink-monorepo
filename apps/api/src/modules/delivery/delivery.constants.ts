// Types
import type { DeliveryErrorCode, DeliverySettings } from '@harness-monorepo/contracts';

/**
 * What a shop that never saved its rules reads (BEELINK-175): what the checkout offered before there
 * were rules — pickup, and a delivery whose fee is agreed afterwards — and no carrier, which takes the
 * shopkeeper connecting an account first.
 */
export const DELIVERY_DEFAULTS = {
  pickupEnabled: true,
  ownDeliveryEnabled: true,
  bands: [],
  radiusMeters: null,
  freeAboveCents: null,
  carriersEnabled: false,
  updatedAt: null,
} as const satisfies DeliverySettings;

export const DELIVERY_BANDS_MAX = 10;
/** 200 km: past it, a shop's own delivery is a carrier's job. The migration's CHECK repeats it. */
export const DELIVERY_REACH_MAX_METERS = 200_000;
/** A week. */
export const DELIVERY_WINDOW_MAX_MINUTES = 7 * 24 * 60;
/** R$ 1.000.000,00, the cap an order's own amounts have. */
export const DELIVERY_AMOUNT_MAX_CENTS = 100_000_000;

export function deliveryError(errorCode: DeliveryErrorCode, message: string): { errorCode: DeliveryErrorCode; message: string } {
  return { errorCode, message };
}
