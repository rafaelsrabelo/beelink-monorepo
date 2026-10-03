/**
 * How a shop gets an order to its customer (docs/plans BEELINK-175): picked up at the shop, brought
 * by the shop itself within the distance bands it sets, or sent by carrier through its own Melhor
 * Envio account. Each is switched on or off apart, and a shop combines the ones it wants. Money is
 * whole cents, distance whole metres, a window whole minutes.
 */

/**
 * One step of the shop's own delivery: an address up to `upToMeters` away, in a straight line from
 * the shop, pays `feeCents` and arrives within the window. Bands are ordered, each reaching further
 * than the one before; the last one is the shop's radius.
 */
export interface DeliveryBand {
  upToMeters: number;
  /** Zero is a free delivery within this band. */
  feeCents: number;
  /** From when the order leaves, the window it arrives in: `windowFromMinutes ≤ windowToMinutes`. */
  windowFromMinutes: number;
  windowToMinutes: number;
}

/** The shop's rules, as the panel's Delivery tab edits them. A shop that never saved them reads the defaults. */
export interface DeliverySettings {
  /** The customer collects the order at the shop's address. */
  pickupEnabled: boolean;
  /** The shop brings the order itself. With no bands, it delivers and the fee is agreed afterwards. */
  ownDeliveryEnabled: boolean;
  /** Up to 10, ordered by `upToMeters`. Empty: no fee is quoted for the shop's own delivery. */
  bands: DeliveryBand[];
  /** The last band's reach, which is how far the shop delivers; null with no bands. */
  radiusMeters: number | null;
  /** The products' subtotal from which the shop's own delivery is free; null never is. */
  freeAboveCents: number | null;
  /**
   * The shop sells by carrier. Quoted only with its Melhor Envio account connected too — on and
   * disconnected offers nothing, and so does connected and off.
   */
  carriersEnabled: boolean;
  /** ISO-8601; null until the owner first saves them. */
  updatedAt: string | null;
}

/** What `PUT /stores/:slug/delivery` takes: the whole of the rules. The radius follows from the bands. */
export type DeliverySettingsPayload = Omit<DeliverySettings, "radiusMeters" | "updatedAt">;

export type DeliveryErrorCode =
  /** A value out of its range, a band that does not reach further than the one before, or a window that ends before it starts. */
  "DELIVERY_SETTINGS_INVALID";
