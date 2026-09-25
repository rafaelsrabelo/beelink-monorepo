// Nest
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

// Types
import type { AuthSession } from '@harness-monorepo/contracts';
import type { SessionAudience } from '../../generated/prisma/enums.js';
import type { UserModel } from '../../generated/prisma/models.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_REUSE_GRACE_SECONDS,
  REFRESH_TOKEN_TTL_DAYS,
} from './auth.constants.js';
import { createOpaqueToken, hashToken } from './auth.tokens.js';
import { toUser } from './user.mapper.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * What an access token says about the door it came through. A shopkeeper's carries nothing extra —
 * every token already handed out is one — and a shopper's says `customer`, signed, so a guard can
 * refuse it without a read.
 */
export const CUSTOMER_TOKEN_KIND = 'customer';

/** One session is one signed-in device; its refresh tokens form a chain, each used once. */
@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async start(user: UserModel, userAgent?: string, audience: SessionAudience = 'OWNER'): Promise<AuthSession> {
    const session = await this.prisma.session.create({ data: { userId: user.id, userAgent, audience } });
    return this.issue(user, session.id, audience);
  }

  /**
   * Rotates the chain. A token already spent means it was copied — unless it was spent moments ago,
   * which is the same browser racing itself (a second tab, a prefetch) and is allowed to rotate.
   */
  async refresh(refreshToken: string, audience: SessionAudience = 'OWNER'): Promise<AuthSession> {
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
      include: { session: { include: { user: true } } },
    });

    // A session refreshes only through the door it was opened by: a shopper's refresh token handed
    // to the panel's endpoint is as invalid as one that does not exist.
    if (!record || record.session.revokedAt || record.session.audience !== audience || record.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException({ errorCode: 'AUTH_TOKEN_INVALID', message: 'Invalid refresh token' });
    }

    if (record.usedAt) {
      const graceEndsAt = record.usedAt.getTime() + REFRESH_REUSE_GRACE_SECONDS * 1000;
      if (Date.now() > graceEndsAt) {
        await this.revokeSession(record.sessionId);
        throw new UnauthorizedException({
          errorCode: 'AUTH_REFRESH_REUSED',
          message: 'Refresh token reused; the session was revoked',
        });
      }
    } else {
      await this.prisma.refreshToken.updateMany({
        where: { id: record.id, usedAt: null },
        data: { usedAt: new Date() },
      });
    }

    return this.issue(record.session.user, record.sessionId, record.session.audience);
  }

  /** Idempotent: an unknown or already spent token still ends in "you are signed out". */
  async revokeByRefreshToken(refreshToken: string): Promise<void> {
    const record = await this.prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(refreshToken) } });
    if (record) await this.revokeSession(record.sessionId);
  }

  /**
   * Whether the session behind an access token is still alive. One indexed read per authenticated
   * request, which is what makes signing out and resetting a password take effect at once instead
   * of when the 15-minute token happens to expire.
   */
  async isActive(sessionId: string): Promise<boolean> {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, revokedAt: null },
      select: { id: true },
    })

    return session !== null
  }

  /** Used when the password changes: every device has to sign in again. */
  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async revokeSession(sessionId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issue(user: UserModel, sessionId: string, audience: SessionAudience): Promise<AuthSession> {
    const refreshToken = createOpaqueToken();
    const refreshTokenExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * DAY_MS);

    await this.prisma.refreshToken.create({
      data: { sessionId, tokenHash: hashToken(refreshToken), expiresAt: refreshTokenExpiresAt },
    });

    const accessToken = await this.jwt.signAsync(
      { sub: user.id, sid: sessionId, ...(audience === 'CUSTOMER' ? { kind: CUSTOMER_TOKEN_KIND } : {}) },
      { expiresIn: ACCESS_TOKEN_TTL_SECONDS },
    );

    return {
      accessToken,
      accessTokenExpiresAt: new Date(Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000).toISOString(),
      refreshToken,
      refreshTokenExpiresAt: refreshTokenExpiresAt.toISOString(),
      user: toUser(user),
    };
  }
}
