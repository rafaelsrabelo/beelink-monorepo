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
import { priceOrder, type PricingInput } from './order-pricing.js';
import { orderError } from './orders.constants.js';

type QuoteInput = Omit<PricingInput, 'lines' | 'lockCoupon'> & { items: readonly CreateOrderItemInput[]; onSaleOnly: boolean };

/**
 * What a cart would cost as an order (BEELINK-191), at each of the three doors: the visitor's cart,
 * the signed-in customer's checkout and the panel's sale. Nothing is reserved, the stock is not
 * checked, no coupon is used and no lock is taken — over the same `priceOrder` a placement writes
 * with. The one row it may write is the shopper's own record at the shop, as any of their reads does.
 */
@Injectable()
export class OrderQuotes {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
    private readonly customers: CustomersService,
  ) {}

  /** The visitor's cart with the shop's promotions. No coupon: this door would tell anyone which codes exist. */
  async forCart(storeSlug: string, dto: CartQuoteDto): Promise<OrderQuote> {
    const storeId = await this.stores.publicStoreId(storeSlug);
    return this.quote({ storeId, items: dto.items, onSaleOnly: true, fulfillment: dto.fulfillment ?? 'DELIVERY', deliveryFeeCents: null, manualDiscountCents: 0, couponCode: null, customerId: null, at: new Date() });
  }

  /** The customer's cart as their order would be priced, with the coupon they typed held against their own uses. */
  async forCustomer(storeSlug: string, userId: string, dto: CustomerOrderQuoteDto): Promise<OrderQuote> {
    const { storeId, customerId } = await this.customers.shopperAt(storeSlug, userId);
    return this.quote({ storeId, items: dto.items, onSaleOnly: true, fulfillment: dto.fulfillment, deliveryFeeCents: null, manualDiscountCents: 0, couponCode: dto.couponCode ?? null, customerId, at: new Date() });
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
      customerId: dto.customer ? await this.knownCustomer(storeId, dto.customer) : null,
      at: placedAtOf(dto.placedAt),
    });
  }

  private async quote({ items, onSaleOnly, ...input }: QuoteInput): Promise<OrderQuote> {
    const lines = await readOrderLines(this.prisma, input.storeId, items, onSaleOnly);
    const priced = await priceOrder(this.prisma, { ...input, lines, lockCoupon: false });

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
      coupon: priced.verdict,
      couponDiscountCents: priced.couponDiscountCents,
      manualDiscountCents: priced.manualDiscountCents,
      discountCents: priced.totals.discountCents,
      deliveryFeeCents: priced.totals.deliveryFeeCents,
      totalCents: priced.totals.totalCents,
    } satisfies OrderQuote;
  }

  /**
   * The customer a sale is for, when the shop already has them: by id, or by the phone the order
   * would find them by. One to be registered with the order has used no coupon yet — and a quote
   * registers nobody.
   */
  private async knownCustomer(storeId: string, input: OrderCustomerDto): Promise<string | null> {
    if (input.id) {
      const known = await this.prisma.customer.findFirst({ where: { id: input.id, storeId }, select: { id: true } });
      if (!known) throw new BadRequestException(orderError('ORDER_CUSTOMER_NOT_FOUND', 'No such customer in this shop'));
      return known.id;
    }
    if (!input.phone) return null;
    const byPhone = await this.prisma.customer.findUnique({ where: { storeId_phone: { storeId, phone: input.phone } }, select: { id: true } });
    return byPhone?.id ?? null;
  }
}
