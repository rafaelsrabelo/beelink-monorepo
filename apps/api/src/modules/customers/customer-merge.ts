// Types
import type { Prisma } from '../../generated/prisma/client.js';
import type { CustomerModel } from '../../generated/prisma/models.js';

// App
import { moveCashback } from '../cashback/cashback-ledger.js';
import { countOut } from '../reviews/review-books.js';
import { lockCustomer } from './customer-lock.js';
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
 * The other record's reviews (BEELINK-156) — one whose account was deleted keeps them — move to the
 * kept one, which had none of that product; a product both reviewed keeps the kept one's, and the
 * other's leaves the product's cache before its row goes with the record.
 */
async function moveReviews(tx: Tx, keptId: string, goneId: string): Promise<void> {
  const reviews = await tx.productReview.findMany({ where: { customerId: goneId }, select: { id: true, productId: true, rating: true, hiddenAt: true, updatedAt: true } });
  if (reviews.length === 0) return;
  const kept = new Set((await tx.productReview.findMany({ where: { customerId: keptId, productId: { in: reviews.map((review) => review.productId) } }, select: { productId: true } })).map((review) => review.productId));

  for (const review of reviews) {
    // Its own `updatedAt` kept: a move is not the customer's edit.
    if (!kept.has(review.productId)) await tx.productReview.update({ where: { id: review.id }, data: { customerId: keptId, updatedAt: review.updatedAt } });
    else if (review.hiddenAt === null) await countOut(tx, review.productId, review.rating);
  }
}

/**
 * The other record's orders, addresses and cashback moved to the kept one, which fills a phone, a CPF or a
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
  // Before the other is deleted, whose addresses would go with it. Raw, so each keeps its own
  // `updatedAt`: a move is not an edit, and the default's successor is the address changed last.
  await tx.$executeRaw`
    UPDATE "customer_addresses"
    SET "customerId" = ${kept.id}::uuid, "isDefault" = "isDefault" AND NOT ${keptHasDefault}::boolean
    WHERE "customerId" = ${gone.id}::uuid`;
  await moveReviews(tx, kept.id, gone.id);
  // Their credit is one person's too (BEELINK-238): the statements join, and the balances add up.
  await moveCashback(tx, kept.id, gone.id);
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
