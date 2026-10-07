// Nest
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

// Types
import type { BackofficeMe, BackofficeSession } from '@harness-monorepo/contracts';
import type { BackofficeSecondStep } from '../../../generated/prisma/enums.js';
import type { BackofficeSessionModel, PlatformAdminModel, UserModel } from '../../../generated/prisma/models.js';
import type { AuditOrigin } from '../audit/audit.types.js';
import type { AuthenticatedAdmin } from '../backoffice.request.js';

// App
import { PrismaService } from '../../../shared/prisma/prisma.service.js';
import { createOpaqueToken, hashToken } from '../../auth/auth.tokens.js';
import {
  BACKOFFICE_ACCESS_TOKEN_TTL_SECONDS,
  BACKOFFICE_REFRESH_REUSE_GRACE_SECONDS,
  BACKOFFICE_SESSION_IDLE_MINUTES,
  BACKOFFICE_SESSION_TOUCH_SECONDS,
  BACKOFFICE_SESSION_TTL_HOURS,
  BACKOFFICE_TOKEN_KIND,
  BACKOFFICE_USER_AGENT_MAX_LENGTH,
} from '../backoffice.constants.js';

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;

type SessionOwner = UserModel & { platformAdmin: PlatformAdminModel | null };

/** When a session left alone since `lastSeenAt` is over — never past its own end. */
function idleEndOf(session: Pick<BackofficeSessionModel, 'lastSeenAt' | 'expiresAt'>): Date {
  return new Date(Math.min(session.lastSeenAt.getTime() + BACKOFFICE_SESSION_IDLE_MINUTES * MINUTE_MS, session.expiresAt.getTime()));
}

/** A session is alive while it was not ended, has not reached its end and was not left idle. */
export function sessionIsAlive(session: Pick<BackofficeSessionModel, 'revokedAt' | 'lastSeenAt' | 'expiresAt'>, now: Date): boolean {
  return session.revokedAt === null && idleEndOf(session).getTime() > now.getTime();
}

/** An account administers the platform while its row stands unrevoked and its e-mail is verified. */
export function isActiveAdmin(user: SessionOwner): boolean {
  return user.platformAdmin !== null && user.platformAdmin.revokedAt === null && user.emailVerifiedAt !== null && user.storeId === null;
}

/**
 * The backoffice's sessions (BEELINK-227): opened only by a sign-in that passed both steps, short,
 * and its own — a table apart from the panel's, so nothing there starts, renews or ends one.
 */
