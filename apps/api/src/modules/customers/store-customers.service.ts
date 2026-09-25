// Nest
import { Injectable } from '@nestjs/common';

// Types
import type { StoreCustomer, StoreCustomerListQuery, StoreCustomerPage } from '@harness-monorepo/contracts';
import type { CustomerModel } from '../../generated/prisma/models.js';
import type { CustomerWhereInput } from '../../generated/prisma/models/Customer.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { StoresService } from '../stores/stores.service.js';
import { CUSTOMERS_PAGE_SIZE, CUSTOMERS_PAGE_SIZE_MAX } from './customers.constants.js';

type CustomerRow = CustomerModel & { user: { email: string; emailVerifiedAt: Date | null } | null };

function toStoreCustomer(row: CustomerRow): StoreCustomer {
  return {
    id: row.id,
    name: row.name,
    email: row.user?.email ?? null,
    emailVerified: Boolean(row.user?.emailVerifiedAt),
    phone: row.phone,
    city: row.city,
    state: row.state,
    // Orders are not recorded yet: an account that has one is the day this reads `CUSTOMER`.
    stage: 'LEAD',
    createdAt: row.createdAt.toISOString(),
  } satisfies StoreCustomer;
}

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

  /** One page, with the bounds used echoed and never the ones asked for. */
  async list(storeSlug: string, userId: string, query: StoreCustomerListQuery = {}): Promise<StoreCustomerPage> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);

    const page = Math.max(query.page ?? 1, 1);
    const pageSize = Math.min(Math.max(query.pageSize ?? CUSTOMERS_PAGE_SIZE, 1), CUSTOMERS_PAGE_SIZE_MAX);
    const term = query.q?.trim();
    const digits = term?.replace(/\D/g, '');
    const where: CustomerWhereInput = {
      storeId,
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

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        include: { user: { select: { email: true, emailVerifiedAt: true } } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return { customers: rows.map(toStoreCustomer), total, page, pageSize };
  }
}
