// Nest
import { ConflictException, Injectable } from '@nestjs/common';

// Types
import type { CreateOrderItemInput, OrderFulfillment, OrderShippingChangedDetails, OrderShippingChoice, OrderShippingUnavailableDetails, ShippingCarrier, ShippingQuote, ShippingWindow } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { DeliveryService } from '../delivery/delivery.service.js';
import { pricedCartOf, ShippingQuotes, type PricedCart } from '../delivery/shipping-quote.service.js';
import { deliveryColumnsOf } from './order-delivery.js';
import { readOrderLines } from './order-lines.js';
import { priceOrder } from './order-pricing.js';
import { orderError } from './orders.constants.js';

/** What a delivery costs and when it arrives, as the quote gives it for the way the order goes by. */
export interface DeliveryTerms {
  /** Null: agreed with the shop after the order. */
  deliveryFeeCents: number | null;
  window: ShippingWindow | null;
  /** Whose service brings it (BEELINK-186); null on the shop's own delivery. */
  carrier: ShippingCarrier | null;
}

const AGREED_LATER: DeliveryTerms = { deliveryFeeCents: null, window: null, carrier: null };

/**
 * The terms of the way a delivery goes by, read from the quote: the carrier's service chosen
 * (BEELINK-186), else the shop's own delivery. Null when the quote does not offer that way to the
 * address — past the shop's last band, switched off, or a service that no longer takes the cart.
 */
export function deliveryTermsOf(quote: ShippingQuote, choice: OrderShippingChoice | undefined): DeliveryTerms | null {
  const option =
    choice?.kind === 'CARRIER'
      ? quote.options.find((each) => each.kind === 'CARRIER' && each.carrier?.serviceId === choice.serviceId)
      : quote.options.find((each) => each.kind === 'OWN_DELIVERY');
  return option ? { deliveryFeeCents: option.feeCents, window: option.window, carrier: option.carrier } : null;
}

function shippingUnavailable(message: string, details: OrderShippingUnavailableDetails): ConflictException {
  return new ConflictException({ ...orderError('ORDER_SHIPPING_UNAVAILABLE', message), details });
}

/**
 * How a customer's order leaves the shop (BEELINK-178): the shop's ways to get the cart to one of
 * their saved addresses, for the checkout to show, and the fee, the window and the carrier
 * (BEELINK-186) the order is written with. Decided before the order's transaction — placing an
 * address on the map and asking Melhor Envio are calls to third parties, and the transaction holds
 * the shop's row.
 */
@Injectable()
export class OrderShipping {
  constructor(
    private readonly prisma: PrismaService,
    private readonly delivery: DeliveryService,
    private readonly quotes: ShippingQuotes,
  ) {}

  /**
   * The quote to the address chosen, else the customer's default. Null when there is nowhere to quote
   * to — no such address, or one with no street and city, which an order refuses in its own words —
   * and for an address with no CEP, the one thing a place on the map and a carrier both start from.
   */
  async quoteFor(storeId: string, customerId: string, addressId: string | null, cart: PricedCart): Promise<ShippingQuote | null> {
    const customer = await this.prisma.customer.findUniqueOrThrow({
      where: { id: customerId },
      select: { name: true, addresses: { where: addressId ? { id: addressId } : { isDefault: true }, take: 1 } },
    });
    const address = customer.addresses[0];
    const to = address ? deliveryColumnsOf({ ...address, name: address.recipientName ?? customer.name }) : null;
    if (!to?.deliveryZipCode) return null;

    return this.quotes.forCart(storeId, { zipCode: to.deliveryZipCode, street: to.deliveryStreet, number: to.deliveryNumber, neighborhood: to.deliveryNeighborhood, city: to.deliveryCity, state: to.deliveryState }, cart);
  }

  /**
   * The terms an order is placed with, quoted again now. A pick-up the shop does not offer, or a
   * delivery it does not make to that address, refuses the order; so does a fee that is not the one
   * the customer was shown — the order is never placed at another price.
   */
  async forPlacement(input: {
    storeId: string;
    customerId: string;
    fulfillment: OrderFulfillment;
    addressId: string | null;
    items: readonly CreateOrderItemInput[];
    choice: OrderShippingChoice | undefined;
    shownFeeCents: number | null | undefined;
  }): Promise<DeliveryTerms> {
    const { storeId, customerId } = input;
    if (input.fulfillment === 'PICKUP') {
      const rules = await this.delivery.forStore(storeId);
      if (!rules.pickupEnabled) throw shippingUnavailable('The shop does not hand orders over at its counter', {});
      return AGREED_LATER;
    }

    const lines = await readOrderLines(this.prisma, storeId, input.items, true);
    // Without the lock and the coupon: only what the products cost after promotions is read from it.
    const priced = await priceOrder(this.prisma, { storeId, lines, fulfillment: 'DELIVERY', deliveryFeeCents: null, manualDiscountCents: 0, couponCode: null, customer: { id: customerId }, at: new Date(), lock: false });
    const quote = await this.quoteFor(storeId, customerId, input.addressId, pricedCartOf(lines, priced));
    // Nowhere to quote to: the order's own transaction says which address is missing.
    if (!quote) return AGREED_LATER;

    const terms = deliveryTermsOf(quote, input.choice);
    if (!terms) throw shippingUnavailable('The shop does not deliver to that address that way', { ownDelivery: quote.ownDelivery, carriers: quote.carriers });
    if (input.shownFeeCents !== undefined && input.shownFeeCents !== terms.deliveryFeeCents) {
      const details: OrderShippingChangedDetails = { deliveryFeeCents: terms.deliveryFeeCents };
      throw new ConflictException({ ...orderError('ORDER_SHIPPING_CHANGED', 'The delivery fee is not the one the quote showed'), details });
    }
    return terms;
  }
}
