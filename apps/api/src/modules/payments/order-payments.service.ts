// Nest
import { BadGatewayException, ConflictException, HttpException, Injectable, Logger, NotFoundException, ServiceUnavailableException, type OnModuleInit } from '@nestjs/common';

// Types
import type { StrayPaymentReason } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';
import type { OrderPaymentModel } from '../../generated/prisma/models.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { AsaasAcceptance, type AsaasAcceptanceOf } from '../integrations/asaas/asaas-acceptance.js';
import { AsaasCharges, AsaasStoreUnavailable } from '../integrations/asaas/asaas-charges.service.js';
import { AsaasConnectionService } from '../integrations/asaas/asaas-connection.service.js';
import { AsaasOutcomeUnknown, AsaasRefused, AsaasThrottled, AsaasUnreachable } from '../integrations/asaas/asaas.client.js';
import { isPaidPlan, methodOfPlan, planCreated, planServes, plansOf, rowServes, type ChargePlan, type WantedCharge } from './charge-plan.js';
import { applyCharge, cancelRows, noteRefusal, noteStray, recordRefusal } from './payment-facts.js';
import { PaymentNews } from './payment-news.js';
import { DEAD_STATUSES, holdsMoney, inReview, isLive, PAID_STATUSES, statusSaidBy, wasPaid } from './payment-status.js';
import { PaymentSync } from './payment-sync.service.js';
import { belowMinimumOf, brasiliaDayOf, dueDateOf, installmentsFor, isOnlineMethod } from './payment-terms.js';
import { CLAIM_MS, paymentError, UNKNOWN_OUTCOME_HOLD_MS } from './payments.constants.js';

/** One request's hold of an order's talk with Asaas, and what the order asked for when it was taken. */
interface Talk {
  storeId: string;
  want: WantedCharge;
  orderNumber: number;
  storeName: string;
  payer: { id: string; name: string; cpf: string };
  connectedAt: Date | null;
  /** `Order.paymentClaimedUntil` as this request wrote it: what it is recognized by when renewed and let go. */
  until: Date;
}

/** Asaas would not remove a charge that is still to be paid: no other may be made beside it. */
class ChargeStands extends Error {}

const live = { status: { notIn: [...DEAD_STATUSES] } };

/** How many waiting charges are taken out of an account a shop is leaving; more than that wait for nobody. */
const LEAVING_BATCH = 200;

/**
 * An order's charge at the shop's own Asaas account (BEELINK-204): making sure it has one, and taking
 * it away when the order no longer asks for it.
 *
 * `ensure` is the one talk with Asaas about an order. It is taken by one request at a time — a claim
 * with a deadline written on the order under the shop's row lock, and committed before any call, so
 * the lock is never held while Asaas answers. It always lists what Asaas already holds for the order
 * (`externalReference` is the order's id) before creating: a charge a dead process left behind is
 * found and taken, never made twice. A claim that ran out without being cleared is exactly that case.
 * And it never creates a second charge while the first can still be paid: the old one is removed
 * first, and Asaas refusing to remove it stops the talk.
 */
@Injectable()
export class OrderPayments implements OnModuleInit {
  private readonly logger = new Logger(OrderPayments.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly acceptance: AsaasAcceptance,
    private readonly charges: AsaasCharges,
    private readonly heard: PaymentSync,
    private readonly news: PaymentNews,
    private readonly connection: AsaasConnectionService,
  ) {}

  onModuleInit(): void {
    this.connection.beforeKeyLeaves((storeId, deadline) => this.releasePendingOf(storeId, deadline));
  }

  /** What the shop takes right now, for whoever places an order. */
  acceptanceOf(storeId: string): Promise<AsaasAcceptanceOf> {
    return this.acceptance.of(storeId);
  }

  /**
   * The order's one charge, alive and good to pay: the one it has when that still serves, else a new
   * one — whatever stood before removed from Asaas first. Refuses, each with its own code, an order
   * that is not charged online, is cancelled, waits for its delivery fee, or was already paid.
   */
  async ensure(storeId: string, orderId: string): Promise<OrderPaymentModel> {
    const claimed = await this.claim(storeId, orderId, await this.acceptance.of(storeId));
    if ('standing' in claimed) return claimed.standing;

    try {
      return await this.converge(claimed);
    } catch (error) {
      // A creation nobody answered may have made the charge: nobody creates again until it had time to show.
      if (error instanceof AsaasOutcomeUnknown) await this.holdFor(claimed, UNKNOWN_OUTCOME_HOLD_MS);
      else await this.letGo(claimed);
      throw await this.said(error, claimed);
    }
  }

