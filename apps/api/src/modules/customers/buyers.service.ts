// Nest
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

// Types
import type { PurchaseSession } from '@harness-monorepo/contracts';
import type { PurchaseSessionModel } from '../../generated/prisma/models.js';
import type { CustomerAddressRow } from '../orders/order-delivery.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { CustomersService } from './customers.service.js';

/** A purchase session's token says so: never a customer's, never a shopkeeper's (plan 2026-11-06--P0-checkout-sem-codigo). */
export const PURCHASE_TOKEN_KIND = 'purchase';
/** Long enough to pay a Pix (three days, BEELINK-206) and come back to the order; not renewed. */
export const PURCHASE_SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

/**
 * Who is buying at a route open to both: the account, signed in with its session; or a visitor's purchase
 * session, which is what they typed at the checkout and the shop's record their order goes on.
 */
export type Buyer = { kind: 'account'; userId: string } | { kind: 'purchase'; purchaseId: string; storeId: string };

/** The buyer at this shop: the record its orders go on, and the account or the visitor's checkout it came by. */
export interface BuyerAt {
  storeId: string;
  customerId: string;
  /** Null for a purchase session: nobody signed in. */
  userId: string | null;
  /** The visitor's checkout — what they typed — or null for the account. */
  purchase: PurchaseSessionModel | null;
  /** Its id, which its orders carry; null for the account. */
  purchaseId: string | null;
}

/** What a visitor typed, as the order's delivery reads an address: who receives it is who typed it. */
export function givenAddressOf(purchase: PurchaseSessionModel): CustomerAddressRow {
  const { name, zipCode, street, number, complement, neighborhood, city, state } = purchase;
  return { name, zipCode, street, number, complement, neighborhood, city, state };
}

/**
 * The purchase session's ends: opening one for a visitor, reading a buyer back at a shop, and ending it.
 * The token carries the session's id and its shop alone; the row says what was typed, which record the
 * order goes on, and whether it still holds — so ending it is marking the row, not waiting for the token.
 */
@Injectable()
export class Buyers {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customers: CustomersService,
    private readonly jwt: JwtService,
  ) {}

  async open(storeId: string, customerId: string, typed: { name: string; email: string; phone: string }): Promise<PurchaseSession> {
    const expiresAt = new Date(Date.now() + PURCHASE_SESSION_TTL_SECONDS * 1000);
    const row = await this.prisma.purchaseSession.create({ data: { storeId, customerId, ...typed, expiresAt }, select: { id: true } });
    const accessToken = await this.jwt.signAsync({ sub: row.id, store: storeId, kind: PURCHASE_TOKEN_KIND }, { expiresIn: PURCHASE_SESSION_TTL_SECONDS });
    return { accessToken, accessTokenExpiresAt: expiresAt.toISOString() };
  }

  /**
   * The buyer's record at this shop. The account's as `shopperAt` reads it; a purchase session's only at
   * the shop it was opened at, while it holds — another shop's, an ended one or an expired one is nobody.
   */
  async at(storeSlug: string, buyer: Buyer): Promise<BuyerAt> {
    if (buyer.kind === 'account') return { ...(await this.customers.shopperAt(storeSlug, buyer.userId)), userId: buyer.userId, purchase: null, purchaseId: null };

    const { storeId } = await this.customers.scopeOf(storeSlug);
    const purchase =
      buyer.storeId === storeId ? await this.prisma.purchaseSession.findFirst({ where: { id: buyer.purchaseId, storeId, endedAt: null, expiresAt: { gt: new Date() } } }) : null;
    if (!purchase) throw new UnauthorizedException({ errorCode: 'AUTH_UNAUTHENTICATED', message: 'No purchase session holds here' });
    return { storeId, customerId: purchase.customerId, userId: null, purchase, purchaseId: purchase.id };
  }

  /** The visitor's "Alterar": the session stops holding at once, whatever its token says. */
  async end(purchaseId: string): Promise<void> {
    await this.prisma.purchaseSession.updateMany({ where: { id: purchaseId, endedAt: null }, data: { endedAt: new Date() } });
  }
}
