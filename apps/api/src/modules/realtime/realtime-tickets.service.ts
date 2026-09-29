// Node
import { createHash, randomBytes } from 'node:crypto';

// Nest
import { Injectable } from '@nestjs/common';

// Types
import type { RealtimeTicket } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { CustomersService } from '../customers/customers.service.js';
import { StoresService } from '../stores/stores.service.js';
import { REALTIME_TICKET_TTL_MS } from './realtime.constants.js';

/** Who a ticket let in, once taken. */
export interface RealtimeIdentity {
  audience: 'SHOP' | 'CUSTOMER';
  storeId: string;
  customerId: string | null;
  userId: string;
}

function hashOf(ticket: string): string {
  return createHash('sha256').update(ticket).digest('hex');
}

/**
 * Tickets to the real-time channel: issued to a session the API already checked, taken once by the
 * socket. Kept by their hash in the database, so a ticket leaked from a log opens nothing, and any
 * instance of the API takes it — once: the delete that takes it is the only way to read it.
 */
@Injectable()
export class RealtimeTicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
    private readonly customers: CustomersService,
  ) {}

  /** For a shopkeeper, to the room of a shop they own. */
  async issueForShop(storeSlug: string, userId: string): Promise<RealtimeTicket> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    return this.issue({ audience: 'SHOP', storeId, customerId: null, userId });
  }

  /** For a shopper, to their own room at the shop. */
  async issueForCustomer(storeSlug: string, userId: string): Promise<RealtimeTicket> {
    const { storeId, customerId } = await this.customers.shopperAt(storeSlug, userId);
    return this.issue({ audience: 'CUSTOMER', storeId, customerId, userId });
  }

  /** Who the ticket lets in, or null for one unknown, taken already or past its minute. */
  async redeem(ticket: string): Promise<RealtimeIdentity | null> {
    if (!/^[A-Za-z0-9_-]{43}$/.test(ticket)) return null;
    const [taken] = await this.prisma.$queryRaw<RealtimeIdentity[]>`
      DELETE FROM "realtime_tickets"
      WHERE "tokenHash" = ${hashOf(ticket)} AND "expiresAt" > ${new Date()}
      RETURNING "audience", "storeId", "customerId", "userId"`;
    return taken ?? null;
  }

  private async issue(identity: RealtimeIdentity): Promise<RealtimeTicket> {
    const now = Date.now();
    // 32 random bytes: 43 characters of base64url, nothing to guess.
    const ticket = randomBytes(32).toString('base64url');
    const expiresAt = new Date(now + REALTIME_TICKET_TTL_MS);
    await this.prisma.$transaction([
      // The ones nobody took: swept here, so the table never outgrows a minute of tickets.
      this.prisma.realtimeTicket.deleteMany({ where: { expiresAt: { lte: new Date(now) } } }),
      this.prisma.realtimeTicket.create({ data: { tokenHash: hashOf(ticket), ...identity, expiresAt } }),
    ]);
    return { ticket, expiresAt: expiresAt.toISOString() };
  }
}
