// Types
import type { Prisma } from '../../generated/prisma/client.js';
import type { CustomerModel } from '../../generated/prisma/models.js';

// App
import { refreshBooks } from './customer-books.js';

type Tx = Prisma.TransactionClient;

/** The parts of a record's address, taken whole or not at all. */
const ADDRESS_PARTS = ['zipCode', 'street', 'number', 'complement', 'neighborhood', 'city', 'state'] as const;

type Address = Pick<CustomerModel, (typeof ADDRESS_PARTS)[number]>;

function addressOf(row: Address): Address {
  return Object.fromEntries(ADDRESS_PARTS.map((part) => [part, row[part]])) as Address;
}

function hasAddress(row: Address): boolean {
  return ADDRESS_PARTS.some((part) => row[part] !== null);
}

/**
 * Which of the two records is kept: the one with an account — the one the person sees at the shop
 * and their next order lands on — and with neither, the one the shopkeeper is on. Null when both
 * have one: two sign-ins are two people as far as a merge goes.
 */
export function keptOf<T extends Pick<CustomerModel, 'userId'>>(here: T, other: T): { kept: T; gone: T } | null {
  if (here.userId && other.userId) return null;
  return other.userId ? { kept: other, gone: here } : { kept: here, gone: other };
}

/**
 * The other record's orders moved to the kept one, which fills a phone or an address it lacks and
 * reads its books again; then the other is gone. Under the shop's row lock, the one an order takes,
 * so an order placed meanwhile is either moved with the rest or refused as for a customer no longer
 * there — never left pointing at a deleted row.
 *
 * An address is taken whole or not at all: half of one and half of another is nobody's address.
 */
export async function mergeInto(tx: Tx, kept: CustomerModel, gone: CustomerModel): Promise<void> {
  await tx.order.updateMany({ where: { customerId: gone.id }, data: { customerId: kept.id } });
  // Gone before the kept one takes its phone: the index would refuse the two holding it at once.
  await tx.customer.delete({ where: { id: gone.id } });

  await tx.customer.update({
    where: { id: kept.id },
    data: {
      ...(kept.phone === null ? { phone: gone.phone } : {}),
      ...(hasAddress(kept) ? {} : addressOf(gone)),
      // The claim is settled once the record it pointed at is this one; one pointing elsewhere stays.
      ...(kept.claimedPhone !== null && kept.claimedPhone === gone.phone ? { claimedPhone: null } : {}),
    },
  });
  await refreshBooks(tx, kept.id);
}