  /**
   * `ensure`, for the request that has just placed the order: waited for only so long, and never
   * failing — the order exists whatever Asaas does, and its customer makes the charge from it later.
   */
  async ensureWithin(storeId: string, orderId: string, budgetMs: number): Promise<void> {
    let timer: NodeJS.Timeout | undefined;
    const talk = this.ensure(storeId, orderId).then(
      () => undefined,
      (error: unknown) => this.logger.warn({ storeId, orderId, reason: error instanceof Error ? error.message : 'Unknown failure' }, 'An order was placed without its charge'),
    );
    await Promise.race([talk, new Promise<void>((resolve) => (timer = setTimeout(resolve, budgetMs)))]);
    clearTimeout(timer);
  }

  /**
   * Before an order is cancelled or its total changed: what Asaas knows of its waiting charge is heard
   * first (`PaymentSync`), so one paid since bee-link last heard is refused by `refusePaidOrder`
   * instead of being cancelled over — a webhook may be a moment behind, or lost. An order with no
   * charge waiting costs no request. Never fails: with Asaas silent the change goes by what bee-link knows.
   */
  async hearOf(storeId: string, orderNumber: number): Promise<void> {
    try {
      const order = await this.prisma.order.findUnique({ where: { storeId_number: { storeId, number: orderNumber } }, select: { id: true, _count: { select: { payments: { where: { status: { in: ['PENDING', 'OVERDUE'] } } } } } } });
      if (!order || order._count.payments === 0) return;
      await this.heard.sync(storeId, order.id);
    } catch (error) {
      this.logger.warn({ storeId, orderNumber, reason: reasonOf(error) }, "Could not ask Asaas of an order's charge before the order changed");
    }
  }

  /**
   * A shop's key is about to leave bee-link (BEELINK-206) — the shop disconnects, or connects another
   * account: every charge still waiting is taken out of the account while the key opens it, the
   * newest first, since a code handed out an hour ago is the one most likely to be paid. One found
   * paid is written as paid. Until `deadline` and no further: what is left stays payable there,
   * and is said so in the log.
   */
  async releasePendingOf(storeId: string, deadline: Date): Promise<void> {
    const waiting = await this.prisma.orderPayment.findMany({ where: { storeId, status: { in: ['PENDING', 'OVERDUE'] }, providerId: { not: null } }, orderBy: { createdAt: 'desc' }, take: LEAVING_BATCH });
    let left = waiting.length;
    for (const row of waiting) {
      if (Date.now() >= deadline.getTime()) break;
      try {
        const paid = await this.removeOrPaid(storeId, { id: row.providerId!, installmentId: row.providerInstallmentId });
        if (paid) await this.heard.sync(storeId, row.orderId);
        else await this.underShopLock(storeId, (tx) => cancelRows(tx, [row.id], new Date()));
        left -= 1;
      } catch (error) {
        // The account cannot be asked at all: the rest would fail the same way.
        if (error instanceof AsaasStoreUnavailable || error instanceof AsaasThrottled) break;
        this.logger.warn({ storeId, orderId: row.orderId, reason: reasonOf(error) }, 'Could not remove a waiting charge from an account the shop is leaving');
      }
    }
    if (left > 0) this.logger.error({ storeId, left }, 'Charges still to be paid were left at an Asaas account the shop no longer has connected here');
  }

