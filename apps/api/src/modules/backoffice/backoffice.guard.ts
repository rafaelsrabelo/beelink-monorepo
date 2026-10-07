// Nest
import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

// Types
import type { BackofficeRequest } from './backoffice.request.js';

// App
import { BackofficeSessionService } from './auth/backoffice-session.service.js';
import { BACKOFFICE_TOKEN_KIND } from './backoffice.constants.js';

interface BackofficeTokenPayload {
  sub?: unknown;
  sid?: unknown;
  kind?: unknown;
  /** Which second step the session passed. A token without it never came out of this door. */
  step?: unknown;
}

/**
 * The backoffice's one door (BEELINK-227). Every route under `/backoffice` but the sign-in itself
 * stands behind it, and it asks three things of a bearer token:
 *
 * - that it is this door's — a shopkeeper's token carries no `kind` and a shopper's says `customer`,
 *   so a stolen panel cookie is no key here;
 * - that its session is alive and was opened by both steps;
 * - that the person is an administrator **now**: the session and the role are read on every
 *   request, so a role revoked, or a sign-out, takes effect on the next one.
 *
 * Every refusal reads the same. Routes that use it are `@Public()` to the global guard, which would
 * refuse this door's token — `@BackofficeController` sets both, so neither is set alone.
 */
@Injectable()
export class BackofficeGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly sessions: BackofficeSessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<BackofficeRequest>();
    const header = request.headers.authorization;
    const token = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : undefined;

    if (!token) throw this.unauthenticated();

    let payload: BackofficeTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<BackofficeTokenPayload>(token);
    } catch {
      throw this.unauthenticated();
    }

    if (payload.kind !== BACKOFFICE_TOKEN_KIND) throw this.unauthenticated();
    if (typeof payload.sub !== 'string' || typeof payload.sid !== 'string' || typeof payload.step !== 'string') throw this.unauthenticated();

    // Outside the try: a database error surfaces as itself instead of reading as "signed out".
    const admin = await this.sessions.authenticate(payload.sub, payload.sid, payload.step);
    if (!admin) throw this.unauthenticated();

    request.backofficeAdmin = admin;
    return true;
  }

  private unauthenticated(): UnauthorizedException {
    return new UnauthorizedException({ errorCode: 'BACKOFFICE_UNAUTHENTICATED', message: 'A backoffice session is required' });
  }
}