@Injectable()
export class BackofficeSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /** Called by the sign-in alone, once the second step passed. */
  async start(user: UserModel, secondStep: BackofficeSecondStep, origin: AuditOrigin): Promise<BackofficeSession> {
    const now = new Date();
    const session = await this.prisma.backofficeSession.create({
      data: {
        userId: user.id,
        secondStep,
        secondStepAt: now,
        ip: origin.ip,
        userAgent: origin.userAgent?.slice(0, BACKOFFICE_USER_AGENT_MAX_LENGTH) ?? null,
        lastSeenAt: now,
        expiresAt: new Date(now.getTime() + BACKOFFICE_SESSION_TTL_HOURS * HOUR_MS),
      },
    });

    return this.issue(user, session);
  }

  /**
   * The administrator behind an access token, or null: the session has to be alive and theirs, to
   * have passed the step the token names, and the person has to be an administrator still. Read on
   * every request, which is what makes a revocation or a sign-out take effect on the next one.
   */
  async authenticate(userId: string, sessionId: string, step: string): Promise<AuthenticatedAdmin | null> {
    const session = await this.prisma.backofficeSession.findUnique({ where: { id: sessionId }, include: { user: { include: { platformAdmin: true } } } });
    const now = new Date();

    if (!session || session.userId !== userId || session.secondStep !== step) return null;
    if (!sessionIsAlive(session, now) || !isActiveAdmin(session.user)) return null;

    await this.touch(session, now);
    return { id: session.user.id, name: session.user.name, email: session.user.email, sessionId: session.id };
  }

  /**
   * Rotates the chain, as the panel's does: a token spent moments ago is the same browser racing
   * itself, and one spent longer ago was copied — the session ends. Nothing renews a session past
   * its end, left idle, or of somebody who is no administrator any more.
   */
  async refresh(refreshToken: string): Promise<BackofficeSession> {
    const record = await this.prisma.backofficeRefreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
      include: { session: { include: { user: { include: { platformAdmin: true } } } } },
    });
    const now = new Date();

    if (!record || record.expiresAt.getTime() <= now.getTime() || !sessionIsAlive(record.session, now) || !isActiveAdmin(record.session.user)) {
      throw new UnauthorizedException({ errorCode: 'BACKOFFICE_SESSION_INVALID', message: 'Invalid refresh token' });
    }

    if (record.usedAt) {
      if (now.getTime() > record.usedAt.getTime() + BACKOFFICE_REFRESH_REUSE_GRACE_SECONDS * SECOND_MS) {
        await this.end(record.sessionId);
        throw new UnauthorizedException({ errorCode: 'BACKOFFICE_REFRESH_REUSED', message: 'Refresh token reused; the session was ended' });
      }
    } else {
      await this.prisma.backofficeRefreshToken.updateMany({ where: { id: record.id, usedAt: null }, data: { usedAt: now } });
    }

    const session = await this.prisma.backofficeSession.update({ where: { id: record.sessionId }, data: { lastSeenAt: now } });
    return this.issue(record.session.user, session);
  }

  /** Idempotent. */
  async end(sessionId: string): Promise<void> {
    await this.prisma.backofficeSession.updateMany({ where: { id: sessionId, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  async me({ id, name, email, sessionId }: AuthenticatedAdmin): Promise<BackofficeMe> {
    const session = await this.prisma.backofficeSession.findUniqueOrThrow({ where: { id: sessionId } });
    return {
      admin: { id, name, email },
      session: { startedAt: session.createdAt.toISOString(), expiresAt: session.expiresAt.toISOString(), idleExpiresAt: idleEndOf(session).toISOString() },
    };
  }

  private async touch(session: BackofficeSessionModel, now: Date): Promise<void> {
    if (now.getTime() - session.lastSeenAt.getTime() < BACKOFFICE_SESSION_TOUCH_SECONDS * SECOND_MS) return;
    await this.prisma.backofficeSession.updateMany({ where: { id: session.id, revokedAt: null }, data: { lastSeenAt: now } });
  }

  private async issue(user: UserModel, session: BackofficeSessionModel): Promise<BackofficeSession> {
    const now = Date.now();
    const refreshToken = createOpaqueToken();
    const refreshTokenExpiresAt = idleEndOf(session);
    // Neither token outlives the session: the last access token of a day ends with it.
    const accessTokenExpiresAt = new Date(Math.min(now + BACKOFFICE_ACCESS_TOKEN_TTL_SECONDS * SECOND_MS, session.expiresAt.getTime()));

    await this.prisma.backofficeRefreshToken.create({ data: { sessionId: session.id, tokenHash: hashToken(refreshToken), expiresAt: refreshTokenExpiresAt } });

    const accessToken = await this.jwt.signAsync(
      { sub: user.id, sid: session.id, kind: BACKOFFICE_TOKEN_KIND, step: session.secondStep },
      { expiresIn: Math.max(1, Math.floor((accessTokenExpiresAt.getTime() - now) / SECOND_MS)) },
    );

    return {
      accessToken,
      accessTokenExpiresAt: accessTokenExpiresAt.toISOString(),
      refreshToken,
      refreshTokenExpiresAt: refreshTokenExpiresAt.toISOString(),
      sessionExpiresAt: session.expiresAt.toISOString(),
      admin: { id: user.id, name: user.name, email: user.email },
    };
  }
}
