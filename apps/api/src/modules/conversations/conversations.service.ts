// Nest
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

// Types
import type {
  CustomerConversation,
  CustomerConversationSummary,
  ShopConversation,
  ShopConversationPage,
  ShopConversationUnread,
} from '@harness-monorepo/contracts';
import { Prisma } from '../../generated/prisma/client.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { CustomersService } from '../customers/customers.service.js';
import { RealtimePublisher } from '../realtime/realtime-publisher.js';
import { StoresService } from '../stores/stores.service.js';
import {
  conversationError,
  CUSTOMER_CONVERSATIONS_MAX,
  isOpen,
  OPEN_ORDER_STATUSES,
  SHOP_CONVERSATIONS_PAGE_SIZE,
} from './conversations.constants.js';
import { summarySelect, toCustomerConversation, toCustomerSummary, toShopConversation, toShopSummary, type LastMessageRow, type SummaryRow } from './conversations.mapper.js';
import type { ListShopConversationsDto, SendConversationMessageDto } from './dto/conversation.dto.js';

type Tx = Prisma.TransactionClient;
type Side = 'CUSTOMER' | 'SHOP';

/** The order a conversation is about, as either side reaches it: its head, and its messages oldest first. */
const orderWithConversation = {
  id: true,
  number: true,
  status: true,
  customer: { select: { id: true, name: true } },
  conversation: { select: { id: true, messages: { orderBy: { createdAt: 'asc' } } } },
} as const satisfies Prisma.OrderSelect;

function notFound(number: number): NotFoundException {
  return new NotFoundException(conversationError('ORDER_NOT_FOUND', `No order #${number} here`));
}

function closed(): ConflictException {
  return new ConflictException(conversationError('ORDER_CONVERSATION_CLOSED', 'The order is over: its conversation takes no message'));
}

/**
 * An order's conversation between its customer and the shop. The customer opens it with their first
 * message; the shop answers. It takes messages while the order is on its way — the order's status
 * says so, never a column — and stays readable to both sides after.
 */
