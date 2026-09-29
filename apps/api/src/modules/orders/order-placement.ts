// Nest
import { BadRequestException, Injectable } from '@nestjs/common';

// Types
import type {
  CreateOrderItemInput,
  OrderActor,
  OrderFulfillment,
  OrderStatus,
  OrderVariantInvalidDetails,
  PaymentMethod,
} from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { noteOrderStatus } from '../conversations/order-status-notice.js';
import { refreshBooks } from '../customers/customer-books.js';
import { deliveryOf } from './order-delivery.js';
import { takeStock } from './order-stock.js';
import { totalsOf, variantLabelOf } from './order-totals.js';
import { orderError } from './orders.constants.js';
import { ORDER_INCLUDE } from './orders.mapper.js';

type Tx = Prisma.TransactionClient;

/** Everything an order is placed with, whoever places it. */
export interface Placement {
  storeId: string;
  items: readonly CreateOrderItemInput[];
  fulfillment: OrderFulfillment;
  /** The customer's saved address a delivery goes to; null is their default. */
  addressId: string | null;
  paymentMethod: PaymentMethod;
  deliveryFeeCents: number;
  discountCents: number;
  note: string | null;
  placedAt: Date;
  /** The shopkeeper registers a sale they already agreed, `ACCEPTED`; a customer's order waits, `RECEIVED`. */
  status: Extract<OrderStatus, 'RECEIVED' | 'ACCEPTED'>;
  actor: Extract<OrderActor, 'SHOPKEEPER' | 'CUSTOMER'>;
  /** The account behind it. */
  userId: string;
  /**
   * Only what the shop window sells: a product put back in draft is off sale to a shopper. The
   * shopkeeper may still register a sale of one of their own drafts.
   */
  onSaleOnly: boolean;
  /** Who it is for, inside the transaction: a customer registered with the order goes back with a refusal. */
  customerOf: (tx: Tx) => Promise<string>;
}

export type PlacedOrderRow = Prisma.OrderGetPayload<{ include: typeof ORDER_INCLUDE }>;

/**
 * Writing an order — the panel's and the cart's alike, so both refuse the same things.
 *
 * One transaction first bumps the shop's order counter, which holds the shop's row until the
 * commit: two orders placed at once wait for each other, get consecutive numbers, and see each
 * other's effect on a customer's books and on the stock. A refusal anywhere inside takes the number,
 * the stock and a customer registered with it back together.
 */
@Injectable()
export class OrderPlacement {
  constructor(private readonly prisma: PrismaService) {}

  async place(placement: Placement): Promise<PlacedOrderRow> {
    const { storeId, status, actor, userId } = placement;
    const store = await this.prisma.store.findUniqueOrThrow({ where: { id: storeId }, select: { paymentMethods: true } });
    if (!store.paymentMethods.includes(placement.paymentMethod)) {
      throw new BadRequestException(orderError('ORDER_PAYMENT_NOT_ACCEPTED', 'The shop does not take that payment'));
    }

    const lines = await this.linesOf(storeId, placement.items, placement.onSaleOnly);
    const totals = totalsOf(lines, placement.fulfillment, placement.deliveryFeeCents, placement.discountCents);
    if (totals === 'DISCOUNT_TOO_LARGE') {
      throw new BadRequestException(orderError('ORDER_DISCOUNT_TOO_LARGE', 'The discount is larger than the order'));
    }
    if (totals === 'TOTAL_TOO_LARGE') {
      throw new BadRequestException(orderError('ORDER_TOTAL_TOO_LARGE', 'A line or the order is past what one order may be'));
    }

    return this.prisma.$transaction(async (tx) => {
      const number = await this.nextNumber(tx, storeId);
      // Before the order is written: a line the stock cannot cover refuses the whole order.
      await takeStock(tx, lines);
      const customerId = await placement.customerOf(tx);
      const delivery = await deliveryOf(tx, customerId, placement.fulfillment, placement.addressId);

      const order = await tx.order.create({
        data: {
          storeId,
          number,
          customerId,
          status,
          fulfillment: placement.fulfillment,
          paymentMethod: placement.paymentMethod,
          ...delivery,
          ...totals,
          note: placement.note,
          placedAt: placement.placedAt,
          stockTaken: true,
          items: {
            create: lines.map((line, position) => ({ ...line, lineTotalCents: line.unitPriceCents * line.quantity, position })),
          },
          events: { create: { status, actor, userId } },
        },
        include: ORDER_INCLUDE,
      });

      await refreshBooks(tx, customerId);
      // The conversation is born with the order, its first status the first line. Told now, whatever
      // day the shopkeeper dated the sale; not news to a customer who placed it themselves.
      await noteOrderStatus(tx, { order: { id: order.id, customerId }, status, at: new Date(), seen: actor === 'CUSTOMER' });
      return order;
    });
  }

  /**
   * The shop's next order number, taken under the lock of the shop's row until the commit. Raw SQL
   * so the shop's `updatedAt` stays the shopkeeper's: an order is not an edit of the shop.
   */
  private async nextNumber(tx: Tx, storeId: string): Promise<number> {
    const [row] = await tx.$queryRaw<{ orderSequence: number }[]>`
      UPDATE "stores" SET "orderSequence" = "orderSequence" + 1 WHERE "id" = ${storeId}::uuid RETURNING "orderSequence"`;
    return row!.orderSequence;
  }

  /** The lines as they will be photographed: each variant read from this shop, and priced by it. */
  private async linesOf(storeId: string, items: readonly CreateOrderItemInput[], onSaleOnly: boolean) {
    const ids = items.map((item) => item.variantId);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException(orderError('ORDER_ITEM_DUPLICATE', 'A variant appears on two lines'));
    }

    const variants = await this.prisma.productVariant.findMany({
      // Another shop's, a combination that stopped existing and one not sold are all the same refusal.
      where: { id: { in: ids }, storeId, archivedAt: null, isActive: true, ...(onSaleOnly ? { product: { status: 'ACTIVE' } } : {}) },
      select: {
        id: true,
        productId: true,
        priceCents: true,
        sku: true,
        product: { select: { name: true } },
        values: { select: { option: { select: { name: true, position: true } }, value: { select: { name: true } } } },
      },
    });
    if (variants.length !== ids.length) {
      const found = new Set(variants.map((variant) => variant.id));
      // Every line that cannot be sold, so a cart can say which of its products left the shop.
      throw new BadRequestException({
        ...orderError('ORDER_VARIANT_INVALID', 'A variant is not one this shop sells'),
        details: { variantIds: ids.filter((id) => !found.has(id)) } satisfies OrderVariantInvalidDetails,
      });
    }

    const byId = new Map(variants.map((variant) => [variant.id, variant]));
    return items.map((item) => {
      const variant = byId.get(item.variantId)!;
      return {
        productId: variant.productId,
        variantId: variant.id,
        productName: variant.product.name,
        variantLabel: variantLabelOf(
          variant.values.map((chosen) => ({
            optionName: chosen.option.name,
            optionPosition: chosen.option.position,
            valueName: chosen.value.name,
          })),
        ),
        sku: variant.sku,
        unitPriceCents: variant.priceCents,
        quantity: item.quantity,
      };
    });
  }
}
