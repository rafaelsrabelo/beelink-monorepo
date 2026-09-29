// Nest
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

// Types
import type { CustomerOrder, CustomerOrderPage, CustomerOrderSituation, CustomerReorder, OrderStatus } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { CustomersService } from '../customers/customers.service.js';
import { CUSTOMER_ORDER_INCLUDE, toCustomerOrder, toCustomerOrderSummary } from './customer-order.mapper.js';
import type { ListCustomerOrdersDto, PlaceCustomerOrderDto } from './dto/customer-order.dto.js';
import { settleCancellation } from './order-cancellation.js';
import { OrderPlacement } from './order-placement.js';
import { reorderOf } from './order-reorder.js';
import { CUSTOMER_ORDER_SITUATIONS, CUSTOMER_ORDERS_PAGE_SIZE, CUSTOMER_ORDERS_PAGE_SIZE_MAX, orderError } from './orders.constants.js';
import { noteOrderStatus } from '../conversations/order-status-notice.js';
import { RealtimePublisher } from '../realtime/realtime-publisher.js';

/** The shops are Brazilian, and so is a customer's year: "2025" starts at midnight in Brasília. */
const SHOP_OFFSET = '-03:00';
const THREE_MONTHS_MS = 90 * 86_400_000;

/**
 * The signed-in shopper's own orders at a shop: placing one from the cart, reading them — theirs,
 * including those the shop registered for them — and cancelling one the shop has not accepted yet.
 *
 * Every read goes through the shopper's own record at the shop, so another customer's order is not
 * found rather than forbidden: the answer never says it exists.
 */
