// Node
import { randomUUID } from 'node:crypto';

// Nest
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

// Types
import type { PurchaseSession } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { CustomersService } from './customers.service.js';

/** A purchase session's token says so: never a customer's, never a shopkeeper's (plan 2026-11-06--whatsapp-primeiro). */
export const PURCHASE_TOKEN_KIND = 'purchase';
/** Long enough to buy, short enough that a phone left behind is not a way into anyone's record for long. Not renewed. */
export const PURCHASE_SESSION_TTL_SECONDS = 2 * 60 * 60;

/**
 * Who is buying at a route open to both: the account, signed in with its session; or a purchase session,
 * which is a shop's record of a WhatsApp it knew, for this purchase alone.
 */
export type Buyer = { kind: 'account'; userId: string } | { kind: 'purchase'; customerId: string; purchaseId: string; storeId: string };

/** The buyer at this shop: its record, and the account or the purchase it came by. */
export interface BuyerAt {
  storeId: string;
  customerId: string;
  /** Null for a purchase session: nobody signed in. */
  userId: string | null;
  /** The purchase session's id, which its orders carry; null for the account. */
  purchaseId: string | null;
}

/**
 * The purchase session's two ends: opening one for a record, and reading a buyer back at a shop. A
 * token signed by the API and nothing kept: it is short, it is not renewed, and ending it is the web
 * forgetting it — there is nothing to revoke.
 */
@Injectable()
export class Buyers {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customers: CustomersService,
    private readonly jwt: JwtService,
  ) {}

  async open(storeId: string, customerId: string): Promise<PurchaseSession> {
    const accessToken = await this.jwt.signAsync({ sub: customerId, pid: randomUUID(), store: storeId, kind: PURCHASE_TOKEN_KIND }, { expiresIn: PURCHASE_SESSION_TTL_SECONDS });
    return { accessToken, accessTokenExpiresAt: new Date(Date.now() + PURCHASE_SESSION_TTL_SECONDS * 1000).toISOString() };
  }

  /**
   * The buyer's record at this shop. The account's as `shopperAt` reads it; a purchase session's only
   * at the shop it was opened at, and only while the record is there — another shop's is a stranger here.
   */
  async at(storeSlug: string, buyer: Buyer): Promise<BuyerAt> {
    if (buyer.kind === 'account') return { ...(await this.customers.shopperAt(storeSlug, buyer.userId)), userId: buyer.userId, purchaseId: null };

    const { storeId } = await this.customers.scopeOf(storeSlug);
    const record = buyer.storeId === storeId ? await this.prisma.customer.findFirst({ where: { id: buyer.customerId, storeId }, select: { id: true } }) : null;
    if (!record) throw new UnauthorizedException({ errorCode: 'AUTH_UNAUTHENTICATED', message: 'This purchase session belongs to another shop' });
    return { storeId, customerId: record.id, userId: null, purchaseId: buyer.purchaseId };
  }
}
