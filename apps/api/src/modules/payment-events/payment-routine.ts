// Nest
import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';

// App
import { env } from '../../shared/config/env.js';
import { AsaasWebhookKeeper } from '../integrations/asaas/asaas-webhook-keeper.js';
import { AsaasEvents } from './asaas-events.service.js';
import { PAYMENT_ROUTINE_MS } from './payment-events.constants.js';
import { PaymentReconciliation } from './payment-reconciliation.js';
import { UnpaidOrders } from './unpaid-orders.js';

/**
 * The clock of the payments (BEELINK-206), every minute: the events that failed are tried again,
 * the waiting charges due are asked about, the unpaid orders past their time are cancelled, the
 * shops' webhooks not looked at for a day are looked at, and the events done a month ago go. Each
 * step decides by the database what is due, so a pass with nothing to do costs a few queries; each
 * fails alone.
 */
@Injectable()
export class PaymentRoutine implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentRoutine.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly events: AsaasEvents,
    private readonly reconciliation: PaymentReconciliation,
    private readonly unpaid: UnpaidOrders,
    private readonly keeper: AsaasWebhookKeeper,
  ) {}

  onModuleInit(): void {
    // A suite runs each step when it means to, at the instant it names.
    if (env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => void this.tick(), PAYMENT_ROUTINE_MS);
    // A pass in waiting is no reason for the process to stay up.
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    const now = new Date();
    try {
      await this.step('work the Asaas events', () => this.events.flush());
      await this.step('reconcile the waiting charges', () => this.reconciliation.checkDue(now));
      await this.step('cancel the unpaid orders', () => this.unpaid.cancelDue(now));
      await this.step("check the shops' Asaas webhooks", () => this.keeper.checkDue(now));
      await this.step('prune the Asaas events', () => this.events.prune(now));
    } finally {
      this.running = false;
    }
  }

  private async step(what: string, work: () => Promise<unknown>): Promise<void> {
    try {
      await work();
    } catch (error) {
      this.logger.error({ err: error }, `Could not ${what}`);
    }
  }
}
