// Nest
import { BadRequestException, Injectable } from '@nestjs/common';

// Types
import type { CreateOrderItemInput, OrderQuote } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { CustomersService } from '../customers/customers.service.js';
import { StoresService } from '../stores/stores.service.js';
import type { OrderCustomerDto } from './dto/order.dto.js';
import type { CartQuoteDto, CustomerOrderQuoteDto, ShopOrderQuoteDto } from './dto/order-quote.dto.js';
import { readOrderLines } from './order-lines.js';
import { placedAtOf } from './order-placed-at.js';
import { earningBaseOf, quotedCashbackOf } from '../cashback/cashback-earning.js';
import { priceOrder, type PricingCustomer, type PricingInput } from './order-pricing.js';
import { orderError } from './orders.constants.js';

type QuoteInput = Omit<PricingInput, 'lines' | 'lock'> & { items: readonly CreateOrderItemInput[]; onSaleOnly: boolean };

/**
 * What a cart would cost as an order (BEELINK-191), at each of the three doors: the visitor's cart,
 * the signed-in customer's — their cart and their checkout — and the panel's sale. Nothing is
 * reserved, the stock is not checked, no coupon is used and no lock is taken — over the same
 * `priceOrder` a placement writes with. The one row it may write is the shopper's own record at the
 * shop, as any of their reads does.
 */
@Injectable()
export class OrderQuotes {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
    private readonly customers: CustomersService,
  ) {}

  /**
   * The visitor's cart with the shop's promotions. No coupon: this door would tell anyone which
   * codes exist. Nobody is identified, so a promotion for a first purchase is announced, not applied.
   */
  async forCart(storeSlug: string, dto: CartQuoteDto): Promise<OrderQuote> {
    const storeId = await this.stores.publicStoreId(storeSlug);
    return this.quote({ storeId, items: dto.items, onSaleOnly: true, fulfillment: dto.fulfillment ?? 'DELIVERY', deliveryFeeCents: null, manualDiscountCents: 0, couponCode: null, customer: null, at: new Date() });
  }

  /**
   * The customer's cart as their order would be priced: a first purchase read from their own
   * orders, and the coupon they typed, when there is one, held against their own uses.
   */
  async forCustomer(storeSlug: string, userId: string, dto: CustomerOrderQuoteDto): Promise<OrderQuote> {
    const { storeId, customerId } = await this.customers.shopperAt(storeSlug, userId);
    return this.quote({ storeId, items: dto.items, onSaleOnly: true, fulfillment: dto.fulfillment, deliveryFeeCents: null, manualDiscountCents: 0, couponCode: dto.couponCode ?? null, customer: { id: customerId }, at: new Date() });
  }

  /** The panel's sale as registering it would price it — drafts included, at the day it was sold. */
  async forShop(storeSlug: string, userId: string, dto: ShopOrderQuoteDto): Promise<OrderQuote> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    return this.quote({
      storeId,
      items: dto.items,
      onSaleOnly: false,
      fulfillment: dto.fulfillment,
      deliveryFeeCents: dto.deliveryFeeCents ?? 0,
      manualDiscountCents: dto.discountCents ?? 0,
      couponCode: dto.couponCode ?? null,
      customer: dto.customer ? await this.customerOf(storeId, dto.customer) : null,
      at: placedAtOf(dto.placedAt),
    });
  }

  private async quote({ items, onSaleOnly, ...input }: QuoteInput): Promise<OrderQuote> {
    const lines = await readOrderLines(this.prisma, input.storeId, items, onSaleOnly);
    const priced = await priceOrder(this.prisma, { ...input, lines, lock: false });
    // What it would earn, worked out as the order would be when placed (BEELINK-243).
    const rules = await this.prisma.cashbackSettings.findUnique({ where: { storeId: input.storeId } });
    const base = earningBaseOf({
      subtotalCents: priced.totals.subtotalCents,
      promotionDiscountCents: priced.promotionDiscountCents,
      couponDiscountCents: priced.couponDiscountCents,
      couponKind: priced.coupon?.kind ?? null,
      manualDiscountCents: priced.manualDiscountCents,
      cashbackUsedCents: 0,
    });

    return {
      lines: lines.map((line, index) => ({
        variantId: line.variantId,
        productId: line.productId,
        quantity: line.quantity,
        unitPriceCents: line.unitPriceCents,
        lineTotalCents: line.unitPriceCents * line.quantity,
        ...priced.lineDiscounts[index]!,
      })),
      subtotalCents: priced.totals.subtotalCents,
      promotionDiscountCents: priced.promotionDiscountCents,
      firstPurchase: priced.firstPurchase,
      coupon: priced.verdict,
      couponDiscountCents: priced.couponDiscountCents,
      manualDiscountCents: priced.manualDiscountCents,
      discountCents: priced.totals.discountCents,
      deliveryFeeCents: priced.totals.deliveryFeeCents,
      totalCents: priced.totals.totalCents,
      cashback: quotedCashbackOf(rules, base),
    } satisfies OrderQuote;
  }

  /**
   * Who a sale is for: the shop's own customer by id, or by the phone the order would find them by.
   * A phone the shop does not have is somebody the order would register — they have used no coupon
   * and placed no order yet, and a quote registers nobody. With neither an id nor a phone, nobody
   * is identified yet.
   */
  private async customerOf(storeId: string, input: OrderCustomerDto): Promise<PricingCustomer | null> {
    if (input.id) {
      const known = await this.prisma.customer.findFirst({ where: { id: input.id, storeId }, select: { id: true } });
      if (!known) throw new BadRequestException(orderError('ORDER_CUSTOMER_NOT_FOUND', 'No such customer in this shop'));
      return known;
    }
    if (!input.phone) return null;
    const byPhone = await this.prisma.customer.findUnique({ where: { storeId_phone: { storeId, phone: input.phone } }, select: { id: true } });
    return { id: byPhone?.id ?? null };
  }
}
