// Nest
import { Injectable } from '@nestjs/common';

// Types
import type { StrayPaymentReason } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { RealtimePublisher } from '../realtime/realtime-publisher.js';
import { shownPaymentOf } from './payment.mapper.js';

/**
 * Tells the shop's panel and the order's customer that where its charge stands changed (BEELINK-206),
 * once that is committed. It names the order and no more: both sides read it again with the checks
 * they always have. This is also where a payment just approved is known, for whatever else it owes
 * — the customer's e-mail and the panel's bell are BEELINK-207's.
 */
@Injectable()
export class PaymentNews {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimePublisher,
  ) {}

  async tell(storeId: string, orderId: string, stray: StrayPaymentReason | null): Promise<void> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, select: { number: true, customerId: true, payments: { select: { status: true, expiresAt: true, createdAt: true } } } });
    const shown = order ? shownPaymentOf(order.payments) : null;
    if (!order || !shown) return;
    this.realtime.publish({ storeId, customerId: order.customerId }, { type: 'order.payment', orderNumber: order.number, status: shown.status, stray });
  }
}
