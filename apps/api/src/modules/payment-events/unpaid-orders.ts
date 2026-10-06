// Nest
import { ConflictException, Injectable, Logger } from '@nestjs/common';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { AsaasStoreUnavailable } from '../integrations/asaas/asaas-charges.service.js';
import { AsaasThrottled } from '../integrations/asaas/asaas.client.js';
import { OrdersService } from '../orders/orders.service.js';
import { PAID_STATUSES } from '../payments/payment-status.js';
import { PaymentSync } from '../payments/payment-sync.service.js';
import { UNPAID_BATCH, UNPAID_RETRY_MS } from './payment-events.constants.js';

/**
 * An order charged online that nobody paid (BEELINK-206): three days after its total closed
 * (`Order.paymentDueAt`) it is cancelled — the stock, the coupon and the cashback go back, and its
 * customer is told in the conversation and by e-mail, as with any cancellation.
 *
 * Only after Asaas was heard, here and now, to hold no payment for it: `PaymentSync` must succeed.
 * With Asaas silent, asking for time, or the shop's key not opening, the order is left as it is and
 * looked at again in an hour — a payment nobody could see is never cancelled over. An order the
 * shop accepted is cancelled like one it has not: accepting holds nothing. One out for delivery or
 * delivered is not: its goods are gone, and whether it was paid is between the shop and the customer.
 */
@Injectable()
export class UnpaidOrders {
  private readonly logger = new Logger(UnpaidOrders.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly heard: PaymentSync,
    private readonly orders: OrdersService,
  ) {}

  /** One pass at `now`: answers how many orders it cancelled. One order's failure is its own. */
  async cancelDue(now: Date): Promise<number> {
    const due = await this.prisma.order.findMany({
      where: { paymentChannel: 'ONLINE', status: { in: ['RECEIVED', 'ACCEPTED', 'PREPARING'] }, paymentDueAt: { lte: now }, payments: { none: { status: { in: [...PAID_STATUSES] } } } },
      orderBy: { paymentDueAt: 'asc' },
      take: UNPAID_BATCH,
      select: { id: true, storeId: true, number: true },
    });

    const resting = new Set<string>();
    let cancelled = 0;
    for (const order of due) {
      try {
        if (resting.has(order.storeId)) throw new AsaasStoreUnavailable("The shop's Asaas account could not be asked this pass");
        if ((await this.heard.sync(order.storeId, order.id)).paid) continue;
        if (await this.orders.cancelUnpaid(order.storeId, order.number, now)) cancelled += 1;
      } catch (error) {
        // Cancelled by someone else meanwhile: nothing is left to do.
        if (error instanceof ConflictException) continue;
        if (error instanceof AsaasThrottled || error instanceof AsaasStoreUnavailable) resting.add(order.storeId);
        // Out of the head of the line, so the orders behind it are reached; only while it still waits at this deadline.
        await this.prisma.order.updateMany({ where: { id: order.id, paymentDueAt: { lte: now } }, data: { paymentDueAt: new Date(now.getTime() + UNPAID_RETRY_MS) } });
        this.logger.warn({ storeId: order.storeId, orderId: order.id, reason: error instanceof Error ? error.message : 'Unknown failure' }, 'Could not check an unpaid order at Asaas: it is not cancelled');
      }
    }
    return cancelled;
  }
}
