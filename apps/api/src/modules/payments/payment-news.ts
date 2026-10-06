// Nest
import { Injectable } from '@nestjs/common';

// Types
import type { StrayPaymentReason } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { RealtimePublisher } from '../realtime/realtime-publisher.js';
import { OrderPaidMailer } from './order-paid-mailer.js';
import { OrderRefundMailer } from './order-refund-mailer.js';
import { claimPaidNews } from './payment-facts.js';
import { shownPaymentOf } from './payment.mapper.js';

/**
 * Tells the shop's panel and the order's customer that where its charge stands changed (BEELINK-206),
 * once that is committed. It names the order and no more: both sides read it again with the checks
 * they always have. A payment just approved (BEELINK-207) is told as such on one event alone — the
 * first to take `OrderPaidNotice.toldAt` — and its e-mail, owed since the payment was written, is
 * sent now rather than at the outbox's next sweep. So is a refund's (BEELINK-208).
 */
@Injectable()
export class PaymentNews {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimePublisher,
    private readonly mailer: OrderPaidMailer,
    private readonly refundMailer: OrderRefundMailer,
  ) {}

  async tell(storeId: string, orderId: string, stray: StrayPaymentReason | null): Promise<void> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, select: { number: true, customerId: true, payments: { select: { status: true, expiresAt: true, paidAt: true, createdAt: true } } } });
    const shown = order ? shownPaymentOf(order.payments) : null;
    if (!order || !shown) return;
    const approved = await claimPaidNews(this.prisma, orderId, new Date());
    if (approved) this.mailer.dispatch();
    // A refund just taken owes its e-mail since it was written (BEELINK-208): a sweep with nothing owed sends nothing.
    this.refundMailer.dispatch();
    this.realtime.publish({ storeId, customerId: order.customerId }, { type: 'order.payment', orderNumber: order.number, status: shown.status, stray, approved });
  }
}
