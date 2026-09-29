// Types
import type { CustomerDuplicate, StoreCustomer, StoreCustomerDetail } from '@harness-monorepo/contracts';
import type { CustomerAddressModel, CustomerModel } from '../../generated/prisma/models.js';

// App
import { DEFAULT_ADDRESS, addressPartsOf } from './customer-addresses.js';
import { averageTicketOf } from './customer-books.js';
import { daysSince, stageOf } from './customer-stage.js';
import { dayOf } from '../../shared/http/birth-date.js';

/**
 * What the panel reads a customer with: the account, for its e-mail and whether it was confirmed,
 * and the default address — the one address the panel knows a customer by.
 */
export const RECORD_INCLUDE = { user: { select: { email: true, emailVerifiedAt: true } }, addresses: DEFAULT_ADDRESS } as const;

export type CustomerRow = CustomerModel & { user: { email: string; emailVerifiedAt: Date | null } | null; addresses: CustomerAddressModel[] };

export function toStoreCustomer(row: CustomerRow, inactiveAfterDays: number, now: Date, possibleDuplicate: boolean): StoreCustomer {
  return {
    id: row.id,
    name: row.name,
    email: row.user?.email ?? null,
    emailVerified: Boolean(row.user?.emailVerifiedAt),
    phone: row.phone,
    city: row.addresses[0]?.city ?? null,
    state: row.addresses[0]?.state ?? null,
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
  return {
    ...toStoreCustomer(row, inactiveAfterDays, now, duplicates.length > 0),
    address: addressPartsOf(row.addresses[0]),
    cpf: row.cpf,
    birthDate: dayOf(row.birthDate),
    firstOrderAt: row.firstOrderAt?.toISOString() ?? null,
    averageTicketCents: averageTicketOf(row.totalSpentCents, row.ordersCount),
    duplicates,
  } satisfies StoreCustomerDetail;
}
