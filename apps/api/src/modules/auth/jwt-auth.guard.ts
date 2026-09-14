// Nest
import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

// Types
import type { AuthenticatedUser } from './auth.decorators.js';

// App
import { IS_PUBLIC_KEY } from './auth.decorators.js';

interface AccessTokenPayload {
  sub: string;
  sid: string;
}

/**
 * Registered globally, so a new route is closed unless it says otherwise with `@Public()`.
 *
 * The token is checked by signature alone, with no database round trip: revoking a session stops
 * the refresh chain, and the access token it already handed out dies on its own within 15 minutes.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
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
    const token = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : undefined;

    if (!token) throw this.unauthenticated();

    try {
      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token);
      request.user = { id: payload.sub, sessionId: payload.sid };
      return true;
    } catch {
      throw this.unauthenticated();
    }
  }

  private unauthenticated(): UnauthorizedException {
    return new UnauthorizedException({
      errorCode: 'AUTH_UNAUTHENTICATED',
      message: 'A valid bearer token is required',
    });
  }
}
