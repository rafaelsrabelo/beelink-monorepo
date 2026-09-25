// Nest
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

// Types
import type { CustomerStage, StoreCustomer, StoreCustomerListQuery, StoreCustomerPage, StoreCustomerSort } from '@harness-monorepo/contracts';
import type { CustomerModel } from '../../generated/prisma/models.js';
import type { CustomerOrderByWithRelationInput, CustomerWhereInput } from '../../generated/prisma/models/Customer.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { StoresService } from '../stores/stores.service.js';
import { CUSTOMER_STAGES, CUSTOMERS_PAGE_SIZE, CUSTOMERS_PAGE_SIZE_MAX } from './customers.constants.js';
import { customerSince, daysSince, stageOf } from './customer-stage.js';
import type { CreateStoreCustomerDto } from './dto/store-customer.dto.js';

/** A customer id is a uuid column: anything else is no customer, never a query the database refuses. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type CustomerRow = CustomerModel & { user: { email: string; emailVerifiedAt: Date | null } | null };

function toStoreCustomer(row: CustomerRow, inactiveAfterDays: number, now: Date): StoreCustomer {
  return {
    id: row.id,
    name: row.name,
    email: row.user?.email ?? null,
    emailVerified: Boolean(row.user?.emailVerifiedAt),
    phone: row.phone,
    city: row.city,
    state: row.state,
    stage: stageOf(row, inactiveAfterDays, now),
    ordersCount: row.ordersCount,
    // Capped per order, so a shop's lifetime fits a double long before it outgrows the column.
    totalSpentCents: Number(row.totalSpentCents),
    lastOrderAt: row.lastOrderAt?.toISOString() ?? null,
    daysSinceLastOrder: daysSince(row.lastOrderAt, now),
    createdAt: row.createdAt.toISOString(),
  } satisfies StoreCustomer;
}

/** The same cut `stageOf` makes, for the database: a stage tab and a stage badge never disagree. */
function stageWhere(stage: CustomerStage, inactiveAfterDays: number, now: Date): CustomerWhereInput {
  const since = customerSince(inactiveAfterDays, now);
  if (stage === 'LEAD') return { ordersCount: 0 };
  if (stage === 'CUSTOMER') return { ordersCount: { gt: 0 }, lastOrderAt: { gt: since } };
  return { ordersCount: { gt: 0 }, lastOrderAt: { lte: since } };
}

/** Every sort ends on the newest registered, then the id, so a page never repeats or skips anyone. */
const ORDER_BY: Record<StoreCustomerSort, CustomerOrderByWithRelationInput[]> = {
  RECENT: [{ createdAt: 'desc' }, { id: 'desc' }],
  LAST_ORDER: [{ lastOrderAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }, { id: 'desc' }],
  MOST_ORDERS: [{ ordersCount: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
  TOP_SPENT: [{ totalSpentCents: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
};

/**
 * A shop's customers, as its owner sees them: everyone who opened an account at the shop, newest
 * first. The owner's side of the shoppers' door — the shop window never reads this.
 */
@Injectable()
export class StoreCustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
  ) {}

  /** The owner's shop, with the number its stages are read against. */
  private async ownedStore(storeSlug: string, userId: string): Promise<{ id: string; inactiveAfterDays: number }> {
    const id = await this.stores.ownedStoreId(storeSlug, userId);
    const { inactiveAfterDays } = await this.prisma.store.findUniqueOrThrow({ where: { id }, select: { inactiveAfterDays: true } });
    return { id, inactiveAfterDays };
  }

  /**
   * A customer registered by the shopkeeper, with no account — someone who bought by WhatsApp. The
   * phone identifies a customer in the shop, so one the shop already has is refused, and the panel
   * offers that customer instead of a second one.
   */
  async create(storeSlug: string, userId: string, dto: CreateStoreCustomerDto): Promise<StoreCustomer> {
    const store = await this.ownedStore(storeSlug, userId);

    try {
      const row = await this.prisma.customer.create({
        data: { storeId: store.id, name: dto.name, phone: dto.phone, ...dto.address },
        include: { user: { select: { email: true, emailVerifiedAt: true } } },
      });
      return toStoreCustomer(row, store.inactiveAfterDays, new Date());
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        throw new ConflictException({ errorCode: 'CUSTOMER_PHONE_TAKEN', message: 'That phone belongs to a customer of this shop' });
      }
      throw error;
    }
  }

  /** One of the shop's customers — another shop's, however real, is not found here. */
  async findOne(storeSlug: string, userId: string, customerId: string): Promise<StoreCustomer> {
    const store = await this.ownedStore(storeSlug, userId);

    const row = UUID.test(customerId)
      ? await this.prisma.customer.findFirst({
          where: { id: customerId.toLowerCase(), storeId: store.id },
          include: { user: { select: { email: true, emailVerifiedAt: true } } },
        })
      : null;
    if (!row) throw new NotFoundException({ errorCode: 'CUSTOMER_NOT_FOUND', message: 'No such customer in this shop' });
    return toStoreCustomer(row, store.inactiveAfterDays, new Date());
  }

  /**
   * One page, with the bounds used echoed and never the ones asked for, and how many match the
   * search in each stage — the stage filter narrows the page, never the counts.
   */
  async list(storeSlug: string, userId: string, query: StoreCustomerListQuery = {}): Promise<StoreCustomerPage> {
    const store = await this.ownedStore(storeSlug, userId);
    const now = new Date();

    const page = Math.max(query.page ?? 1, 1);
    const pageSize = Math.min(Math.max(query.pageSize ?? CUSTOMERS_PAGE_SIZE, 1), CUSTOMERS_PAGE_SIZE_MAX);
    const term = query.q?.trim();
    const digits = term?.replace(/\D/g, '');
    const searched: CustomerWhereInput = {
      storeId: store.id,
      ...(term
        ? {
            OR: [
              { name: { contains: term, mode: 'insensitive' } },
              { user: { email: { contains: term, mode: 'insensitive' } } },
              // A phone is stored as digits: "(11) 99999" finds "5511999998888".
              ...(digits ? [{ phone: { contains: digits } }] : []),
            ],
          }
        : {}),
    };
    const where: CustomerWhereInput = query.stage ? { AND: [searched, stageWhere(query.stage, store.inactiveAfterDays, now)] } : searched;

    const [rows, total, ...counts] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        include: { user: { select: { email: true, emailVerifiedAt: true } } },
        orderBy: ORDER_BY[query.sort ?? 'RECENT'],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.customer.count({ where }),
      ...CUSTOMER_STAGES.map((stage) => this.prisma.customer.count({ where: { AND: [searched, stageWhere(stage, store.inactiveAfterDays, now)] } })),
    ]);

    return {
      customers: rows.map((row) => toStoreCustomer(row, store.inactiveAfterDays, now)),
      total,
      page,
      pageSize,
      stageCounts: Object.fromEntries(CUSTOMER_STAGES.map((stage, index) => [stage, counts[index] ?? 0])) as Record<CustomerStage, number>,
    };
  }
}
