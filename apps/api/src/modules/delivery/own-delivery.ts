// Types
import type { DeliverySettings, OwnDeliveryVerdict, ShippingOption } from '@harness-monorepo/contracts';

// App
import { distanceMeters, type GeoPoint } from './distance.js';

/** The shop's own delivery to one address: the verdict, and the option the checkout lists — none when it does not deliver there. */
export interface OwnDeliveryRead {
  verdict: OwnDeliveryVerdict;
  option: ShippingOption | null;
}

const agreeLater = (reason: Extract<OwnDeliveryVerdict, { status: 'AGREE_LATER' }>['reason'], free: boolean): OwnDeliveryRead => ({
  verdict: { status: 'AGREE_LATER', reason },
  option: { kind: 'OWN_DELIVERY', carrier: null, feeCents: free ? 0 : null, window: null, freeAbove: free },
});

/**
 * What the shop's own delivery costs to an address (BEELINK-176): the first band that reaches it, or
 * free once the products reach the shop's amount — never a price or a window the shop did not set.
 * With nothing to measure — no band, the shop or the address off the map — the fee is agreed after the
 * order, as it was before there were bands. A free delivery holds where the shop delivers whatever the
 * distance (no band), or within a band; without a point to measure from, nobody knows the address is
 * in range, and it is not promised free.
 */
export function ownDeliveryOf(rules: DeliverySettings, shop: GeoPoint | null, destination: GeoPoint | null, productsCents: number): OwnDeliveryRead {
  if (!rules.ownDeliveryEnabled) return { verdict: { status: 'OFF' }, option: null };

  const free = rules.freeAboveCents !== null && productsCents >= rules.freeAboveCents;
  if (rules.bands.length === 0) return agreeLater('NO_BANDS', free);
  if (!shop) return agreeLater('SHOP_UNPLACED', false);
  if (!destination) return agreeLater('ADDRESS_UNPLACED', false);

  const distance = distanceMeters(shop, destination);
  const band = rules.bands.find((each) => distance <= each.upToMeters);
  if (!band) return { verdict: { status: 'OUT_OF_RANGE', distanceMeters: distance, radiusMeters: rules.bands.at(-1)!.upToMeters }, option: null };

  // A band that is free already owes nothing to the amount.
  const waived = free && band.feeCents > 0;
  return {
    verdict: { status: 'QUOTED', distanceMeters: distance },
    option: { kind: 'OWN_DELIVERY', carrier: null, feeCents: waived ? 0 : band.feeCents, window: { unit: 'MINUTES', from: band.windowFromMinutes, to: band.windowToMinutes }, freeAbove: waived },
  };
}

/** Pickup at the shop, when it offers it: nothing to pay, nothing to wait for on the road. */
export function pickupOf(rules: DeliverySettings): ShippingOption | null {
  return rules.pickupEnabled ? { kind: 'PICKUP', carrier: null, feeCents: 0, window: null, freeAbove: false } : null;
}