  /**
   * Takes out of Asaas the charges an order no longer asks for, once its change is committed: every
   * unpaid one of a cancelled order, and those of another amount when its total changed. Asaas is
   * listed rather than the rows trusted, so a charge left by a dead process goes too. Never fails:
   * the order's change stands, and what could not be removed is logged and kept on the charge for
   * the shop to read.
   */
  async release(storeId: string, orderId: string): Promise<void> {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: { status: true, paymentChannel: true, paymentMethod: true, totalCents: true, deliveryFeeCents: true, paymentClaimedUntil: true, payments: true },
      });
      // An order nobody ever talked to Asaas about has nothing there.
      if (!order || order.paymentChannel !== 'ONLINE' || !isOnlineMethod(order.paymentMethod) || (order.payments.length === 0 && !order.paymentClaimedUntil)) return;
      const wanted = order.status !== 'CANCELLED' && order.deliveryFeeCents !== null ? order.totalCents : null;
      const method = order.paymentMethod;
      const rows = new Map(order.payments.map((row) => [row.providerId, row]));

      const listed = plansOf(await this.charges.find(storeId, orderId));
      const paidPlans: ChargePlan[] = [];
      let fitting: ChargePlan | null = null;
      for (const plan of listed) {
        const row = rows.get(plan.id);
        if (isPaidPlan(plan)) paidPlans.push(plan);
        // A total set again to what it was leaves its charge as good as before — one bee-link has not given up on.
        else if (!fitting && plan.totalCents === wanted && (!row || isLive(row.status))) fitting = plan;
        else {
          const found = await this.removeOrPaid(storeId, plan);
          if (found) paidPlans.push(found);
        }
      }
      // The one the order already counts as its payment stays so; any other paid one is money it did not ask for.
      const paid = paidPlans.find((plan) => wasPaid(rows.get(plan.id)?.status ?? 'PENDING')) ?? paidPlans[0] ?? null;
      const second = paidPlans.filter((plan) => plan !== paid);
      // Nothing waits beside money that arrived.
      if (paid && fitting) await this.removeOrPaid(storeId, fitting);
      const kept = paid ?? fitting;
      const now = new Date();
      const strayed = paid !== null && order.status === 'CANCELLED' && holdsMoney(statusSaidBy(paid.status, null)) ? paid : null;
      const stray = await this.underShopLock(storeId, async (tx): Promise<StrayPaymentReason | null> => {
        // Only the rows read before Asaas was listed: one written since is of a charge that listing never saw.
        await cancelRows(tx, order.payments.filter((row) => row.providerId !== kept?.id).map((row) => row.id), now);
        if (kept) await applyCharge(tx, { id: orderId, storeId, method }, kept, now);
        // Money for an order that no longer stands: kept for the shop to settle (BEELINK-206).
        const first = strayed !== null && (await noteStray(tx, { orderId, storeId, providerId: strayed.id, method: methodOfPlan(strayed, method), amountCents: strayed.totalCents }, 'ORDER_CANCELLED', now));
        let again = false;
        for (const plan of second) again = (await noteStray(tx, { orderId, storeId, providerId: plan.id, method: methodOfPlan(plan, method), amountCents: plan.totalCents }, 'ORDER_ALREADY_PAID', now)) || again;
        return first ? 'ORDER_CANCELLED' : again ? 'ORDER_ALREADY_PAID' : null;
      });
      // Not of a paid order cancelled with its refund (BEELINK-208): that money is already on its way back.
      if (paid && (stray || order.status !== 'CANCELLED')) this.logger.error({ storeId, orderId, chargeId: paid.id }, 'A paid charge stands on an order that was cancelled or changed');
      if (paid) await this.news.tell(storeId, orderId, stray);
    } catch (error) {
      const reason = reasonOf(error);
      this.logger.warn({ storeId, orderId, reason }, 'Could not remove the charge of an order that no longer asks for it');
      await this.underShopLock(storeId, (tx) => noteRefusal(tx, orderId, reason)).catch(() => undefined);
    }
  }

  /** The first step, and the only one under the shop's lock before Asaas is asked: what cannot be charged is refused, a charge that serves is answered as it is, and the talk is taken. */
  private claim(storeId: string, orderId: string, acceptance: AsaasAcceptanceOf): Promise<Talk | { standing: OrderPaymentModel }> {
    return this.underShopLock(storeId, async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, storeId },
        select: {
          id: true,
          number: true,
          status: true,
          paymentChannel: true,
          paymentMethod: true,
          paymentInstallments: true,
          totalCents: true,
          deliveryFeeCents: true,
          paymentClaimedUntil: true,
          customer: { select: { id: true, name: true, cpf: true } },
          store: { select: { name: true } },
          payments: { where: live },
        },
      });
      if (!order) throw new NotFoundException(paymentError('ORDER_NOT_FOUND', 'No such order in this shop'));
      if (order.paymentChannel !== 'ONLINE' || !isOnlineMethod(order.paymentMethod)) throw conflict('PAYMENT_NOT_ONLINE', 'The order is settled with the shop, not charged online');
      if (order.status === 'CANCELLED') throw conflict('ORDER_CANCELLED', 'A cancelled order is not charged');
      if (order.deliveryFeeCents === null) throw conflict('PAYMENT_AWAITING_TOTAL', 'The delivery fee is not agreed yet: only a closed total is charged');

      const standing = order.payments[0] ?? null;
      if (standing && wasPaid(standing.status)) throw conflict('PAYMENT_ALREADY_PAID', 'The order was already paid');
      if (belowMinimumOf(order.totalCents, 1)) throw conflict('PAYMENT_BELOW_MINIMUM', 'The order is under the least amount charged online');

      const now = new Date();
      const want: WantedCharge = { orderId, method: order.paymentMethod, totalCents: order.totalCents, installments: installmentsFor(order.paymentMethod, order.totalCents, order.paymentInstallments) };
      if (standing && (inReview(standing.providerStatus) || rowServes(standing, want, now, acceptance.connectedAt))) return { standing };

      if (!acceptance.connected) throw unavailable();
      if (!order.customer.cpf) throw conflict('PAYMENT_DOCUMENT_MISSING', "Paying online needs the customer's CPF");
      if (order.paymentClaimedUntil && order.paymentClaimedUntil > now) throw conflict('PAYMENT_IN_PROGRESS', "The order's charge is being made: read it again in a moment");

      const until = new Date(now.getTime() + CLAIM_MS);
      await tx.order.update({ where: { id: orderId }, data: { paymentClaimedUntil: until } });
      return { storeId, want, orderNumber: order.number, storeName: order.store.name, payer: { ...order.customer, cpf: order.customer.cpf }, connectedAt: acceptance.connectedAt, until };
    });
  }

  /** With the talk in hand and no lock held: Asaas listed, one charge that serves kept, every other removed, and one made when none was left. */
  private async converge(talk: Talk): Promise<OrderPaymentModel> {
    const { storeId, want } = talk;
    const now = new Date();
    const today = brasiliaDayOf(now);
    // Read before Asaas is listed: only these may be given up on by what the listing says.
    const known = await this.prisma.orderPayment.findMany({ where: { orderId: want.orderId, providerId: { not: null } } });
    const rows = new Map(known.map((row) => [row.providerId, row]));
    const listed = plansOf(await this.charges.find(storeId, want.orderId));
    // A charge bee-link keeps a row of serves only while that row does: its Pix code may end before
    // its due day, and one given up on here — though it stands at Asaas again — is not taken back.
    const serves = (plan: ChargePlan) => {
      const row = rows.get(plan.id);
      return inReview(plan.status) || (planServes(plan, want, today) && (!row || rowServes(row, want, now, talk.connectedAt)));
    };
    const alive = (plan: ChargePlan) => Number(isLive(rows.get(plan.id)?.status ?? 'CANCELLED'));

    let paid = listed.find(isPaidPlan) ?? null;
    let keeper: ChargePlan | null = null;
    if (!paid) {
      // The one already known here first: it keeps its row, and the code read for it.
      for (const plan of [...listed].sort((a, b) => alive(b) - alive(a))) {
        if (!keeper && serves(plan)) keeper = plan;
        else paid = await this.removeOrPaid(storeId, plan);
        if (paid) break;
      }
    }
    const goneBut = (kept: ChargePlan | null) => known.filter((row) => row.providerId !== kept?.id).map((row) => row.id);

    if (paid) {
      // Money that arrived wins over everything else the order had waiting.
      for (const plan of listed) {
        if (plan.id !== paid.id && !isPaidPlan(plan)) await this.charges.remove(storeId, plan).catch((error: unknown) => this.logger.error({ storeId, orderId: want.orderId, chargeId: plan.id, reason: reasonOf(error) }, 'Could not remove a charge beside a paid one'));
      }
      await this.settle(talk, paid, goneBut(paid));
      // Found paid by the customer's own asking: told as any payment approved is (BEELINK-207).
      await this.news.tell(storeId, want.orderId, null);
      throw conflict('PAYMENT_ALREADY_PAID', 'The order was already paid');
    }
    if (keeper) return this.settle(talk, keeper, goneBut(keeper));

    // The claim first: one lost meanwhile must neither give up on rows nor create.
    await this.renew(talk);
    // Nothing of the order is left at Asaas: what stood here is gone, whatever comes of the creation.
    await this.underShopLock(storeId, (tx) => cancelRows(tx, goneBut(null), now));
    const charge = await this.charges
      .create(storeId, {
        orderId: want.orderId,
        payer: talk.payer,
        billingType: want.method,
        totalCents: want.totalCents,
        installments: want.installments,
        dueDate: dueDateOf(want.method, now),
        description: `Pedido nº ${talk.orderNumber} — ${talk.storeName}`,
      })
      .catch(async (error: unknown) => {
        // Asaas's no to this charge, kept for the shop in Asaas's words.
        if (error instanceof AsaasRefused) await this.underShopLock(storeId, (tx) => recordRefusal(tx, { id: want.orderId, storeId, ...want }, error.reason));
        throw error;
      });
    return this.settle(talk, planCreated(charge, want), []);
  }

  /**
   * The charge written as the order's, under the shop's lock and against the order as it is by now:
   * one cancelled, of another total, or paid by another charge while Asaas was being asked no longer
   * wants this one, and it is removed again instead. Written only by the request that still holds
   * the claim: one that lost it leaves everything to whoever took it.
   */
  private async settle(talk: Talk, plan: ChargePlan, gone: readonly string[]): Promise<OrderPaymentModel> {
    const { storeId, want } = talk;
    const now = new Date();
    const order = { id: want.orderId, storeId, method: want.method };
    const written = await this.underShopLock(storeId, async (tx) => {
      const current = await tx.order.findUniqueOrThrow({ where: { id: want.orderId }, select: { status: true, totalCents: true, deliveryFeeCents: true, paymentClaimedUntil: true } });
      if (current.paymentClaimedUntil?.getTime() !== talk.until.getTime()) return { row: null, unwanted: 'LOST' as const };
      const paidByAnother = await tx.orderPayment.count({ where: { orderId: want.orderId, providerId: { not: plan.id }, status: { in: [...PAID_STATUSES] } } });
      if (paidByAnother > 0) {
        // A second payment of an order already paid: kept for the shop to settle (BEELINK-206).
        const first = isPaidPlan(plan) && (await noteStray(tx, { orderId: want.orderId, storeId, providerId: plan.id, method: methodOfPlan(plan, want.method), amountCents: plan.totalCents }, 'ORDER_ALREADY_PAID', now));
        return { row: null, unwanted: 'PAID' as const, strayed: first };
      }
      if (!isPaidPlan(plan)) {
        if (current.status === 'CANCELLED') return { row: null, unwanted: 'CANCELLED' as const };
        if (current.deliveryFeeCents === null || current.totalCents !== want.totalCents) return { row: null, unwanted: 'CHANGED' as const };
      }

      await cancelRows(tx, gone, now);
      const row = await applyCharge(tx, order, plan, now);
      await tx.order.update({ where: { id: want.orderId }, data: { paymentClaimedUntil: null } });
      return { row, unwanted: null };
    });
    if (written.row) return written.row;

    if ('strayed' in written && written.strayed) await this.news.tell(storeId, want.orderId, 'ORDER_ALREADY_PAID');
    if (written.unwanted === 'LOST') throw conflict('PAYMENT_IN_PROGRESS', "The order's charge is being made: read it again in a moment");
    if (isPaidPlan(plan)) {
      this.logger.error({ storeId, orderId: want.orderId, chargeId: plan.id }, 'A second paid charge stands on an order already paid');
    } else {
      await this.charges.remove(storeId, plan).catch(async (error: unknown) => {
        // Still to be paid at Asaas and wanted by nobody: kept as the order's charge, with why, rather than left unknown here.
        this.logger.error({ storeId, orderId: want.orderId, chargeId: plan.id, reason: reasonOf(error) }, 'Could not remove the charge of an order that changed while it was made');
        await this.underShopLock(storeId, async (tx) => {
          await applyCharge(tx, order, plan, now);
          await noteRefusal(tx, want.orderId, reasonOf(error));
        }).catch(() => undefined);
      });
    }
    if (written.unwanted === 'CANCELLED') throw conflict('ORDER_CANCELLED', 'A cancelled order is not charged');
    if (written.unwanted === 'PAID') throw conflict('PAYMENT_ALREADY_PAID', 'The order was already paid');
    throw conflict('PAYMENT_IN_PROGRESS', 'The order changed while its charge was being made: ask again');
  }

  /**
   * A charge removed from Asaas — or found paid, when Asaas refuses to remove it: the plan as it
   * stands then, which wins. Refused and still to be paid, the talk stops (`ChargeStands`).
   */
  private async removeOrPaid<Plan extends Pick<ChargePlan, 'id' | 'installmentId'>>(storeId: string, plan: Plan): Promise<(Plan & { status: string }) | null> {
    try {
      await this.charges.remove(storeId, plan);
      return null;
    } catch (error) {
      if (!(error instanceof AsaasRefused)) throw error;
      const now = await this.charges.read(storeId, plan.id);
      if (!now || now.deleted) return null;
      if (wasPaid(statusSaidBy(now.status, null))) return { ...plan, status: now.status };
      throw new ChargeStands(error.reason);
    }
  }

  /** The claim pushed ahead just before the one call that cannot be undone — and only while it is still this request's. */
  private async renew(talk: Talk): Promise<void> {
    const until = new Date(Date.now() + CLAIM_MS);
    const { count } = await this.prisma.order.updateMany({ where: { id: talk.want.orderId, paymentClaimedUntil: talk.until }, data: { paymentClaimedUntil: until } });
    if (count === 0) throw conflict('PAYMENT_IN_PROGRESS', "The order's charge is being made: read it again in a moment");
    talk.until = until;
  }

  private async holdFor(talk: Talk, ms: number): Promise<void> {
    await this.prisma.order.updateMany({ where: { id: talk.want.orderId, paymentClaimedUntil: talk.until }, data: { paymentClaimedUntil: new Date(Date.now() + ms) } });
  }

  private async letGo(talk: Talk): Promise<void> {
    await this.prisma.order.updateMany({ where: { id: talk.want.orderId, paymentClaimedUntil: talk.until }, data: { paymentClaimedUntil: null } });
  }

  /**
   * How a failed talk is told to the customer: a stable code, never Asaas's words and never why the
   * shop cannot be reached. Asaas's own refusal is kept for the shop on the way.
   */
  private async said(error: unknown, talk: Talk): Promise<unknown> {
    const { storeId, want } = talk;
    if (error instanceof HttpException) return error;
    if (error instanceof AsaasStoreUnavailable) return unavailable();
    if (error instanceof ChargeStands) {
      await this.underShopLock(storeId, (tx) => noteRefusal(tx, want.orderId, error.message));
      return unavailable();
    }
    if (error instanceof AsaasRefused) {
      this.logger.warn({ storeId, orderId: want.orderId, reason: error.message }, 'Asaas refused a request about a charge');
      return new BadGatewayException(paymentError('PAYMENT_REFUSED', 'The charge could not be made'));
    }
    if (error instanceof AsaasUnreachable) {
      this.logger.warn({ storeId, orderId: want.orderId, reason: error.message }, 'Asaas did not answer about a charge');
      return unavailable();
    }
    return error;
  }

  private underShopLock<T>(storeId: string, work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM "stores" WHERE "id" = ${storeId}::uuid FOR UPDATE`;
      return work(tx);
    });
  }
}

const reasonOf = (error: unknown): string => (error instanceof Error ? error.message : 'Unknown failure');

function conflict(code: Parameters<typeof paymentError>[0], message: string): ConflictException {
  return new ConflictException(paymentError(code, message));
}

function unavailable(): ServiceUnavailableException {
  return new ServiceUnavailableException(paymentError('PAYMENT_UNAVAILABLE', 'The shop cannot be paid online right now'));
}
