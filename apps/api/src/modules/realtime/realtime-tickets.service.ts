// Node
import { createHash, randomBytes } from 'node:crypto';

// Nest
import { Injectable } from '@nestjs/common';

// Types
import type { RealtimeTicket } from '@harness-monorepo/contracts';
import type { AuthenticatedUser } from '../auth/auth.decorators.js';
import type { AuthenticatedCustomer } from '../customers/customer-auth.guard.js';
import type { RealtimeIdentity } from './realtime-socket.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { CustomersService } from '../customers/customers.service.js';
import { StoresService } from '../stores/stores.service.js';
import { REALTIME_TICKET_TTL_MS } from './realtime.constants.js';

/** A ticket's row, as issued and as the delete that takes it hands it back. */
interface TicketRow {
  audience: 'SHOP' | 'CUSTOMER';
  storeId: string;
  customerId: string | null;
  sessionId: string;
}

function hashOf(ticket: string): string {
  return createHash('sha256').update(ticket).digest('hex');
}

function identityOf(row: TicketRow): RealtimeIdentity | null {
  if (row.audience === 'SHOP') return { audience: 'SHOP', storeId: row.storeId, sessionId: row.sessionId };
  return row.customerId ? { audience: 'CUSTOMER', storeId: row.storeId, customerId: row.customerId, sessionId: row.sessionId } : null;
}

/**
 * Tickets to the real-time channel: issued to a session the API already checked, taken once by the
 * socket. Kept by their hash, so a copy of the table or of the database's log holds none a socket
 * could use; and any instance of the API takes one — once: the delete that takes it is the only way
 * to read it.
 */
@Injectable()
export class RealtimeTicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
    private readonly customers: CustomersService,
  ) {}

  /** For a shopkeeper, to the room of a shop they own. */
  async issueForShop(storeSlug: string, user: AuthenticatedUser): Promise<RealtimeTicket> {
    const storeId = await this.stores.ownedStoreId(storeSlug, user.id);
    return this.issue({ audience: 'SHOP', storeId, customerId: null, sessionId: user.sessionId });
  }

  /** For a shopper, to their own room at the shop. */
  async issueForCustomer(storeSlug: string, customer: AuthenticatedCustomer): Promise<RealtimeTicket> {
    const { storeId, customerId } = await this.customers.shopperAt(storeSlug, customer.userId);
    return this.issue({ audience: 'CUSTOMER', storeId, customerId, sessionId: customer.sessionId });
  }

  /**
   * Who the ticket lets in, or null for one unknown, taken already, past its minute — or issued to a
   * session that has ended since: a sign-out inside the ticket's minute is not outrun by the socket.
   */
  async redeem(ticket: string): Promise<RealtimeIdentity | null> {
    if (!/^[A-Za-z0-9_-]{43}$/.test(ticket)) return null;
    const [taken] = await this.prisma.$queryRaw<TicketRow[]>`
      DELETE FROM "realtime_tickets" AS t
      USING "sessions" AS s
      WHERE t."tokenHash" = ${hashOf(ticket)} AND t."expiresAt" > ${new Date()}
        AND s."id" = t."sessionId" AND s."revokedAt" IS NULL
      RETURNING t."audience", t."storeId", t."customerId", t."sessionId"`;
    return taken ? identityOf(taken) : null;
  }

  private async issue(row: TicketRow): Promise<RealtimeTicket> {
    const now = Date.now();
    // 32 random bytes: 43 characters of base64url, nothing to guess.
    const ticket = randomBytes(32).toString('base64url');
    const expiresAt = new Date(now + REALTIME_TICKET_TTL_MS);
    await this.prisma.$transaction([
      // The ones nobody took: swept here, so the table never outgrows a minute of tickets.
      this.prisma.realtimeTicket.deleteMany({ where: { expiresAt: { lte: new Date(now) } } }),
      this.prisma.realtimeTicket.create({ data: { tokenHash: hashOf(ticket), ...row, expiresAt } }),
    ]);
    return { ticket, expiresAt: expiresAt.toISOString() };
  }
}
