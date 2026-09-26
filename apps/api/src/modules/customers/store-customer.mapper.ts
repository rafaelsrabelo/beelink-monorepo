// Types
import type { CustomerDuplicate, StoreCustomer, StoreCustomerDetail } from '@harness-monorepo/contracts';
import type { CustomerModel } from '../../generated/prisma/models.js';

// App
import { averageTicketOf } from './customer-books.js';
import { daysSince, stageOf } from './customer-stage.js';

/** What a customer is read with: the account, for its e-mail and whether it was confirmed. */
export const WITH_ACCOUNT = { user: { select: { email: true, emailVerifiedAt: true } } } as const;

export type CustomerRow = CustomerModel & { user: { email: string; emailVerifiedAt: Date | null } | null };

export function toStoreCustomer(row: CustomerRow, inactiveAfterDays: number, now: Date, possibleDuplicate: boolean): StoreCustomer {
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
    possibleDuplicate,
  } satisfies StoreCustomer;
}

export function toStoreCustomerDetail(row: CustomerRow, inactiveAfterDays: number, now: Date, duplicates: CustomerDuplicate[]): StoreCustomerDetail {
  const { zipCode, street, number, complement, neighborhood, city, state } = row;

  return {
    ...toStoreCustomer(row, inactiveAfterDays, now, duplicates.length > 0),
    address: { zipCode, street, number, complement, neighborhood, city, state },
    firstOrderAt: row.firstOrderAt?.toISOString() ?? null,
    averageTicketCents: averageTicketOf(row.totalSpentCents, row.ordersCount),
    duplicates,
  } satisfies StoreCustomerDetail;
}
