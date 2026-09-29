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
import type { Prisma } from '../../generated/prisma/client.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { CustomersService } from '../customers/customers.service.js';
import { StoresService } from '../stores/stores.service.js';
import {
  conversationError,
  CUSTOMER_CONVERSATIONS_MAX,
  isOpen,
  OPEN_ORDER_STATUSES,
  SHOP_CONVERSATIONS_PAGE_SIZE,
} from './conversations.constants.js';
import { summaryInclude, toCustomerConversation, toCustomerSummary, toShopConversation, toShopSummary } from './conversations.mapper.js';
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
    const order = await this.prisma.order.findFirst({ where: { storeId, customerId, number }, select: { id: true, status: true } });
    if (!order) throw notFound(number);
    if (!isOpen(order.status)) throw closed();

    await this.prisma.$transaction(async (tx) => {
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
    return this.customerRead(storeSlug, userId, number);
  }

  /** Read by the customer: the shop's messages they had not read. */
  async customerMarkRead(storeSlug: string, userId: string, number: number): Promise<CustomerConversation> {
    const { storeId, customerId } = await this.customers.shopperAt(storeSlug, userId);
    const order = await this.prisma.order.findFirst({ where: { storeId, customerId, number }, select: { id: true } });
    if (!order) throw notFound(number);

    await this.markRead(this.prisma, order.id, 'CUSTOMER');
    return this.customerRead(storeSlug, userId, number);
  }

  /** Their conversations at this shop: those still taking messages first, then the latest. */
  async customerList(storeSlug: string, userId: string): Promise<CustomerConversationSummary[]> {
    const { storeId, customerId } = await this.customers.shopperAt(storeSlug, userId);
    const rows = await this.prisma.orderConversation.findMany({
      where: { order: { storeId, customerId } },
      include: summaryInclude('CUSTOMER'),
      orderBy: { lastMessageAt: 'desc' },
      take: CUSTOMER_CONVERSATIONS_MAX,
    });
    const summaries = rows.map(toCustomerSummary);
    // A stable sort: open ones first, each group still by its latest message.
    return [...summaries.filter((row) => row.order.open), ...summaries.filter((row) => !row.order.open)];
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
      select: { status: true, conversation: { select: { id: true } } },
    });
    if (!order) throw notFound(number);
    if (!order.conversation) {
      throw new NotFoundException(conversationError('ORDER_CONVERSATION_NOT_FOUND', 'The customer has not opened a conversation on this order'));
    }
    if (!isOpen(order.status)) throw closed();

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.orderMessage.create({ data: { conversationId: order.conversation.id, author: 'SHOP', userId, body: dto.body, createdAt: now } }),
      this.prisma.orderConversation.update({ where: { id: order.conversation.id }, data: { lastMessageAt: now } }),
    ]);
    return this.shopRead(storeSlug, userId, number);
  }

  /** Read by the shop: the customer's messages it had not read. */
  async shopMarkRead(storeSlug: string, userId: string, number: number): Promise<ShopConversation> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const order = await this.prisma.order.findUnique({ where: { storeId_number: { storeId, number } }, select: { id: true } });
    if (!order) throw notFound(number);

    await this.markRead(this.prisma, order.id, 'SHOP');
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
        include: summaryInclude('SHOP'),
        orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * SHOP_CONVERSATIONS_PAGE_SIZE,
        take: SHOP_CONVERSATIONS_PAGE_SIZE,
      }),
      this.prisma.orderConversation.count({ where }),
    ]);
    return { conversations: rows.map(toShopSummary), total, page, pageSize: SHOP_CONVERSATIONS_PAGE_SIZE };
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

  /** The other side's messages, read now by `reader`. */
  private async markRead(tx: Tx | PrismaService, orderId: string, reader: Side): Promise<void> {
    await tx.orderMessage.updateMany({
      where: { conversation: { orderId }, author: reader === 'CUSTOMER' ? 'SHOP' : 'CUSTOMER', readAt: null },
      data: { readAt: new Date() },
    });
  }
}
