// Nest
import { BadRequestException, ConflictException } from '@nestjs/common';

// Types
import type { Prisma } from '../../generated/prisma/client.js';

// App
import { lockCustomer } from '../customers/customer-lock.js';
import { CASHBACK_DEFAULTS, cashbackError, DAY_MS } from './cashback.constants.js';
import { expiryOf, takeFrom } from './cashback-spending.js';

type Tx = Prisma.TransactionClient;

/**
 * Every change to a customer's credit goes through here (BEELINK-238), inside the transaction that
 * makes it and after the customer's lock, and ends by reading the caches again from the lots. That is
 * what keeps the rule the statement rests on: the balance is what is left of the available lots, and
 * also what the statement's lines add up to.
 */

/** The shop's validity, as its rules are now; the defaults' while it never saved any. */
export async function validityOf(tx: Tx, storeId: string): Promise<number | null> {
  const settings = await tx.cashbackSettings.findUnique({ where: { storeId }, select: { expiresAfterDays: true } });
  return settings ? settings.expiresAfterDays : CASHBACK_DEFAULTS.expiresAfterDays;
}

/** The customer's two caches, read again from their lots. Under the customer's lock. */
export async function recountCashback(tx: Tx, customerId: string): Promise<void> {
  const [available, pending] = await Promise.all([
    tx.cashbackCredit.aggregate({ where: { customerId, status: 'AVAILABLE' }, _sum: { remainingCents: true } }),
    tx.cashbackCredit.aggregate({ where: { customerId, status: 'PENDING' }, _sum: { amountCents: true } }),
  ]);

  await tx.customer.update({
    where: { id: customerId },
    data: { cashbackBalanceCents: available._sum.remainingCents ?? 0, cashbackPendingCents: pending._sum.amountCents ?? 0 },
  });
}

export interface Adjustment {
  storeId: string;
  customerId: string;
  /** Signed, never 0. */
  amountCents: number;
  reason: string;
  actorUserId: string;
  now: Date;
}

/**
 * The shopkeeper's correction. In the customer's favour it is a lot of its own, usable at once and
 * expiring by the shop's rule as it is today; against them it takes from the lots in spending order,
 * and never more than they have — 409, nothing written.
 */
export async function adjustCashback(tx: Tx, adjustment: Adjustment): Promise<void> {
  const { storeId, customerId, amountCents, reason, actorUserId, now } = adjustment;
  if (amountCents === 0) throw new BadRequestException(cashbackError('CASHBACK_ADJUSTMENT_INVALID', 'An adjustment moves the balance'));
  await lockCustomer(tx, customerId);

  if (amountCents > 0) {
    const credit = await tx.cashbackCredit.create({
      data: {
        storeId,
        customerId,
        status: 'AVAILABLE',
        amountCents,
        remainingCents: amountCents,
        availableAt: now,
        expiresAt: expiryOf(now, await validityOf(tx, storeId), DAY_MS),
      },
      select: { id: true },
    });
    await tx.cashbackEntry.create({ data: { storeId, customerId, kind: 'ADJUST', amountCents, creditId: credit.id, reason, actorUserId, createdAt: now } });
  } else {
    // Read after the lock: a lot spent or expired meanwhile is not taken twice.
    const lots = await tx.cashbackCredit.findMany({
      where: { customerId, status: 'AVAILABLE', remainingCents: { gt: 0 } },
      select: { id: true, remainingCents: true, expiresAt: true, createdAt: true },
    });
    const taken = takeFrom(lots, -amountCents);
    if (!taken) throw new ConflictException(cashbackError('CASHBACK_BALANCE_INSUFFICIENT', 'The customer has less credit than that'));

    for (const { id, takeCents } of taken) {
      await tx.cashbackCredit.update({ where: { id }, data: { remainingCents: { decrement: takeCents } } });
    }
    // One line, as the shopkeeper typed it; which lots paid for it is in their `remainingCents`.
    await tx.cashbackEntry.create({
      data: { storeId, customerId, kind: 'ADJUST', amountCents, creditId: taken.length === 1 ? (taken[0]?.id ?? null) : null, reason, actorUserId, createdAt: now },
    });
  }

  await recountCashback(tx, customerId);
}

/**
 * Two records of one person made one: the other's lots and statement become the kept record's, and
 * its caches are read again. Before the other record is deleted, which would take them with it.
 * Under the kept customer's lock, which the merge already holds.
 */
export async function moveCashback(tx: Tx, keptId: string, goneId: string): Promise<void> {
  await tx.cashbackCredit.updateMany({ where: { customerId: goneId }, data: { customerId: keptId } });
  await tx.cashbackEntry.updateMany({ where: { customerId: goneId }, data: { customerId: keptId } });
  await recountCashback(tx, keptId);
}
