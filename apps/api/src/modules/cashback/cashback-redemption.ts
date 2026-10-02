// Types
import type { CashbackUnavailableReason, OrderCashbackRefusedDetails } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';

// App
import { lockLedger, recountCashback, spendableAt } from './cashback-ledger.js';
import { CASHBACK_DEFAULTS, DAY_MS } from './cashback.constants.js';
import { cashbackMaxOf, returnedLotOf } from './cashback-return.js';
import { takeFrom } from './cashback-spending.js';

type Tx = Prisma.TransactionClient;

/** What a cart asks of the customer's credit: nothing, the most it can take, or an amount — the one a placement was shown. */
export type CashbackWant = 'NONE' | 'MAX' | number;

export interface CashbackUse {
  balanceCents: number;
  maxCents: number;
  appliedCents: number;
  unavailable: CashbackUnavailableReason | null;
  /** An amount asked for that is more than can be spent now; a placement refuses it. */
  refusal: OrderCashbackRefusedDetails | null;
}

/**
 * The customer's credit against a cart (BEELINK-240): what they can spend now, the most this cart
 * takes — the shop's cap over the products after their discounts, never the delivery — and what is
 * applied. The cap is the rule as saved, whether the cashback is on or off: switching it off stops
 * new credit, and what the shop already owes is still the customer's to spend.
 *
 * A placement asks with `lock`, so the lots it reads are the ones it spends: the shop's row, then the
 * customer's, as every change to a customer's credit takes them. Expiry is read at `now` — the
 * clock, never the day a sale is dated: the panel may date a sale in the past, and credit that
 * expired since is not spent. A placement spends at that same instant, so a lot that expires in
 * between is neither counted nor taken.
 */
export async function cashbackUseOf(
  db: Tx,
  input: { storeId: string; customerId: string | null; productsCents: number; want: CashbackWant; lock: boolean; now: Date },
): Promise<CashbackUse> {
  const { storeId, customerId, productsCents, want, lock, now } = input;
  if (lock && customerId) await lockLedger(db, storeId, customerId);

  const [lots, rules] = await Promise.all([
    customerId ? db.cashbackCredit.findMany({ where: { customerId, ...spendableAt(now) }, select: { remainingCents: true } }) : [],
    db.cashbackSettings.findUnique({ where: { storeId }, select: { maxRedeemBps: true } }),
  ]);
  const balanceCents = lots.reduce((sum, lot) => sum + lot.remainingCents, 0);
  const maxCents = cashbackMaxOf(balanceCents, productsCents, rules?.maxRedeemBps ?? CASHBACK_DEFAULTS.maxRedeemBps);

  const asked = typeof want === 'number' ? want : 0;
  const appliedCents = want === 'MAX' ? maxCents : asked <= maxCents ? asked : 0;
  return {
    balanceCents,
    maxCents,
    appliedCents,
    unavailable: balanceCents === 0 ? 'NO_BALANCE' : maxCents === 0 ? 'NOTHING_TO_PAY' : null,
    refusal: asked > maxCents ? { requestedCents: asked, maxCents } : null,
  };
}

/**
 * The order spends `cents` of its customer's credit: from the lots that expire first, each use kept so
 * a cancellation gives it back to the lot it came from, and one line on the statement. Inside the
 * placement, after `cashbackUseOf` read the same lots under the same locks — so they hold it.
 */
export async function redeemCashback(tx: Tx, use: { storeId: string; customerId: string; orderId: string; cents: number; now: Date }): Promise<void> {
  const { storeId, customerId, orderId, cents, now } = use;
  const lots = await tx.cashbackCredit.findMany({
    where: { customerId, ...spendableAt(now) },
    select: { id: true, remainingCents: true, expiresAt: true, createdAt: true },
  });
  const taken = takeFrom(lots, cents);
  // Checked under these locks a moment ago: a shortfall now is a bug, and the order goes back whole.
  if (!taken) throw new Error(`Cashback of order ${orderId} was checked but cannot be taken`);

  for (const { id, takeCents } of taken) {
    await tx.cashbackCredit.update({ where: { id }, data: { remainingCents: { decrement: takeCents } } });
  }
  await tx.cashbackRedemption.createMany({ data: taken.map(({ id, takeCents }) => ({ orderId, creditId: id, amountCents: takeCents, createdAt: now })) });
  await tx.cashbackEntry.create({ data: { storeId, customerId, kind: 'REDEEM', amountCents: -cents, orderId, createdAt: now } });
  await recountCashback(tx, customerId);
}

/**
 * The order was cancelled: what it spent goes back to the lots it came from (`returnedLotOf`) — with
 * the validity each had and at least seven days, in a lot of its own when the lot's remainder must
 * keep a shorter one — and the statement says how much is credit again. Each use is given back once
 * (`returnedAt`).
 */
export async function returnCashback(tx: Tx, orderId: string, now: Date): Promise<void> {
  const uses = await tx.cashbackRedemption.findMany({ where: { orderId, returnedAt: null }, select: { id: true, creditId: true, amountCents: true, credit: { select: { storeId: true, customerId: true } } } });
  const owner = uses[0]?.credit;
  if (!owner) return;

  await lockLedger(tx, owner.storeId, owner.customerId);
  let credited = 0;
  for (const use of uses) {
    const lot = await tx.cashbackCredit.findUniqueOrThrow({ where: { id: use.creditId } });
    const back = returnedLotOf(lot, use.amountCents, now, DAY_MS);
    await tx.cashbackCredit.update({
      where: { id: lot.id },
      data: { status: back.lot.status, remainingCents: back.lot.remainingCents, unrecoveredCents: back.lot.unrecoveredCents, expiresAt: back.lot.expiresAt },
    });
    if (back.split) {
      // No order earned it: the order it was spent on is the statement's REVERSAL line.
      await tx.cashbackCredit.create({
        data: { storeId: lot.storeId, customerId: lot.customerId, status: 'AVAILABLE', amountCents: back.split.amountCents, remainingCents: back.split.amountCents, availableAt: now, expiresAt: back.split.expiresAt, createdAt: now },
      });
    }
    await tx.cashbackRedemption.update({ where: { id: use.id }, data: { returnedAt: now } });
    credited += back.creditedCents;
  }
  if (credited > 0) {
    await tx.cashbackEntry.create({ data: { storeId: owner.storeId, customerId: owner.customerId, kind: 'REVERSAL', amountCents: credited, orderId, createdAt: now } });
  }
  await recountCashback(tx, owner.customerId);
}