@Injectable()
export class CustomerOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customers: CustomersService,
    private readonly placement: OrderPlacement,
    private readonly realtime: RealtimePublisher,
  ) {}

  /**
   * The cart as an order of the shopper's record at this shop: priced, checked against the stock and
   * the shop's payments, and waiting for the shop — `RECEIVED`, the shopper's own word on it. The fee
   * is the shop's to tell, until the product computes one.
   */
  async place(storeSlug: string, userId: string, dto: PlaceCustomerOrderDto): Promise<CustomerOrder> {
    const { storeId, customerId } = await this.customers.shopperAt(storeSlug, userId);

    const placed = await this.placement.place({
      storeId,
      items: dto.items,
      fulfillment: dto.fulfillment,
      paymentMethod: dto.paymentMethod,
      deliveryFeeCents: 0,
      discountCents: 0,
      note: null,
      placedAt: new Date(),
      status: 'RECEIVED',
      actor: 'CUSTOMER',
      userId,
      onSaleOnly: true,
      customerOf: async () => customerId,
    });
    this.realtime.publish({ storeId, customerId }, { type: 'order.created', orderNumber: placed.number, placedBy: 'CUSTOMER' });
    return this.read(storeId, customerId, placed.number);
  }

  async list(storeSlug: string, userId: string, query: ListCustomerOrdersDto = {}): Promise<CustomerOrderPage> {
    const { storeId, customerId } = await this.customers.shopperAt(storeSlug, userId);

    const page = Math.max(query.page ?? 1, 1);
    const pageSize = Math.min(Math.max(query.pageSize ?? CUSTOMER_ORDERS_PAGE_SIZE, 1), CUSTOMER_ORDERS_PAGE_SIZE_MAX);
    // The tabs count under the period and the search, never under the tab chosen.
    const scope: Prisma.OrderWhereInput = { storeId, customerId, ...periodOf(query.period), ...searchOf(query.q) };
    const where: Prisma.OrderWhereInput = query.situation
      ? { AND: [scope, { status: { in: [...CUSTOMER_ORDER_SITUATIONS[query.situation]] } }] }
      : scope;

    const [rows, total, byStatus, years] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: CUSTOMER_ORDER_INCLUDE,
        orderBy: [{ placedAt: 'desc' }, { number: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.order.count({ where }),
      this.prisma.order.groupBy({ by: ['status'], where: scope, orderBy: { status: 'asc' }, _count: { _all: true } }),
      this.prisma.$queryRaw<{ year: number }[]>`
        SELECT DISTINCT extract(year FROM "placedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::int AS "year"
        FROM "orders" WHERE "storeId" = ${storeId}::uuid AND "customerId" = ${customerId}::uuid
        ORDER BY 1 DESC`,
    ]);

    const counted = new Map(byStatus.map((row) => [row.status, (row._count as { _all: number })._all]));
    const countOf = (statuses: readonly OrderStatus[]) => statuses.reduce((sum, status) => sum + (counted.get(status) ?? 0), 0);
    const situations = Object.entries(CUSTOMER_ORDER_SITUATIONS) as [CustomerOrderSituation, readonly OrderStatus[]][];

    return {
      orders: rows.map(toCustomerOrderSummary),
      total,
      page,
      pageSize,
      counts: {
        ALL: countOf([...counted.keys()]),
        ...(Object.fromEntries(situations.map(([situation, statuses]) => [situation, countOf(statuses)])) as Record<CustomerOrderSituation, number>),
      },
      years: years.map((row) => row.year),
    };
  }

  async get(storeSlug: string, userId: string, number: number): Promise<CustomerOrder> {
    const { storeId, customerId } = await this.customers.shopperAt(storeSlug, userId);
    return this.read(storeId, customerId, number);
  }

  /**
   * One of the customer's orders read against today's catalogue, to be bought again: what goes into
   * the cart and what stays out. A read: nothing is reserved, and the checkout checks again.
   */
  async reorder(storeSlug: string, userId: string, number: number): Promise<CustomerReorder> {
    const { storeId, customerId } = await this.customers.shopperAt(storeSlug, userId);
    const order = await this.prisma.order.findFirst({
      where: { storeId, customerId, number },
      select: { items: { orderBy: { position: 'asc' }, select: { productId: true, variantId: true, productName: true, variantLabel: true, quantity: true } } },
    });
    if (!order) throw notFound(number);

    const variantIds = order.items.flatMap((item) => (item.variantId ? [item.variantId] : []));
    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds }, storeId },
      select: {
        id: true,
        productId: true,
        isActive: true,
        archivedAt: true,
        trackStock: true,
        stockQuantity: true,
        product: { select: { status: true, _count: { select: { options: true } } } },
      },
    });
    return reorderOf(
      number,
      order.items,
      variants.map(({ product, ...variant }) => ({ ...variant, productStatus: product.status, productHasOptions: product._count.options > 0 })),
    );
  }

  /**
   * The customer's own cancellation, while the shop has not accepted the order: after that it is the
   * shop's to cancel. Under the lock of the shop's row, as the panel's status changes take it, so the
   * shop accepting and the customer cancelling at once end one way or the other, never both.
   */
  async cancel(storeSlug: string, userId: string, number: number): Promise<CustomerOrder> {
    const { storeId, customerId } = await this.customers.shopperAt(storeSlug, userId);

    const conversation = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM "stores" WHERE "id" = ${storeId}::uuid FOR UPDATE`;

      const current = await tx.order.findFirst({
        where: { storeId, customerId, number },
        select: { id: true, status: true, customerId: true, stockTaken: true },
      });
      if (!current) throw notFound(number);
      // Already cancelled — by the shop, or by a second press — is said as such, not as "accepted".
      if (current.status === 'CANCELLED') {
        throw new ConflictException(orderError('ORDER_CANCELLED', 'The order is already cancelled'));
      }
      if (current.status !== 'RECEIVED') {
        throw new ConflictException(orderError('ORDER_NOT_CANCELLABLE', "Only an order the shop has not accepted is the customer's to cancel"));
      }

      await tx.order.update({
        where: { id: current.id },
        data: { status: 'CANCELLED', events: { create: { status: 'CANCELLED', actor: 'CUSTOMER', userId } } },
      });
      await settleCancellation(tx, current);
      // The customer's own doing: in the conversation's history, but not news to them.
      await noteOrderStatus(tx, { order: current, status: 'CANCELLED', at: new Date(), seen: true });
      return (await tx.orderConversation.count({ where: { orderId: current.id } })) > 0;
    });
    this.realtime.publish({ storeId, customerId }, { type: 'order.status', orderNumber: number, status: 'CANCELLED' });
    if (conversation) this.realtime.publish({ storeId, customerId }, { type: 'conversation.closed', orderNumber: number });
    return this.read(storeId, customerId, number);
  }

  private async read(storeId: string, customerId: string, number: number): Promise<CustomerOrder> {
    const order = await this.prisma.order.findFirst({ where: { storeId, customerId, number }, include: CUSTOMER_ORDER_INCLUDE });
    if (!order) throw notFound(number);
    return toCustomerOrder(order);
  }
}

function notFound(number: number): NotFoundException {
  return new NotFoundException(orderError('ORDER_NOT_FOUND', `No order #${number} of yours in this shop`));
}

/** `3m` is the last ninety days; a year is that year in the shop's calendar. */
function periodOf(period: string | undefined): Prisma.OrderWhereInput {
  if (!period) return {};
  if (period === '3m') return { placedAt: { gte: new Date(Date.now() - THREE_MONTHS_MS) } };
  const year = Number(period);
  return { placedAt: { gte: new Date(`${year}-01-01T00:00:00${SHOP_OFFSET}`), lt: new Date(`${year + 1}-01-01T00:00:00${SHOP_OFFSET}`) } };
}

/** "#12" is order 12 and nothing else; "12" is also part of a product's name; words are a product's name. */
function searchOf(q: string | undefined): Prisma.OrderWhereInput {
  const raw = q?.trim() ?? '';
  if (!raw) return {};
  const term = raw.replace(/^#/, '');
  const byNumber = /^\d{1,9}$/.test(term) ? [{ number: Number(term) }] : [];
  // A "#" before something that is not a number names no order.
  if (raw.startsWith('#')) return byNumber[0] ?? { number: -1 };
  return { OR: [...byNumber, { items: { some: { productName: { contains: term, mode: 'insensitive' } } } }] };
}
