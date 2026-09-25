// Nest
import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

// Types
import type { AuthenticatedUser } from './auth.decorators.js';

// App
import { IS_PUBLIC_KEY } from './auth.decorators.js';
import { SessionService } from './session.service.js';

interface AccessTokenPayload {
  sub: string;
  sid: string;
  /** `customer` on a shopper's token; absent on a shopkeeper's. */
  kind?: string;
}

/**
 * Registered globally, so a new route is closed unless it says otherwise with `@Public()`.
 *
 * A valid signature is not enough: the session it names has to still be alive. Signing out and
 * resetting a password revoke sessions, and without this read the access token already handed out
 * would keep working for up to fifteen minutes — which is exactly the window someone resets their
 * password to close.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly sessions: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      user?: AuthenticatedUser;
    }>();

    const header = request.headers.authorization;
    const token =
      typeof header === 'string' && header.startsWith('Bearer ')
        ? header.slice(7)
        : undefined;

    if (!token) throw this.unauthenticated();

    let payload: AccessTokenPayload;

    try {
      payload = await this.jwt.verifyAsync<AccessTokenPayload>(token);
    } catch {
      throw this.unauthenticated();
    }

    // A shopper's token is a valid token for the shop window's door and for nothing behind this one:
    // the panel, the store settings, the catalogue editor. One account, two doors, never crossed.
    if (payload.kind !== undefined) throw this.unauthenticated();

    // Outside the try, so a revoked session is refused for being revoked and not mistaken for a
    // malformed token — and so a database error surfaces instead of reading as "signed out".
    if (!(await this.sessions.isActive(payload.sid)))
      throw this.unauthenticated();

    request.user = { id: payload.sub, sessionId: payload.sid };

    return true;
  }

  private unauthenticated(): UnauthorizedException {
    return new UnauthorizedException({
      errorCode: 'AUTH_UNAUTHENTICATED',
      message: 'A valid bearer token is required',
    });
  }
}
