// Nest
import { Injectable, Logger } from '@nestjs/common';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { AsaasStoreUnavailable } from '../integrations/asaas/asaas-charges.service.js';
import { AsaasThrottled } from '../integrations/asaas/asaas.client.js';
import { OrderPayments } from '../payments/order-payments.service.js';
import { CHECKED, pushCheck, restChecks } from '../payments/payment-facts.js';
import { PaymentSync } from '../payments/payment-sync.service.js';
import { RECONCILE_BATCH } from './payment-events.constants.js';

const WAITING: readonly string[] = ['PENDING', 'OVERDUE'];

/**
 * Asks Asaas after the charges a webhook may have missed (BEELINK-206) — an event that never came,
 * a queue Asaas paused, bee-link down past the retries: the waiting charges of shops whose
 * connection stands, the oldest first, a batch a pass. What it learns goes through the same door as
 * the webhook (`PaymentSync`), so a fact both reach is written once.
 *
 * Each charge is asked about less and less often (`nextCheckAfter`), pushed before Asaas is asked,
 * so one that keeps failing waits longer too. A shop Asaas asked to wait for (429), or whose key
 * does not open, is left for the rest of the pass — the other shops still go.
 *
 * A paid charge with a refund on its way (BEELINK-208) is asked about too, until Asaas concludes it:
 * on a card that takes days, and its event may be the one that never came.
 *
 * It also ends what was left owing: a charge still waiting on an order that was cancelled, or whose
 * total is no longer the charge's — a removal Asaas did not answer when the order changed — is
 * taken out now, by `OrderPayments.release`.
 */
@Injectable()
export class PaymentReconciliation {
  private readonly logger = new Logger(PaymentReconciliation.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly heard: PaymentSync,
    private readonly payments: OrderPayments,
  ) {}

  /** One pass at `now`: answers how many charges Asaas was asked about. */
  async checkDue(now: Date): Promise<number> {
    const connected = await this.prisma.storeIntegration.findMany({ where: { provider: 'ASAAS', status: 'CONNECTED' }, select: { storeId: true } });
    if (connected.length === 0) return 0;

    const due = await this.prisma.orderPayment.findMany({
      where: { storeId: { in: connected.map((row) => row.storeId) }, providerId: { not: null }, AND: [CHECKED, { OR: [{ nextCheckAt: null }, { nextCheckAt: { lte: now } }] }] },
      orderBy: { createdAt: 'asc' },
      take: RECONCILE_BATCH,
      select: { id: true, storeId: true, orderId: true, checks: true, amountCents: true, status: true, order: { select: { status: true, totalCents: true, deliveryFeeCents: true } } },
    });

    const resting = new Set<string>();
    let asked = 0;
    for (const row of due) {
      if (resting.has(row.storeId)) continue;
      if (!(await pushCheck(this.prisma, row, now))) continue;
      asked += 1;
      try {
        // Only a charge still to be paid can be one the order no longer wants.
        const unwanted = WAITING.includes(row.status) && (row.order.status === 'CANCELLED' || row.order.deliveryFeeCents === null || row.order.totalCents !== row.amountCents);
        const leftovers = unwanted || (await this.heard.sync(row.storeId, row.orderId)).leftovers;
        // Never fails: what Asaas still refuses stays on the charge, and is tried at its next turn.
        if (leftovers) await this.payments.release(row.storeId, row.orderId);
      } catch (error) {
        // Asaas asked for time: none of the shop's charges is due before it.
        if (error instanceof AsaasThrottled && error.retryAt && error.retryAt > now) await restChecks(this.prisma, row.storeId, error.retryAt);
        if (error instanceof AsaasThrottled || error instanceof AsaasStoreUnavailable) resting.add(row.storeId);
        this.logger.warn({ storeId: row.storeId, orderId: row.orderId, reason: error instanceof Error ? error.message : 'Unknown failure' }, 'Could not ask Asaas of a waiting charge');
      }
    }
    return asked;
  }
}
