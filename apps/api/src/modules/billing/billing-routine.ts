// Nest
import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';

// App
import { env } from '../../shared/config/env.js';
import { BillingEvents } from './billing-events.service.js';
import { BILLING_ROUTINE_MS } from './billing.constants.js';
import { PageLocks } from './page-locks.service.js';
import { PlatformWebhookKeeper } from './platform-webhook-keeper.js';
import { SubscriptionSync } from './subscription-sync.service.js';

/**
 * The clock of bee-link's own charging (BEELINK-221), every minute: the events that failed are tried
 * again, what the clock alone moved is written (BEELINK-223: a trial, a paid period or a grace that
 * ran out), the pages whose turn came are read at Asaas — for the event that never arrived — the
 * webhook is looked at once a day, and the events done a month ago go. Each step decides by the
 * database what is due, so a pass with nothing to do costs a few queries; each fails alone. It never
 * runs where nothing is charged or there is no key: then nothing here asks Asaas anything, and no page
 * locks.
 */
@Injectable()
export class BillingRoutine implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BillingRoutine.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly events: BillingEvents,
    private readonly payments: SubscriptionSync,
    private readonly keeper: PlatformWebhookKeeper,
    private readonly locks: PageLocks,
  ) {}

  onModuleInit(): void {
    // A suite runs each step when it means to, at the instant it names.
    if (env.NODE_ENV === 'test' || !this.payments.running) return;
    this.timer = setInterval(() => void this.pass(new Date()), BILLING_ROUTINE_MS);
    // A pass in waiting is no reason for the process to stay up.
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** One pass at `now`; one already running is not run twice. */
  async pass(now: Date): Promise<void> {
    if (this.running || !this.payments.running) return;
    this.running = true;
    try {
      // Through the same door as a delivery's dispatch: one sweep at a time in this process.
      await this.step('work the billing events', async () => {
        this.events.dispatch();
        await this.events.settled();
      });
      // After the events, which may have brought a payment, and before Asaas is read for the pages whose period just ended.
      await this.step("write what the clock moved of the pages' standing", () => this.locks.settle(now));
      await this.step('read the pages due at Asaas', () => this.payments.checkDue(now));
      await this.step("keep bee-link's own Asaas webhook", () => this.keeper.checkDue(now));
      await this.step('prune the billing events', () => this.events.prune(now));
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
