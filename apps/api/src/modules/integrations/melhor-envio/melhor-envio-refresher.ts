// Nest
import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';

// App
import { env } from '../../../shared/config/env.js';
import { MelhorEnvioService } from './melhor-envio.service.js';

/** Between passes. A token is renewed a week ahead, so an hour late costs nothing. */
const PASS_MS = 60 * 60 * 1000;

/**
 * Keeps every shop's Melhor Envio connection alive (BEELINK-182): each hour, the connections whose
 * access ends within the week are renewed. Without it a shop that buys no label for 45 days would
 * find its refresh token gone, and have to connect again.
 */
@Injectable()
export class MelhorEnvioRefresher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MelhorEnvioRefresher.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(private readonly melhorEnvio: MelhorEnvioService) {}

  onModuleInit(): void {
    // A suite renews when it means to, at the instant it names.
    if (env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => void this.tick(), PASS_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const renewed = await this.melhorEnvio.renewDue(new Date());
      if (renewed > 0) this.logger.log({ renewed }, 'Renewed Melhor Envio connections');
    } catch (error) {
      this.logger.error({ err: error }, 'Could not renew the Melhor Envio connections');
    } finally {
      this.running = false;
    }
  }
}