@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customers: CustomersService,
    private readonly stores: StoresService,
    private readonly realtime: RealtimePublisher,
  ) {}

  /* ── the customer's side ─────────────────────────────────────────────────── */

  /** One of their orders' conversation; empty until they write — never a 404 for an order of theirs. */
  async customerRead(storeSlug: string, userId: string, number: number): Promise<CustomerConversation> {
    const { storeId, customerId } = await this.customers.shopperAt(storeSlug, userId);
    const order = await this.prisma.order.findFirst({ where: { storeId, customerId, number }, select: orderWithConversation });
    if (!order) throw notFound(number);
    return toCustomerConversation(order, order.conversation?.messages ?? []);
  }

  /** Their message: the conversation opens with the first one, and takes none once the order is over. */
  async customerSend(storeSlug: string, userId: string, number: number, dto: SendConversationMessageDto): Promise<CustomerConversation> {
    const { storeId, customerId } = await this.customers.shopperAt(storeSlug, userId);
    const order = await this.prisma.order.findFirst({ where: { storeId, customerId, number }, select: { id: true } });
    if (!order) throw notFound(number);

    await this.prisma.$transaction(async (tx) => {
      await this.stillOpen(tx, order.id);
      const now = new Date();
      // On the unique order id: the first two messages at once open one conversation, not two.
      const conversation = await tx.orderConversation.upsert({
        where: { orderId: order.id },
        create: { orderId: order.id, lastMessageAt: now },
        update: { lastMessageAt: now },
        select: { id: true },
      });
      await tx.orderMessage.create({ data: { conversationId: conversation.id, author: 'CUSTOMER', userId, body: dto.body, createdAt: now } });
    });
    this.realtime.publish({ storeId, customerId }, { type: 'conversation.message', orderNumber: number, author: 'CUSTOMER' });
    return this.customerRead(storeSlug, userId, number);
  }

  /** Read by the customer: the shop's messages they had not read. */
  async customerMarkRead(storeSlug: string, userId: string, number: number): Promise<CustomerConversation> {
    const { storeId, customerId } = await this.customers.shopperAt(storeSlug, userId);
    const order = await this.prisma.order.findFirst({ where: { storeId, customerId, number }, select: { id: true } });
    if (!order) throw notFound(number);

    if (await this.markRead(order.id, 'CUSTOMER')) {
      this.realtime.publish({ storeId, customerId }, { type: 'conversation.read', orderNumber: number, reader: 'CUSTOMER' });
    }
    return this.customerRead(storeSlug, userId, number);
  }

  /** Their conversations at this shop: those still taking messages first, then the latest. */
  async customerList(storeSlug: string, userId: string): Promise<CustomerConversationSummary[]> {
    const { storeId, customerId } = await this.customers.shopperAt(storeSlug, userId);
    const read = (open: boolean, take: number) =>
      this.prisma.orderConversation.findMany({
        where: { order: { storeId, customerId, status: open ? { in: [...OPEN_ORDER_STATUSES] } : { notIn: [...OPEN_ORDER_STATUSES] } } },
        select: summarySelect,
        orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }],
        take,
      });
    // Open first, each group by its latest message: asked apart, so the cap never drops an open one for a closed one.
    const open = await read(true, CUSTOMER_CONVERSATIONS_MAX);
    const rows = open.length < CUSTOMER_CONVERSATIONS_MAX ? [...open, ...(await read(false, CUSTOMER_CONVERSATIONS_MAX - open.length))] : open;
    const summaries = await this.summariesOf(rows, 'CUSTOMER');
    return summaries.map(({ row, last, unread }) => toCustomerSummary(row, last, unread));
  }

  /* ── the shop's side ─────────────────────────────────────────────────────── */

  /** One order's conversation, from the panel; empty while the customer has not written. */
  async shopRead(storeSlug: string, userId: string, number: number): Promise<ShopConversation> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const order = await this.prisma.order.findUnique({ where: { storeId_number: { storeId, number } }, select: orderWithConversation });
    if (!order) throw notFound(number);
    return toShopConversation(order, order.conversation?.messages ?? []);
  }

  /** The shop's answer: to a conversation its customer opened, while the order is on its way. */
  async shopSend(storeSlug: string, userId: string, number: number, dto: SendConversationMessageDto): Promise<ShopConversation> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const order = await this.prisma.order.findUnique({
      where: { storeId_number: { storeId, number } },
      select: { id: true, customerId: true, conversation: { select: { id: true } } },
    });
    if (!order) throw notFound(number);
    const conversation = order.conversation;
    if (!conversation) {
      throw new NotFoundException(conversationError('ORDER_CONVERSATION_NOT_FOUND', 'The customer has not opened a conversation on this order'));
    }

    await this.prisma.$transaction(async (tx) => {
      await this.stillOpen(tx, order.id);
      const now = new Date();
      await tx.orderMessage.create({ data: { conversationId: conversation.id, author: 'SHOP', userId, body: dto.body, createdAt: now } });
      await tx.orderConversation.update({ where: { id: conversation.id }, data: { lastMessageAt: now } });
    });
    this.realtime.publish({ storeId, customerId: order.customerId }, { type: 'conversation.message', orderNumber: number, author: 'SHOP' });
    return this.shopRead(storeSlug, userId, number);
  }

  /** Read by the shop: the customer's messages it had not read. */
  async shopMarkRead(storeSlug: string, userId: string, number: number): Promise<ShopConversation> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const order = await this.prisma.order.findUnique({ where: { storeId_number: { storeId, number } }, select: { id: true, customerId: true } });
    if (!order) throw notFound(number);

    if (await this.markRead(order.id, 'SHOP')) {
      this.realtime.publish({ storeId, customerId: order.customerId }, { type: 'conversation.read', orderNumber: number, reader: 'SHOP' });
    }
    return this.shopRead(storeSlug, userId, number);
  }

  /** A page of the shop's conversations, latest message first: open, unread or all, by order number or customer name. */
  async shopList(storeSlug: string, userId: string, query: ListShopConversationsDto): Promise<ShopConversationPage> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const page = query.page ?? 1;
    const q = query.q?.trim();
    const number = q && /^#?\d{1,9}$/.test(q) ? Number(q.replace('#', '')) : null;

    const where: Prisma.OrderConversationWhereInput = {
      order: {
        storeId,
        ...(query.filter === 'OPEN' ? { status: { in: [...OPEN_ORDER_STATUSES] } } : {}),
        ...(q ? { OR: [...(number !== null ? [{ number }] : []), { customer: { name: { contains: q, mode: 'insensitive' as const } } }] } : {}),
      },
      ...(query.filter === 'UNREAD' ? { messages: { some: { author: 'CUSTOMER', readAt: null } } } : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.orderConversation.findMany({
        where,
        select: summarySelect,
        orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * SHOP_CONVERSATIONS_PAGE_SIZE,
        take: SHOP_CONVERSATIONS_PAGE_SIZE,
      }),
      this.prisma.orderConversation.count({ where }),
    ]);
    const summaries = await this.summariesOf(rows, 'SHOP');
    return { conversations: summaries.map(({ row, last, unread }) => toShopSummary(row, last, unread)), total, page, pageSize: SHOP_CONVERSATIONS_PAGE_SIZE };
  }

  /** What the panel's bell counts: the customers' messages the shop has not read, and the conversations they are in. */
  async shopUnread(storeSlug: string, userId: string): Promise<ShopConversationUnread> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const unread = { author: 'CUSTOMER', readAt: null } as const;
    const [messages, conversations] = await this.prisma.$transaction([
      this.prisma.orderMessage.count({ where: { ...unread, conversation: { order: { storeId } } } }),
      this.prisma.orderConversation.count({ where: { order: { storeId }, messages: { some: unread } } }),
    ]);
    return { messages, conversations };
  }

  /**
   * A page's rows with their last message and the reader's unread count: two reads bounded to the
   * page's ids. As relation includes, Prisma counts every unread message of the platform in one
   * unbounded subquery, and loads every message of the page to keep one.
   */
  private async summariesOf(rows: readonly SummaryRow[], reader: Side): Promise<{ row: SummaryRow; last: LastMessageRow; unread: number }[]> {
    if (!rows.length) return [];
    const ids = rows.map((row) => row.id);
    const [lasts, unread] = await Promise.all([
      this.prisma.$queryRaw<LastMessageRow[]>(Prisma.sql`
        SELECT DISTINCT ON ("conversationId") "conversationId", "author", "body", "createdAt"
        FROM "order_messages" WHERE "conversationId" = ANY(${ids}::uuid[])
        ORDER BY "conversationId", "createdAt" DESC, "id" DESC`),
      this.prisma.orderMessage.groupBy({
        by: ['conversationId'],
        where: { conversationId: { in: ids }, author: reader === 'CUSTOMER' ? 'SHOP' : 'CUSTOMER', readAt: null },
        _count: { _all: true },
      }),
    ]);
    const lastOf = new Map(lasts.map((last) => [last.conversationId, last]));
    const unreadOf = new Map(unread.map((group) => [group.conversationId, group._count._all]));
    // Every conversation opens with a message, in the same transaction: none is ever without one.
    return rows.map((row) => ({ row, last: lastOf.get(row.id)!, unread: unreadOf.get(row.id) ?? 0 }));
  }

  /**
   * The order's status, read again under a share lock: a status change to delivered or cancelled
   * waits for the message, or the message waits for it and sees it — never a message after the close.
   */
  private async stillOpen(tx: Tx, orderId: string): Promise<void> {
    const [order] = await tx.$queryRaw<{ status: string }[]>`SELECT "status" FROM "orders" WHERE "id" = ${orderId}::uuid FOR SHARE`;
    if (!order || !isOpen(order.status as Parameters<typeof isOpen>[0])) throw closed();
  }

  /** The other side's messages, read now by `reader`; whether there were any, so a read of nothing tells nobody. */
  private async markRead(orderId: string, reader: Side): Promise<boolean> {
    const { count } = await this.prisma.orderMessage.updateMany({
      where: { conversation: { orderId }, author: reader === 'CUSTOMER' ? 'SHOP' : 'CUSTOMER', readAt: null },
      data: { readAt: new Date() },
    });
    return count > 0;
  }
}
