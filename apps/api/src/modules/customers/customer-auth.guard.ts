// Nest
import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

// App
import { CUSTOMER_TOKEN_KIND, SessionService } from '../auth/session.service.js';

export interface AuthenticatedCustomer {
  userId: string;
  sessionId: string;
}

interface AccessTokenPayload {
  sub: string;
  sid: string;
  kind?: string;
}

/**
 * The shop window's door: a bearer token opened through it, and nothing else. A shopkeeper's token
 * is refused here as a shopper's is refused behind the panel's guard — the same account, two
 * sessions that never stand in for each other. The session has to still be alive, as on the panel.
 *
 * Routes that use it are `@Public()` to the global guard, which would refuse a shopper's token.
 */
@Injectable()
export class CustomerAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly sessions: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      customer?: AuthenticatedCustomer;
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

    if (payload.kind !== CUSTOMER_TOKEN_KIND) throw this.unauthenticated();
    if (!(await this.sessions.isActive(payload.sid))) throw this.unauthenticated();

    request.customer = { userId: payload.sub, sessionId: payload.sid };
    return true;
  }

  private unauthenticated(): UnauthorizedException {
    return new UnauthorizedException({ errorCode: 'AUTH_UNAUTHENTICATED', message: "A shopper's bearer token is required" });
  }
}
