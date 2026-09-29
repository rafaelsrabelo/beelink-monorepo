// Types
import type { Prisma } from '../../generated/prisma/client.js';
import type { CustomerModel } from '../../generated/prisma/models.js';

// App
import { lockCustomer } from './customer-addresses.js';
import { refreshBooks } from './customer-books.js';

type Tx = Prisma.TransactionClient;

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
 * The other record's orders and addresses moved to the kept one, which fills a phone, a CPF or a
 * birth date it lacks and reads its books again; then the other is gone. Under the shop's row lock,
 * the one an order takes, so an order placed meanwhile is either moved with the rest or refused as
 * for a customer no longer there — never left pointing at a deleted row.
 *
 * Every address moves, whole: both records are one person, who receives at all of them. The kept
 * record's default stays the default; the other's becomes it only when the kept one had none.
 */
export async function mergeInto(tx: Tx, kept: CustomerModel, gone: CustomerModel): Promise<void> {
  await tx.order.updateMany({ where: { customerId: gone.id }, data: { customerId: kept.id } });
  // The kept record's own address changes wait, so its default is still what was counted.
  await lockCustomer(tx, kept.id);
  const keptHasDefault = (await tx.customerAddress.count({ where: { customerId: kept.id, isDefault: true } })) > 0;
  // Before the other is deleted, whose addresses would go with it.
  await tx.customerAddress.updateMany({ where: { customerId: gone.id }, data: { customerId: kept.id, ...(keptHasDefault ? { isDefault: false } : {}) } });
  // Gone before the kept one takes its phone: the index would refuse the two holding it at once.
  await tx.customer.delete({ where: { id: gone.id } });

  await tx.customer.update({
    where: { id: kept.id },
    data: {
      ...(kept.phone === null ? { phone: gone.phone } : {}),
      // What only a shopper gives, taken as the phone is: from the other record when this one lacks it.
      ...(kept.cpf === null ? { cpf: gone.cpf } : {}),
      ...(kept.birthDate === null ? { birthDate: gone.birthDate } : {}),
      // The claim is settled once the record it pointed at is this one; one pointing elsewhere stays.
      ...(kept.claimedPhone !== null && kept.claimedPhone === gone.phone ? { claimedPhone: null } : {}),
    },
  });
  await refreshBooks(tx, kept.id);
}
