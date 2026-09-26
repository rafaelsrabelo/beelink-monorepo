// Nest
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

// Types
import type {
  CustomerStage,
  StoreCustomer,
  StoreCustomerDetail,
  StoreCustomerListQuery,
  StoreCustomerPage,
  StoreCustomerSort,
} from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';
import type { CustomerOrderByWithRelationInput, CustomerWhereInput } from '../../generated/prisma/models/Customer.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { StoresService } from '../stores/stores.service.js';
import { duplicatesOf, flaggedIdsOf } from './customer-duplicates.js';
import { keptOf, mergeInto } from './customer-merge.js';
import { CUSTOMER_STAGES, CUSTOMERS_PAGE_SIZE, CUSTOMERS_PAGE_SIZE_MAX } from './customers.constants.js';
import { customerSince } from './customer-stage.js';
import type { CreateStoreCustomerDto, MergeStoreCustomerDto, UpdateStoreCustomerDto } from './dto/store-customer.dto.js';
import { toStoreCustomer, toStoreCustomerDetail, WITH_ACCOUNT, type CustomerRow } from './store-customer.mapper.js';

/** A customer id is a uuid column: anything else is no customer, never a query the database refuses. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The phone identifies a customer within a shop: the unique index is what refuses a second one. */
function isPhoneTaken(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'P2002';
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
        include: WITH_ACCOUNT,
      });
      const flagged = await flaggedIdsOf(this.prisma, [row.id]);
      return toStoreCustomer(row, store.inactiveAfterDays, new Date(), flagged.has(row.id));
    } catch (error) {
      if (isPhoneTaken(error)) {
        throw new ConflictException({ errorCode: 'CUSTOMER_PHONE_TAKEN', message: 'That phone belongs to a customer of this shop' });
      }
      throw error;
    }
  }

  /** One of the shop's customers, as their record reads them — another shop's, however real, is not found here. */
  async findOne(storeSlug: string, userId: string, customerId: string): Promise<StoreCustomerDetail> {
    const store = await this.ownedStore(storeSlug, userId);
    const row = await this.recordIn(store.id, customerId);

    return this.detailOf(row, store.inactiveAfterDays);
  }

  /** The record as its page reads it, with the others that may be the same person. */
  private async detailOf(row: CustomerRow, inactiveAfterDays: number): Promise<StoreCustomerDetail> {
    return toStoreCustomerDetail(row, inactiveAfterDays, new Date(), await duplicatesOf(this.prisma, row.id));
  }

  /**
   * The shopkeeper's correction of the shop's record: the one the shopper sees too, so what is fixed
   * here reads fixed there. A phone another customer of the shop has is refused and nothing of the
   * request is written — the update is one statement, and the index refuses it whole.
   */
  async update(storeSlug: string, userId: string, customerId: string, dto: UpdateStoreCustomerDto): Promise<StoreCustomerDetail> {
    const store = await this.ownedStore(storeSlug, userId);
    const { id } = await this.recordIn(store.id, customerId);

    try {
      const row = await this.prisma.customer.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
          ...dto.address,
        },
        include: WITH_ACCOUNT,
      });
      return await this.detailOf(row, store.inactiveAfterDays);
    } catch (error) {
      if (isPhoneTaken(error)) {
        throw new ConflictException({ errorCode: 'CUSTOMER_PHONE_TAKEN', message: 'That phone belongs to another customer of this shop' });
      }
      throw error;
    }
  }

  /**
   * Two records of one person made one, by the shopkeeper who knows them. The one with an account is
   * kept, and answered: the panel goes on to it, which is not always the record it was on.
   */
  async merge(storeSlug: string, userId: string, customerId: string, dto: MergeStoreCustomerDto): Promise<StoreCustomerDetail> {
    const store = await this.ownedStore(storeSlug, userId);
    if (customerId.toLowerCase() === dto.otherId.toLowerCase()) {
      throw new BadRequestException({ errorCode: 'CUSTOMER_MERGE_SELF', message: 'A customer cannot be merged with itself' });
    }

    const keptId = await this.prisma.$transaction(async (tx) => {
      // The lock an order takes: one placed for either record meanwhile waits, then finds the result.
      await tx.$queryRaw`SELECT 1 FROM "stores" WHERE "id" = ${store.id}::uuid FOR UPDATE`;
      const here = await this.recordIn(store.id, customerId, tx);
      const other = await this.recordIn(store.id, dto.otherId, tx);

      const pair = keptOf(here, other);
      if (!pair) {
        throw new ConflictException({ errorCode: 'CUSTOMER_MERGE_TWO_ACCOUNTS', message: 'Both customers have an account' });
      }
      await mergeInto(tx, pair.kept, pair.gone);
      return pair.kept.id;
    });

    return this.detailOf(await this.recordIn(store.id, keptId), store.inactiveAfterDays);
  }

  private async recordIn(storeId: string, customerId: string, db: Pick<Prisma.TransactionClient, 'customer'> = this.prisma): Promise<CustomerRow> {
    const row = UUID.test(customerId)
      ? await db.customer.findFirst({ where: { id: customerId.toLowerCase(), storeId }, include: WITH_ACCOUNT })
      : null;
    if (!row) throw new NotFoundException({ errorCode: 'CUSTOMER_NOT_FOUND', message: 'No such customer in this shop' });
    return row;
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
        include: WITH_ACCOUNT,
        orderBy: ORDER_BY[query.sort ?? 'RECENT'],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.customer.count({ where }),
      ...CUSTOMER_STAGES.map((stage) => this.prisma.customer.count({ where: { AND: [searched, stageWhere(stage, store.inactiveAfterDays, now)] } })),
    ]);

    const flagged = await flaggedIdsOf(this.prisma, rows.map((row) => row.id));

    return {
      customers: rows.map((row) => toStoreCustomer(row, store.inactiveAfterDays, now, flagged.has(row.id))),
      total,
      page,
      pageSize,
      stageCounts: Object.fromEntries(CUSTOMER_STAGES.map((stage, index) => [stage, counts[index] ?? 0])) as Record<CustomerStage, number>,
    };
  }
}
