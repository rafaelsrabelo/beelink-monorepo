// Nest
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

// Types
import type { Order, OrderPage } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { StoresService } from '../stores/stores.service.js';
import type { CreateOrderDto, ListOrdersDto, OrderCustomerDto, UpdateOrderStatusDto } from './dto/order.dto.js';
import { totalsOf, variantLabelOf } from './order-totals.js';
import { orderError, ORDERS_PAGE_SIZE, ORDERS_PAGE_SIZE_MAX, PLACED_AT_SKEW_MS } from './orders.constants.js';
import { ORDER_INCLUDE, ORDER_SUMMARY_INCLUDE, toOrder, toOrderSummary } from './orders.mapper.js';

type Tx = Prisma.TransactionClient;

/**
 * A shop's orders, as its owner registers and moves them.
 *
 * Every write runs in one transaction that first bumps the shop's order counter, which holds the
 * shop's row until the commit: two orders placed at once wait for each other, get consecutive
 * numbers, and see each other's effect on a customer's books.
 */
@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
  ) {}

  async create(storeSlug: string, userId: string, dto: CreateOrderDto): Promise<Order> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const store = await this.prisma.store.findUniqueOrThrow({ where: { id: storeId }, select: { paymentMethods: true } });
    if (!store.paymentMethods.includes(dto.paymentMethod)) {
      throw new BadRequestException(orderError('ORDER_PAYMENT_NOT_ACCEPTED', 'The shop does not take that payment'));
    }

    const placedAt = dto.placedAt ? new Date(dto.placedAt) : new Date();
    if (placedAt.getTime() > Date.now() + PLACED_AT_SKEW_MS) {
      throw new BadRequestException(orderError('ORDER_PLACED_IN_FUTURE', 'An order cannot be placed in the future'));
    }

    const lines = await this.linesOf(storeId, dto);
    const totals = totalsOf(lines, dto.fulfillment, dto.deliveryFeeCents ?? 0, dto.discountCents ?? 0);
    if (!totals) {
      throw new BadRequestException(orderError('ORDER_DISCOUNT_TOO_LARGE', 'The discount is larger than the order'));
    }

    return this.prisma.$transaction(async (tx) => {
      const { orderSequence: number } = await tx.store.update({
        where: { id: storeId },
        data: { orderSequence: { increment: 1 } },
        select: { orderSequence: true },
      });
      const customerId = await this.customerOf(tx, storeId, dto.customer);

      const order = await tx.order.create({
        data: {
          storeId,
          number,
          customerId,
          // Registered by the shopkeeper, who already agreed the sale: accepted, not received.
          status: 'ACCEPTED',
          fulfillment: dto.fulfillment,
          paymentMethod: dto.paymentMethod,
          ...totals,
          note: dto.note?.length ? dto.note : null,
          placedAt,
          items: {
            create: lines.map((line, position) => ({ ...line, lineTotalCents: line.unitPriceCents * line.quantity, position })),
          },
          events: { create: { status: 'ACCEPTED', actor: 'SHOPKEEPER', userId } },
        },
        include: ORDER_INCLUDE,
      });

      await this.refreshBooks(tx, customerId);
      return toOrder(order);
    });
  }

  async list(storeSlug: string, userId: string, query: ListOrdersDto = {}): Promise<OrderPage> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);

    const page = Math.max(query.page ?? 1, 1);
    const pageSize = Math.min(Math.max(query.pageSize ?? ORDERS_PAGE_SIZE, 1), ORDERS_PAGE_SIZE_MAX);
    const raw = query.q?.trim() ?? '';
    // "#12" is order 12 and nothing else; "12" is also a name or a piece of a phone.
    const byNumberOnly = raw.startsWith('#');
    const term = raw.replace(/^#/, '');
    const digits = term.replace(/\D/g, '');
    const where: Prisma.OrderWhereInput = {
      storeId,
      ...(query.status ? { status: query.status } : {}),
      ...(term
        ? {
            OR: [
              ...(/^\d{1,9}$/.test(term) ? [{ number: Number(term) }] : []),
              ...(byNumberOnly
                ? []
                : [
                    { customer: { name: { contains: term, mode: 'insensitive' as const } } },
                    // Four digits at least: a "1" would find every phone in the shop.
                    ...(digits.length >= 4 ? [{ customer: { phone: { contains: digits } } }] : []),
                  ]),
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: ORDER_SUMMARY_INCLUDE,
        orderBy: [{ placedAt: 'desc' }, { number: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { orders: rows.map(toOrderSummary), total, page, pageSize };
  }

  async get(storeSlug: string, userId: string, number: number): Promise<Order> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const order = await this.prisma.order.findUnique({ where: { storeId_number: { storeId, number } }, include: ORDER_INCLUDE });
    if (!order) throw this.notFound(number);
    return toOrder(order);
  }

  /** Any status to any other, except out of `CANCELLED`, which is final. */
  async updateStatus(storeSlug: string, userId: string, number: number, { status }: UpdateOrderStatusDto): Promise<Order> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);

    return this.prisma.$transaction(async (tx) => {
      // The same row lock as a new order takes, so a status change and a placement never interleave.
      await tx.store.update({ where: { id: storeId }, data: { orderSequence: { increment: 0 } }, select: { id: true } });

      const current = await tx.order.findUnique({ where: { storeId_number: { storeId, number } }, select: { id: true, status: true, customerId: true } });
      if (!current) throw this.notFound(number);
      if (current.status === 'CANCELLED') {
        throw new ConflictException(orderError('ORDER_CANCELLED', 'A cancelled order does not change status'));
      }
      if (current.status === status) {
        throw new ConflictException(orderError('ORDER_STATUS_UNCHANGED', `The order is already ${status}`));
      }

      const order = await tx.order.update({
        where: { id: current.id },
        data: { status, events: { create: { status, actor: 'SHOPKEEPER', userId } } },
        include: ORDER_INCLUDE,
      });
      if (status === 'CANCELLED') await this.refreshBooks(tx, current.customerId);
      return toOrder(order);
    });
  }

  /** The lines as they will be photographed: each variant read from this shop, and priced by it. */
  private async linesOf(storeId: string, dto: CreateOrderDto) {
    const ids = dto.items.map((item) => item.variantId);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException(orderError('ORDER_ITEM_DUPLICATE', 'A variant appears on two lines'));
    }

    const variants = await this.prisma.productVariant.findMany({
      // Another shop's, a combination that stopped existing and one not sold are all the same refusal.
      where: { id: { in: ids }, storeId, archivedAt: null, isActive: true },
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
      throw new BadRequestException(orderError('ORDER_VARIANT_INVALID', 'A variant is not one this shop sells'));
    }

    const byId = new Map(variants.map((variant) => [variant.id, variant]));
    return dto.items.map((item) => {
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

  /**
   * The customer the order is for: one of this shop's, or one registered here. A phone the shop
   * already knows is that customer — the phone identifies a customer within a shop — and what was
   * typed as the name does not overwrite theirs.
   */
  private async customerOf(tx: Tx, storeId: string, input: OrderCustomerDto): Promise<string> {
    if (input.id) {
      const known = await tx.customer.findFirst({ where: { id: input.id, storeId }, select: { id: true } });
      if (!known) throw new BadRequestException(orderError('ORDER_CUSTOMER_NOT_FOUND', 'No such customer in this shop'));
      return known.id;
    }
    if (!input.name || !input.phone) {
      throw new BadRequestException(orderError('ORDER_CUSTOMER_NOT_FOUND', 'A customer needs an id, or a name and a phone'));
    }

    const customer = await tx.customer.upsert({
      where: { storeId_phone: { storeId, phone: input.phone } },
      create: { storeId, name: input.name, phone: input.phone },
      update: {},
      select: { id: true },
    });
    return customer.id;
  }

  /** The customer's books, read again from the orders that count — every one not cancelled. */
  private async refreshBooks(tx: Tx, customerId: string): Promise<void> {
    const books = await tx.order.aggregate({
      where: { customerId, status: { not: 'CANCELLED' } },
      _count: { _all: true },
      _sum: { totalCents: true },
      _min: { placedAt: true },
      _max: { placedAt: true },
    });

    await tx.customer.update({
      where: { id: customerId },
      data: {
        ordersCount: books._count._all,
        totalSpentCents: books._sum.totalCents ?? 0,
        firstOrderAt: books._min.placedAt,
        lastOrderAt: books._max.placedAt,
      },
    });
  }

  private notFound(number: number): NotFoundException {
    return new NotFoundException(orderError('ORDER_NOT_FOUND', `No order #${number} in this shop`));
  }
}
