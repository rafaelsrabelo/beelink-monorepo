// Types
import type { CustomerAddress, CustomerSavedAddress } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';
import type { CustomerAddressModel } from '../../generated/prisma/models.js';

// App
import { lockCustomer } from './customer-lock.js';

type Tx = Prisma.TransactionClient;

/** The parts of an address, as the wire's `CustomerAddress` names them. */
export const ADDRESS_PARTS = ['zipCode', 'street', 'number', 'complement', 'neighborhood', 'city', 'state'] as const;

/** A customer has at most this many: plenty for one person, and a cap on what a script could pile up. */
export const ADDRESSES_MAX = 10;

/** The default first, then the newest: how the shopper's list and the cart read them. */
export const SAVED_ADDRESS_ORDER: Prisma.CustomerAddressOrderByWithRelationInput[] = [{ isDefault: 'desc' }, { createdAt: 'desc' }];

/** Only the default, for what reads a customer by one address: the panel's record and list. */
export const DEFAULT_ADDRESS = { where: { isDefault: true }, take: 1 } as const;

const NO_ADDRESS: CustomerAddress = { zipCode: null, street: null, number: null, complement: null, neighborhood: null, city: null, state: null };

/** An address's parts alone; every part null for none. */
export function addressPartsOf(row: CustomerAddress | null | undefined): CustomerAddress {
  if (!row) return { ...NO_ADDRESS };
  return Object.fromEntries(ADDRESS_PARTS.map((part) => [part, row[part]])) as unknown as CustomerAddress;
}

export function toSavedAddress(row: CustomerAddressModel): CustomerSavedAddress {
  return { id: row.id, label: row.label, recipientName: row.recipientName, ...addressPartsOf(row), isDefault: row.isDefault } satisfies CustomerSavedAddress;
}

function hasAnyPart(address: CustomerAddress): boolean {
  return ADDRESS_PARTS.some((part) => address[part] !== null);
}

/** The parts a partial write sends; one left out is not in it, so it is kept. */
function sentPartsOf(parts: Partial<CustomerAddress>): Partial<CustomerAddress> {
  return Object.fromEntries(ADDRESS_PARTS.filter((part) => parts[part] !== undefined).map((part) => [part, parts[part]]));
}

/**
 * After the default went: the address changed last takes its place, when any is left — one a
 * delivery can go to (a street and a city) before one it cannot, since the panel, the header and
 * the shop's own orders all read the default.
 */
export async function promoteDefault(tx: Tx, customerId: string): Promise<void> {
  const newest = { orderBy: { updatedAt: 'desc' }, select: { id: true } } as const;
  const next =
    (await tx.customerAddress.findFirst({ where: { customerId, street: { not: null }, city: { not: null } }, ...newest })) ??
    (await tx.customerAddress.findFirst({ where: { customerId }, ...newest }));
  if (next) await tx.customerAddress.update({ where: { id: next.id }, data: { isDefault: true } });
}

/**
 * The panel's write (H7), on the default address, as the customer's one address was written before
 * the list existed: a part left out is kept, one sent as null is cleared. A customer with no address
 * gets one from the parts sent; a default left with no part at all is removed, and another promoted.
 */
export async function writeDefaultAddress(tx: Tx, customerId: string, parts: Partial<CustomerAddress>): Promise<void> {
  const sent = sentPartsOf(parts);
  if (Object.keys(sent).length === 0) return;

  await lockCustomer(tx, customerId);
  const current = await tx.customerAddress.findFirst({ where: { customerId, isDefault: true } });
  if (!current) {
    const created = { ...NO_ADDRESS, ...sent };
    if (hasAnyPart(created)) await tx.customerAddress.create({ data: { customerId, ...created, isDefault: true } });
    return;
  }

  if (hasAnyPart({ ...addressPartsOf(current), ...sent })) {
    await tx.customerAddress.update({ where: { id: current.id }, data: sent });
    return;
  }
  await tx.customerAddress.delete({ where: { id: current.id } });
  await promoteDefault(tx, customerId);
}

/** The parts to create a customer's first address from, when the panel registers them with one. */
export function firstAddressOf(parts: Partial<CustomerAddress> | undefined): Prisma.CustomerAddressCreateWithoutCustomerInput | null {
  const created = { ...NO_ADDRESS, ...sentPartsOf(parts ?? {}) };
  return hasAnyPart(created) ? { ...created, isDefault: true } : null;
}
