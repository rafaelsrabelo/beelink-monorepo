// Nest
import { Injectable } from '@nestjs/common';

// Types
import type { OrderPaymentStatus, StrayPaymentReason } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';
import type { OrderPaymentModel } from '../../generated/prisma/models.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { AsaasCharges } from '../integrations/asaas/asaas-charges.service.js';
import type { AsaasCharge } from '../integrations/asaas/asaas.client.js';
import { isPaidPlan, methodOfPlan, plansOf, type ChargePlan } from './charge-plan.js';
import { applyCharge, cancelRows, noteStray } from './payment-facts.js';
import { PaymentNews } from './payment-news.js';
import { shownPaymentOf } from './payment.mapper.js';
import { holdsMoney, isLive, wasPaid } from './payment-status.js';
import { isOnlineMethod } from './payment-terms.js';

/** What hearing Asaas about an order's charges came to. */
export interface PaymentHeard {
  /** Where the charge the order shows stands now; null when it has none. */
  status: OrderPaymentStatus | null;
  /** The shop holds money for the order. */
  paid: boolean;
  /** What the order shows moved, or money arrived that it did not ask for. */
  changed: boolean;
  /** A charge still to be paid stands at Asaas that the order no longer wants — beside a paid one, or on a cancelled order: `OrderPayments.release` takes it out. */
  leftovers: boolean;
}

const NOTHING: PaymentHeard = { status: null, paid: false, changed: false, leftovers: false };

const waits = (row: OrderPaymentModel) => row.status === 'PENDING' || row.status === 'OVERDUE';
const names = (plan: ChargePlan, row: OrderPaymentModel) => plan.id === row.providerId || (plan.installmentId !== null && plan.installmentId === row.providerInstallmentId);

/** One charge read by its id, as the plan its row stands for: of a plan, Asaas answers the first instalment alone. */
function planOfRow(charge: AsaasCharge, row: OrderPaymentModel): ChargePlan {
  const [plan] = plansOf([charge]);
  return { ...plan!, id: row.providerId ?? charge.id, totalCents: charge.installmentId ? row.amountCents : plan!.totalCents, installments: charge.installmentId ? row.installments : 1 };
}

/**
 * What Asaas holds for an order, heard and written (BEELINK-206): the one way a payment is learned
 * of, whoever asks — a webhook's event, the reconciliation, a customer looking at a waiting charge,
 * an order about to be cancelled. A webhook is only a reason to come here: its body is never
 * applied, so a token in the wrong hands cannot mark an order paid, and an event arriving late or
 * twice changes nothing — every hearing reads the account as it is now, and `applyCharge` never
 * takes a charge back down.
 *
 * It lists the order's charges at the shop's account (one request, every instalment of a plan
 * together) and writes them under the shop's row lock, by `applyCharge`. A waiting charge the list
 * no longer holds is read by its id before it is given up on. Money wins: a paid charge that is not
 * the order's living one becomes it, the waiting one beside it cancelled here; with the order paid
 * already, or cancelled, the money is kept as a stray payment for the shop to settle. It removes
 * nothing at Asaas — `leftovers` tells the caller there is something to remove.
 *
 * Throws what `AsaasCharges` throws: a caller that must know (the automatic cancellation) hears
 * that Asaas could not be asked.
 */
@Injectable()
export class PaymentSync {
  constructor(
    private readonly prisma: PrismaService,
    private readonly charges: AsaasCharges,
    private readonly news: PaymentNews,
  ) {}

  async sync(storeId: string, orderId: string): Promise<PaymentHeard> {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, storeId }, select: { id: true, paymentChannel: true, paymentMethod: true, payments: { where: { providerId: { not: null } } } } });
    if (!order || order.paymentChannel !== 'ONLINE' || !isOnlineMethod(order.paymentMethod)) return NOTHING;
    const target = { id: order.id, storeId, method: order.paymentMethod };

    // The rows as they stood before Asaas was asked: only these may be given up on by what it says.
    const listed = plansOf(await this.charges.find(storeId, orderId));
    const gone: string[] = [];
    for (const row of order.payments) {
      if (!waits(row) || listed.some((plan) => names(plan, row))) continue;
      const charge = await this.charges.read(storeId, row.providerId!);
      if (!charge || charge.deleted) gone.push(row.id);
      else listed.push(planOfRow(charge, row));
    }

    const now = new Date();
    const heard = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM "stores" WHERE "id" = ${storeId}::uuid FOR UPDATE`;
      const current = await tx.order.findUniqueOrThrow({ where: { id: orderId }, select: { status: true } });
      const rows = () => tx.orderPayment.findMany({ where: { orderId } });
      const before = shownPaymentOf(await rows())?.status ?? null;
      let stray: StrayPaymentReason | null = null;

      await cancelRows(tx, gone, now);
      let standing = await rows();
      // The order's own living charge first: what it says decides whether any other is one too many.
      for (const plan of listed) {
        if (standing.some((row) => isLive(row.status) && names(plan, row))) await applyCharge(tx, target, plan, now);
      }
      for (const plan of listed.filter(isPaidPlan)) {
        standing = await rows();
        const live = standing.find((row) => isLive(row.status)) ?? null;
        if (live && names(plan, live)) continue;
        if (live && wasPaid(live.status)) {
          if (await this.strayOf(tx, target, plan, 'ORDER_ALREADY_PAID', now)) stray = 'ORDER_ALREADY_PAID';
          continue;
        }
        if (live) await cancelRows(tx, [live.id], now);
        await applyCharge(tx, target, plan, now);
      }

      const after = await rows();
      const held = after.find((row) => holdsMoney(row.status)) ?? null;
      if (current.status === 'CANCELLED' && held?.providerId && isOnlineMethod(held.method)) {
        const first = await noteStray(tx, { orderId, storeId, providerId: held.providerId, method: held.method, amountCents: held.amountCents }, 'ORDER_CANCELLED', now);
        if (first) stray = 'ORDER_CANCELLED';
      }
      const status = shownPaymentOf(after)?.status ?? null;
      const unwanted = current.status === 'CANCELLED' || after.some((row) => wasPaid(row.status));
      return { status, paid: held !== null, changed: status !== before || stray !== null, leftovers: unwanted && listed.some((plan) => !isPaidPlan(plan)), stray };
    });

    if (heard.changed) await this.news.tell(storeId, orderId, heard.stray);
    return { status: heard.status, paid: heard.paid, changed: heard.changed, leftovers: heard.leftovers };
  }

  private strayOf(tx: Prisma.TransactionClient, order: { id: string; storeId: string; method: 'PIX' | 'CREDIT_CARD' }, plan: ChargePlan, reason: StrayPaymentReason, now: Date): Promise<boolean> {
    return noteStray(tx, { orderId: order.id, storeId: order.storeId, providerId: plan.id, method: methodOfPlan(plan, order.method), amountCents: plan.totalCents }, reason, now);
  }
}
