// Nest
import { ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';

// Libs
import { hash, verify } from '@node-rs/argon2';

// Types
import type { AuthSession, User as WireUser } from '@harness-monorepo/contracts';

// App
import { EmailTokenPurpose } from '../../generated/prisma/enums.js';
import type { UserModel } from '../../generated/prisma/models.js';
import { MailService } from '../../shared/mail/mail.service.js';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { PANEL_ACCOUNTS, type AccountScope } from './account-scope.js';
import { EMAIL_VERIFICATION_TTL_HOURS, PASSWORD_RESET_TTL_MINUTES } from './auth.constants.js';
import { createOpaqueToken } from './auth.tokens.js';
import type { LoginDto, RegisterDto } from './dto/auth.dto.js';
import { EmailTokenService } from './email-token.service.js';
import { SessionService } from './session.service.js';
import { toUser } from './user.mapper.js';

const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

@Injectable()
export class AuthService {
  /**
   * Verified against when the e-mail has no account, so answering takes as long as a real check.
   * Without it, response time alone would tell an attacker which addresses exist.
   */
  private readonly decoyHash = hash(createOpaqueToken());

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionService,
    private readonly emailTokens: EmailTokenService,
    private readonly mail: MailService,
  ) {}

  async register({ name, email, password }: RegisterDto, scope: AccountScope): Promise<WireUser> {
    const passwordHash = await hash(password);

    try {
      const user = await this.prisma.user.create({ data: { name, email, passwordHash, storeId: scope.storeId } });
      await this.sendVerification(user.id, user.email, user.name, scope.continuePath);
      return toUser(user);
    } catch (error) {
      // P2002: the e-mail is unique within the scope. Catching it, rather than checking first,
      // closes the race between two sign-ups of the same address.
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        throw new ConflictException({ errorCode: 'AUTH_EMAIL_TAKEN', message: 'E-mail already registered' });
      }
      throw error;
    }
  }

  async verifyEmail(token: string): Promise<void> {
    const userId = await this.emailTokens.consume(token, EmailTokenPurpose.VERIFY_EMAIL);

    await this.prisma.user.updateMany({
      where: { id: userId, emailVerifiedAt: null },
      data: { emailVerifiedAt: new Date() },
    });
  }

  /** Answers the same for any address; only an existing, unverified account gets a new link. */
  async resendVerification(email: string, scope: AccountScope): Promise<void> {
    const user = await this.accountOf(email, scope);
    if (!user || user.emailVerifiedAt) return;

    await this.sendVerification(user.id, user.email, user.name, scope.continuePath);
  }

  /** The panel's sign-in: bee-link's accounts only, so a shop's account never opens the panel. */
  async login({ email, password }: LoginDto, userAgent?: string): Promise<AuthSession> {
    return this.sessions.start(await this.verifiedUser({ email, password }, PANEL_ACCOUNTS), userAgent);
  }

  /**
   * The account behind an e-mail and password, verified — or the same refusal for every way it can
   * fail to be one, so a wrong password reads like an unknown e-mail. Both doors sign in through it.
   */
  async verifiedUser({ email, password }: LoginDto, scope: AccountScope): Promise<UserModel> {
    const user = await this.accountOf(email, scope);

    if (!user) {
      await verify(await this.decoyHash, password);
      throw new UnauthorizedException({ errorCode: 'AUTH_INVALID_CREDENTIALS', message: 'Invalid e-mail or password' });
    }

    // An account opened through Google has no password until it sets one: nothing matches it, and
    // it is refused after the same work as a wrong password, so the timing says nothing either.
    let matches = false;
    if (user.passwordHash) matches = await verify(user.passwordHash, password);
    else await verify(await this.decoyHash, password);

    if (!matches) {
      throw new UnauthorizedException({ errorCode: 'AUTH_INVALID_CREDENTIALS', message: 'Invalid e-mail or password' });
    }

    if (!user.emailVerifiedAt) {
      throw new ForbiddenException({ errorCode: 'AUTH_EMAIL_NOT_VERIFIED', message: 'E-mail not verified' });
    }

    return user;
  }

  /** Answers the same for any address, so it never reveals who has an account. */
  async forgotPassword(email: string, scope: AccountScope): Promise<void> {
    const user = await this.accountOf(email, scope);
    if (!user) return;

    const token = await this.emailTokens.issue(
      user.id,
      EmailTokenPurpose.RESET_PASSWORD,
      PASSWORD_RESET_TTL_MINUTES * MINUTE_MS,
    );
    await this.mail.sendPasswordReset(user.email, user.name, token, scope.continuePath);
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const userId = await this.emailTokens.consume(token, EmailTokenPurpose.RESET_PASSWORD);
    const passwordHash = await hash(password);

    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });

    // Whoever knew the old password — including whoever prompted the reset — loses every session.
    await this.sessions.revokeAllForUser(userId);
  }

  private accountOf(email: string, { storeId }: AccountScope): Promise<UserModel | null> {
    return this.prisma.user.findFirst({ where: { email, storeId } });
  }

  private async sendVerification(userId: string, email: string, name: string, continuePath?: string): Promise<void> {
    const token = await this.emailTokens.issue(
      userId,
      EmailTokenPurpose.VERIFY_EMAIL,
      EMAIL_VERIFICATION_TTL_HOURS * HOUR_MS,
    );
    await this.mail.sendEmailVerification(email, name, token, continuePath);
  }
}
