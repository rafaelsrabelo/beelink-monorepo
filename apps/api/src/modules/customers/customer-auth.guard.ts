// Nest
import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

// App
import { CUSTOMER_TOKEN_KIND, SessionService } from '../auth/session.service.js';
import { PURCHASE_TOKEN_KIND, type Buyer } from './buyers.service.js';
import { OPEN_TO_PURCHASE } from './customer.decorators.js';

export interface AuthenticatedCustomer {
  userId: string;
  sessionId: string;
}

interface AccessTokenPayload {
  sub: string;
  sid?: string;
  kind?: string;
  /** A purchase session's: its id, and the shop it was opened at. */
  pid?: string;
  store?: string;
}

/**
 * The shop window's door: a bearer token opened through it, and nothing else. A shopkeeper's token
 * is refused here as a shopper's is refused behind the panel's guard — the same account, two
 * sessions that never stand in for each other. The session has to still be alive, as on the panel.
 *
 * Routes that use it are `@Public()` to the global guard, which would refuse a shopper's token.
 *
 * A purchase session (plan 2026-11-06--whatsapp-primeiro) passes only where a route says
 * `@OpenToPurchase()`; anywhere else it is refused as if there were no token. Its token is signed and
 * short, and has no session row to be alive in.
 */
@Injectable()
export class CustomerAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly sessions: SessionService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      customer?: AuthenticatedCustomer;
      buyer?: Buyer;
    }>();
    const header = request.headers.authorization;
    const token = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : undefined;

    if (!token) throw this.unauthenticated();

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessTokenPayload>(token);
    } catch {
      throw this.unauthenticated();
    }

    if (payload.kind === PURCHASE_TOKEN_KIND) {
      const open = this.reflector.getAllAndOverride<boolean | undefined>(OPEN_TO_PURCHASE, [context.getHandler(), context.getClass()]);
      if (!open || !payload.pid || !payload.store) throw this.unauthenticated();
      request.buyer = { kind: 'purchase', customerId: payload.sub, purchaseId: payload.pid, storeId: payload.store };
      return true;
    }
    if (payload.kind !== CUSTOMER_TOKEN_KIND || !payload.sid) throw this.unauthenticated();
    if (!(await this.sessions.isActive(payload.sid))) throw this.unauthenticated();

    request.customer = { userId: payload.sub, sessionId: payload.sid };
    request.buyer = { kind: 'account', userId: payload.sub };
    return true;
  }

  private unauthenticated(): UnauthorizedException {
    return new UnauthorizedException({ errorCode: 'AUTH_UNAUTHENTICATED', message: "A shopper's bearer token is required" });
  }
}
