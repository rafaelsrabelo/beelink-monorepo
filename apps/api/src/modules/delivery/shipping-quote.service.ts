// Nest
import { Injectable } from '@nestjs/common';

// Types
import type { ShippingDestination, ShippingOption, ShippingQuote, ShippingQuotePayload } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { CarrierQuotes, type CarrierCartItem, type CarrierQuoteRead } from '../integrations/melhor-envio/carrier-quote.service.js';
import { readOrderLines } from '../orders/order-lines.js';
import { priceOrder } from '../orders/order-pricing.js';
import { StoresService } from '../stores/stores.service.js';
import { DeliveryService } from './delivery.service.js';
import { DestinationGeocoder, type Destination } from './destination-geocoder.js';
import type { GeoPoint } from './distance.js';
import { ownDeliveryOf, pickupOf } from './own-delivery.js';

function destinationOf(input: ShippingDestination): Destination {
  const text = (value: string | null | undefined) => value?.trim() || null;
  return {
    zipCode: input.zipCode.replace(/\D/g, ''),
    street: text(input.street),
    number: text(input.number),
    neighborhood: text(input.neighborhood),
    city: text(input.city),
    state: text(input.state)?.toUpperCase() ?? null,
  };
}

/** The cart as the shop prices it: the products after promotions, and each line as a carrier insures it. */
interface PricedCart {
  productsCents: number;
  items: CarrierCartItem[];
}

const NO_CARRIERS: CarrierQuoteRead = { verdict: { status: 'OFF' }, options: [] };

/**
 * What a shop offers to get a cart to an address (BEELINK-176), at its two doors: the shop window's —
 * the checkout and the product page — and the panel's, which registers sales of drafts too. The
 * products are priced here, never taken from the page; the address is placed on the map only when a
 * band needs the distance; and the carriers (BEELINK-185) are asked at the same time, only of a shop
 * that switched them on.
 */
@Injectable()
export class ShippingQuotes {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
    private readonly delivery: DeliveryService,
    private readonly geocoder: DestinationGeocoder,
    private readonly carriers: CarrierQuotes,
  ) {}

  async forShopWindow(storeSlug: string, payload: ShippingQuotePayload): Promise<ShippingQuote> {
    return this.quote(await this.stores.publicStoreId(storeSlug), payload, true);
  }

  async forPanel(storeSlug: string, userId: string, payload: ShippingQuotePayload): Promise<ShippingQuote> {
    return this.quote(await this.stores.ownedStoreId(storeSlug, userId), payload, false);
  }

  private async quote(storeId: string, payload: ShippingQuotePayload, onSaleOnly: boolean): Promise<ShippingQuote> {
    const [rules, shop, cart] = await Promise.all([this.delivery.forStore(storeId), this.shopPoint(storeId), this.pricedCart(storeId, payload, onSaleOnly)]);
    const destination = destinationOf(payload.destination);
    const measured = rules.ownDeliveryEnabled && rules.bands.length > 0 && shop !== null;

    const [point, carriers] = await Promise.all([
      measured ? this.geocoder.locate(destination) : null,
      rules.carriersEnabled ? this.carriers.forCart(storeId, destination.zipCode, cart.items) : NO_CARRIERS,
    ]);

    const own = ownDeliveryOf(rules, shop, point, cart.productsCents);
    const options = [own.option, ...carriers.options, pickupOf(rules)].filter((option): option is ShippingOption => option !== null);
    return { options, ownDelivery: own.verdict, carriers: carriers.verdict, productsCents: cart.productsCents };
  }

  private async shopPoint(storeId: string): Promise<GeoPoint | null> {
    const row = await this.prisma.store.findUniqueOrThrow({ where: { id: storeId }, select: { latitude: true, longitude: true } });
    return row.latitude !== null && row.longitude !== null ? { latitude: row.latitude.toNumber(), longitude: row.longitude.toNumber() } : null;
  }

  /**
   * The cart after the shop's promotions, as the cart page reads it: the products' total is what a
   * free delivery is measured against, and each line's paid unit is what a carrier insures.
   */
  private async pricedCart(storeId: string, payload: ShippingQuotePayload, onSaleOnly: boolean): Promise<PricedCart> {
    const lines = await readOrderLines(this.prisma, storeId, payload.items, onSaleOnly);
    const priced = await priceOrder(this.prisma, { storeId, lines, fulfillment: 'DELIVERY', deliveryFeeCents: null, manualDiscountCents: 0, couponCode: null, customer: null, at: new Date(), lock: false });
    const items = lines.map((line, index) => {
      const paidCents = line.unitPriceCents * line.quantity - priced.lineDiscounts[index]!.discountCents;
      return { variantId: line.variantId, quantity: line.quantity, unitValueCents: Math.round(paidCents / line.quantity) };
    });
    return { productsCents: priced.totals.subtotalCents - priced.promotionDiscountCents, items };
  }
}
