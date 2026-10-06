// Nest
import { Injectable, Logger, NotFoundException } from '@nestjs/common';

// Types
import type { CustomerOrderPaymentAnswer } from '@harness-monorepo/contracts';
import type { OrderPaymentModel } from '../../generated/prisma/models.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { CustomersService } from '../customers/customers.service.js';
import { AsaasCharges } from '../integrations/asaas/asaas-charges.service.js';
import { OrderPayments } from './order-payments.service.js';
import { READ_CHECK_EVERY_MS } from './payment-checks.js';
import { shownPaymentOf, toCustomerPayment } from './payment.mapper.js';
import { PaymentSync } from './payment-sync.service.js';
import { paymentError } from './payments.constants.js';

/**
 * A shopper's own reading and making of an order's charge (BEELINK-204). Every order is reached
 * through the shopper's record at the shop, so another customer's is not found rather than forbidden.
 */
@Injectable()
export class CustomerPayments {
  private readonly logger = new Logger(CustomerPayments.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly customers: CustomersService,
    private readonly payments: OrderPayments,
    private readonly charges: AsaasCharges,
    private readonly heard: PaymentSync,
  ) {}

  /** The order's charge with what it is paid with; null for an order settled with the shop, and for one with no charge yet. */
  async read(storeSlug: string, userId: string, number: number): Promise<CustomerOrderPaymentAnswer> {
    const { storeId, orderId, stands } = await this.orderOf(storeSlug, userId, number);
    const shown = shownPaymentOf(await this.prisma.orderPayment.findMany({ where: { orderId } }));
    const row = shown && stands && (await this.asked(storeId, shown)) ? shownPaymentOf(await this.prisma.orderPayment.findMany({ where: { orderId } })) : shown;
    if (!row) return { payment: null };
    return { payment: toCustomerPayment(stands ? await this.withPix(storeId, row) : row, new Date(), stands) };
  }

  /** The order's charge made sure of — the one it has, or a new one — and answered as `read` answers it. */
  async charge(storeSlug: string, userId: string, number: number): Promise<CustomerOrderPaymentAnswer> {
    const { storeId, orderId } = await this.orderOf(storeSlug, userId, number);
    const row = await this.payments.ensure(storeId, orderId);
    return { payment: toCustomerPayment(await this.withPix(storeId, row), new Date(), true) };
  }

  private async orderOf(storeSlug: string, userId: string, number: number): Promise<{ storeId: string; orderId: string; stands: boolean }> {
    const { storeId, customerId } = await this.customers.shopperAt(storeSlug, userId);
    const order = await this.prisma.order.findFirst({ where: { storeId, customerId, number }, select: { id: true, status: true } });
    if (!order) throw new NotFoundException(paymentError('ORDER_NOT_FOUND', `No order #${number} of yours in this shop`));
    return { storeId, orderId: order.id, stands: order.status !== 'CANCELLED' };
  }

  /**
   * A waiting charge looked at by its customer (BEELINK-206) — the payment screen reads every few
   * seconds: Asaas is asked of it, at most once a minute a charge, counted from the last time it was
   * heard about by any way. Taken by one read at a time, in the row itself: ten tabs ask once.
   * Answers whether it asked. Never fails: the read answers what bee-link knows.
   */
  private async asked(storeId: string, row: OrderPaymentModel): Promise<boolean> {
    if ((row.status !== 'PENDING' && row.status !== 'OVERDUE') || !row.providerId) return false;
    const now = new Date();
    const stale = new Date(now.getTime() - READ_CHECK_EVERY_MS);
    const { count } = await this.prisma.orderPayment.updateMany({ where: { id: row.id, OR: [{ checkedAt: null }, { checkedAt: { lte: stale } }] }, data: { checkedAt: now } });
    if (count === 0) return false;
    try {
      await this.heard.sync(storeId, row.orderId);
    } catch (error) {
      this.logger.warn({ storeId, orderId: row.orderId, reason: error instanceof Error ? error.message : 'Unknown failure' }, 'Could not ask Asaas of a charge its customer is looking at');
    }
    return true;
  }

  /**
   * A waiting Pix with its code: read from Asaas once and kept, since the code of a charge does not
   * change. The code may end before the charge's due day — an account with no Pix key gets one good
   * until midnight — and then the charge is offered here only that long. Asaas failing to give it
   * answers the charge without a code: the next read asks again.
   */
  private async withPix(storeId: string, row: OrderPaymentModel): Promise<OrderPaymentModel> {
    if (row.method !== 'PIX' || row.status !== 'PENDING' || row.pixPayload || !row.providerId || !row.expiresAt || row.expiresAt <= new Date()) return row;
    try {
      const code = await this.charges.pixQrCode(storeId, row.providerId);
      const expiresAt = code.expiresAt && code.expiresAt < row.expiresAt ? code.expiresAt : row.expiresAt;
      // Only onto a charge still waiting: one paid or removed meanwhile keeps no code.
      await this.prisma.orderPayment.updateMany({ where: { id: row.id, status: 'PENDING' }, data: { pixPayload: code.payload, pixImage: code.encodedImage, expiresAt } });
      return { ...row, pixPayload: code.payload, pixImage: code.encodedImage, expiresAt };
    } catch (error) {
      this.logger.warn({ storeId, orderId: row.orderId, reason: error instanceof Error ? error.message : 'Unknown failure' }, "Could not read a Pix charge's code");
      return row;
    }
  }
}
