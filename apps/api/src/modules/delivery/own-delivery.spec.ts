// Types
import type { DeliverySettings } from '@harness-monorepo/contracts';

// App
import { distanceMeters } from './distance.js';
import { ownDeliveryOf, pickupOf } from './own-delivery.js';

const SHOP = { latitude: -23.5614, longitude: -46.6559 };
/** About 2.6 km from the shop, and about 10.8 km. */
const NEAR = { latitude: -23.5505, longitude: -46.6333 };
const FAR = { latitude: -23.6500, longitude: -46.7000 };

const rules: DeliverySettings = {
  pickupEnabled: true,
  ownDeliveryEnabled: true,
  bands: [
    { upToMeters: 3000, feeCents: 500, windowFromMinutes: 30, windowToMinutes: 50 },
    { upToMeters: 8000, feeCents: 900, windowFromMinutes: 40, windowToMinutes: 70 },
  ],
  radiusMeters: 8000,
  freeAboveCents: 15000,
  carriersEnabled: false,
  updatedAt: null,
};

describe('the distance between two points', () => {
  it('is a degree of longitude on the equator, and nothing between a point and itself', () => {
    expect(distanceMeters({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 })).toBe(111195);
    expect(distanceMeters(SHOP, SHOP)).toBe(0);
  });

  it('is the same either way', () => {
    expect(distanceMeters(SHOP, FAR)).toBe(distanceMeters(FAR, SHOP));
  });
});

describe("the shop's own delivery to an address (BEELINK-176)", () => {
  it('charges the first band that reaches the address, with its window', () => {
    const read = ownDeliveryOf(rules, SHOP, NEAR, 5000);

    expect(read.verdict).toEqual({ status: 'QUOTED', distanceMeters: distanceMeters(SHOP, NEAR) });
    expect(read.option).toEqual({ kind: 'OWN_DELIVERY', feeCents: 500, window: { unit: 'MINUTES', from: 30, to: 50 }, freeAbove: false });
  });

  it('waives the fee once the products reach the free-delivery amount, and says why', () => {
    expect(ownDeliveryOf(rules, SHOP, NEAR, 15000).option).toMatchObject({ feeCents: 0, freeAbove: true });
    expect(ownDeliveryOf(rules, SHOP, NEAR, 14999).option).toMatchObject({ feeCents: 500, freeAbove: false });
  });

  it('does not credit the amount for a band that is free already', () => {
    const freeBand = { ...rules, bands: [{ ...rules.bands[0]!, feeCents: 0 }] };
    expect(ownDeliveryOf(freeBand, SHOP, NEAR, 20000).option).toMatchObject({ feeCents: 0, freeAbove: false });
  });

  it('leaves the list past the last band, saying how far the address is and how far the shop goes', () => {
    const read = ownDeliveryOf(rules, SHOP, FAR, 50000);

    expect(read.option).toBeNull();
    expect(read.verdict).toEqual({ status: 'OUT_OF_RANGE', distanceMeters: distanceMeters(SHOP, FAR), radiusMeters: 8000 });
  });

  it('agrees the fee later with no band — free above the amount still holds, since the shop delivers anywhere', () => {
    const noBands = { ...rules, bands: [], radiusMeters: null };

    expect(ownDeliveryOf(noBands, SHOP, NEAR, 5000)).toEqual({ verdict: { status: 'AGREE_LATER', reason: 'NO_BANDS' }, option: { kind: 'OWN_DELIVERY', feeCents: null, window: null, freeAbove: false } });
    expect(ownDeliveryOf(noBands, null, null, 15000).option).toMatchObject({ feeCents: 0, freeAbove: true });
  });

  it('agrees the fee later, never free, when the shop or the address is off the map', () => {
    expect(ownDeliveryOf(rules, null, NEAR, 50000)).toEqual({ verdict: { status: 'AGREE_LATER', reason: 'SHOP_UNPLACED' }, option: { kind: 'OWN_DELIVERY', feeCents: null, window: null, freeAbove: false } });
    expect(ownDeliveryOf(rules, SHOP, null, 50000).verdict).toEqual({ status: 'AGREE_LATER', reason: 'ADDRESS_UNPLACED' });
  });

  it('is no option while switched off, and pickup is one while on', () => {
    expect(ownDeliveryOf({ ...rules, ownDeliveryEnabled: false }, SHOP, NEAR, 5000)).toEqual({ verdict: { status: 'OFF' }, option: null });
    expect(pickupOf(rules)).toEqual({ kind: 'PICKUP', feeCents: 0, window: null, freeAbove: false });
    expect(pickupOf({ ...rules, pickupEnabled: false })).toBeNull();
  });
});
