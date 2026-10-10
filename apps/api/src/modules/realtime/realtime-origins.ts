// Nest
import { Injectable, Logger } from '@nestjs/common';

// App
import { env } from '../../shared/config/env.js';
import { PrismaService } from '../../shared/prisma/prisma.service.js';

/** How long a copy of the active domains stands before the next origin asked about reads again. */
export const REALTIME_ORIGINS_FRESH_MS = 60_000;

/**
 * How soon an origin the copy does not know has it read again: a domain made active a moment ago
 * is answered within seconds, and a flood of unknown origins costs one read in this long.
 */
export const REALTIME_ORIGINS_MISS_MS = 5_000;

/** How long after a read that failed the next one is tried; until then the last copy stands. */
export const REALTIME_ORIGINS_RETRY_MS = 5_000;

/**
 * The host of an origin that could be a shop's own domain, or null. An origin and nothing more —
 * no path, no credentials — and, in production, `https` on its own port: a shop's domain is served
 * nowhere else. In development and under test the scheme and the port are whatever came, since
 * nothing terminates TLS there and the port is the web server's own.
 */
export function shopHostOfOrigin(origin: string, production: boolean): string | null {
  if (!URL.canParse(origin)) return null;
  const url = new URL(origin);
  if (url.origin !== origin || (url.protocol !== 'https:' && url.protocol !== 'http:')) return null;
  if (production && (url.protocol !== 'https:' || url.port !== '')) return null;
  return url.hostname;
}

/**
 * Which origins the real-time channel's long-polling transport answers (BEELINK-284): the web's
 * (`CORS_ORIGINS`), and the origin of every shop's own `ACTIVE` domain — where the page is the
 * shop's and the socket is still the platform's. Never a wildcard, never "whatever asked".
 *
 * This guards nothing, as the gateway says: a WebSocket is not subject to CORS, and the ticket is
 * what lets a socket in. It only lets the transport answer a page that is entitled to a ticket.
 *
 * The domains are read from the database into a copy that stands a minute; an origin the copy does
 * not know has it read again once it is a few seconds old; one read in flight serves everyone who
 * asks meanwhile; and a read that fails leaves the last copy standing.
 */
@Injectable()
export class RealtimeOrigins {
  private readonly logger = new Logger(RealtimeOrigins.name);
  private readonly web: ReadonlySet<string> = new Set(env.CORS_ORIGINS);
  private hosts: ReadonlySet<string> = new Set();
  private readAt: number | null = null;
  private retryAt = 0;
  private reading: Promise<void> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async allows(origin: string | undefined): Promise<boolean> {
    if (!origin) return false;
    if (this.web.has(origin)) return true;

    const host = shopHostOfOrigin(origin, env.NODE_ENV === 'production');
    if (!host) return false;

    const now = Date.now();
    const age = this.readAt === null ? Infinity : now - this.readAt;
    const due = age >= REALTIME_ORIGINS_FRESH_MS || (!this.hosts.has(host) && age >= REALTIME_ORIGINS_MISS_MS);
    if (due && now >= this.retryAt) {
      this.reading ??= this.read().finally(() => {
        this.reading = null;
      });
      await this.reading;
    }

    return this.hosts.has(host);
  }

  private async read(): Promise<void> {
    try {
      const rows = await this.prisma.store.findMany({ where: { customDomainStatus: 'ACTIVE', customDomain: { not: null } }, select: { customDomain: true } });
      this.hosts = new Set(rows.flatMap((row) => (row.customDomain ? [row.customDomain] : [])));
      this.readAt = Date.now();
    } catch (error) {
      this.retryAt = Date.now() + REALTIME_ORIGINS_RETRY_MS;
      this.logger.error(error);
    }
  }
}
