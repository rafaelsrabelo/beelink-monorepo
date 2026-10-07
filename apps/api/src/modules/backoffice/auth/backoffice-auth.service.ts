// Nest
import { HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';

// Types
import type { BackofficeSession, BackofficeSignInChallenge } from '@harness-monorepo/contracts';
import type { UserModel } from '../../../generated/prisma/models.js';
import type { AuditOrigin, AuditTarget, AuditWriter } from '../audit/audit.types.js';
import type { BackofficeSignInDto, BackofficeVerifyDto } from './dto/backoffice-auth.dto.js';

// App
import { env } from '../../../shared/config/env.js';
import { MailService } from '../../../shared/mail/mail.service.js';
import { PrismaService } from '../../../shared/prisma/prisma.service.js';
import { PANEL_ACCOUNTS } from '../../auth/account-scope.js';
import { AuthService } from '../../auth/auth.service.js';
import { createOpaqueToken, hashToken } from '../../auth/auth.tokens.js';
import {
  BACKOFFICE_CODE_MAX_ATTEMPTS,
  BACKOFFICE_CODE_MAX_PER_WINDOW,
  BACKOFFICE_CODE_TTL_MINUTES,
  BACKOFFICE_CODE_WINDOW_MINUTES,
} from '../backoffice.constants.js';
import { BackofficeSessionService, isActiveAdmin } from './backoffice-session.service.js';
import { challengeIsOpen, createSignInCode, hashSignInCode, signInCodeMatches } from './sign-in-code.js';

const MINUTE_MS = 60 * 1000;

/**
 * The backoffice's sign-in, in two steps (BEELINK-227): the administrator's own password, then a
 * code sent to their e-mail. Neither step says more than it must — whoever is not an administrator
 * learns nothing of who is — and every outcome is written to the audit record.
 */
@Injectable()
export class BackofficeAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly sessions: BackofficeSessionService,
    private readonly mail: MailService,
  ) {}

  /**
   * Step one. A wrong password, an unknown e-mail, an unverified one and an account that is no
   * administrator are refused alike, after the same work: the panel's own check, which verifies a
   * decoy where there is no account, then the same read and the same audit line.
   */
  async signIn(dto: BackofficeSignInDto, trail: AuditWriter): Promise<BackofficeSignInChallenge> {
    const user = await this.administratorOf(dto);

    if (!user) {
      await trail.record('BACKOFFICE_SIGN_IN_FAILED', { actor: { kind: 'ANONYMOUS' }, target: await this.adminBehind(dto.email), details: { step: 'PASSWORD' } });
      throw new UnauthorizedException({ errorCode: 'BACKOFFICE_INVALID_CREDENTIALS', message: 'Invalid e-mail or password' });
    }

    const target: AuditTarget = { type: 'USER', id: user.id, label: user.email };
    const now = Date.now();

    // Per account, whatever address asks: the route's own limit is per address, and an inbox is one.
    const sent = await this.prisma.backofficeSignInChallenge.count({
      where: { userId: user.id, createdAt: { gt: new Date(now - BACKOFFICE_CODE_WINDOW_MINUTES * MINUTE_MS) } },
    });
    if (sent >= BACKOFFICE_CODE_MAX_PER_WINDOW) {
      await trail.record('BACKOFFICE_SIGN_IN_FAILED', { actor: { kind: 'ANONYMOUS' }, target, details: { step: 'PASSWORD', reason: 'TOO_MANY_REQUESTS' } });
      throw new HttpException({ errorCode: 'RATE_LIMITED', message: 'Too many sign-in codes were asked for this account. Try again later.' }, HttpStatus.TOO_MANY_REQUESTS);
    }

    const challengeToken = createOpaqueToken();
    const code = createSignInCode();
    const expiresAt = new Date(now + BACKOFFICE_CODE_TTL_MINUTES * MINUTE_MS);

    // Asking for a new code makes every older one of the account useless.
    await this.prisma.$transaction([
      this.prisma.backofficeSignInChallenge.updateMany({ where: { userId: user.id, consumedAt: null }, data: { consumedAt: new Date(now) } }),
      this.prisma.backofficeSignInChallenge.create({
        data: { userId: user.id, tokenHash: hashToken(challengeToken), codeHash: hashSignInCode(code, challengeToken, env.JWT_SECRET), expiresAt },
      }),
    ]);

    await this.mail.sendBackofficeSignInCode(user.email, user.name, code);
    await trail.record('BACKOFFICE_SIGN_IN_CODE_SENT', { actor: { kind: 'ADMIN', userId: user.id, label: user.email }, target });

    return { challengeToken, expiresAt: expiresAt.toISOString() };
  }

  /**
   * Step two. A code that is wrong, expired, already used or out of attempts — and a token step one
   * never answered — are refused alike. Each wrong code is counted before it is compared, so two
   * guesses at once cannot share an attempt.
   */
  async verify({ challengeToken, code }: BackofficeVerifyDto, origin: AuditOrigin, trail: AuditWriter): Promise<BackofficeSession> {
    const challenge = await this.prisma.backofficeSignInChallenge.findUnique({
      where: { tokenHash: hashToken(challengeToken) },
      include: { user: { include: { platformAdmin: true } } },
    });
    const target: AuditTarget | null = challenge ? { type: 'USER', id: challenge.userId, label: challenge.user.email } : null;

    const refuse = async (): Promise<never> => {
      await trail.record('BACKOFFICE_SIGN_IN_FAILED', { actor: { kind: 'ANONYMOUS' }, target, details: { step: 'CODE' } });
      throw new UnauthorizedException({ errorCode: 'BACKOFFICE_CODE_INVALID', message: 'Invalid or expired code' });
    };

    if (!challenge || !challengeIsOpen(challenge, new Date()) || !isActiveAdmin(challenge.user)) return refuse();

    const counted = await this.prisma.backofficeSignInChallenge.updateMany({
      where: { id: challenge.id, consumedAt: null, attempts: { lt: BACKOFFICE_CODE_MAX_ATTEMPTS } },
      data: { attempts: { increment: 1 } },
    });
    if (counted.count === 0) return refuse();

    if (!signInCodeMatches(code, challengeToken, env.JWT_SECRET, challenge.codeHash)) return refuse();

    // Conditional, so the same code presented twice at once opens one session.
    const spent = await this.prisma.backofficeSignInChallenge.updateMany({ where: { id: challenge.id, consumedAt: null }, data: { consumedAt: new Date() } });
    if (spent.count === 0) return refuse();

    const session = await this.sessions.start(challenge.user, 'EMAIL_CODE', origin);
    await trail.record('BACKOFFICE_SIGNED_IN', { actor: { kind: 'ADMIN', userId: challenge.userId, label: challenge.user.email }, target });

    return session;
  }

  /** The account behind the e-mail and password, when it is an administrator's; null for every way it is not. */
  private async administratorOf(dto: BackofficeSignInDto): Promise<UserModel | null> {
    let user: UserModel;
    try {
      user = await this.auth.verifiedUser(dto, PANEL_ACCOUNTS);
    } catch (error) {
      if (error instanceof HttpException) return null;
      throw error;
    }

    const admin = await this.prisma.platformAdmin.findFirst({ where: { userId: user.id, revokedAt: null }, select: { userId: true } });
    return admin ? user : null;
  }

  /**
   * Whose account a refused sign-in was aimed at, when it is an administrator's: the team has to see
   * that theirs is being tried. Any other e-mail typed is not kept — it is somebody's who has
   * nothing to do with the backoffice, or a password typed in the wrong field.
   */
  private async adminBehind(email: string): Promise<AuditTarget | null> {
    const admin = await this.prisma.platformAdmin.findFirst({
      where: { revokedAt: null, user: { email, storeId: null } },
      select: { userId: true, user: { select: { email: true } } },
    });
    return admin ? { type: 'USER', id: admin.userId, label: admin.user.email } : null;
  }
}
