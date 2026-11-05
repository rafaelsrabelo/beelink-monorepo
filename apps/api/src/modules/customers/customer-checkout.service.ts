// Nest
import { BadRequestException, Injectable } from '@nestjs/common';

// Types
import type { AuthSession, CustomerCheckoutAnswer } from '@harness-monorepo/contracts';
import type { UserModel } from '../../generated/prisma/models.js';

// App
import { env } from '../../shared/config/env.js';
import { MailService } from '../../shared/mail/mail.service.js';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import type { AccountShop } from '../auth/account-scope.js';
import { legalAcceptanceOf } from '../auth/auth.constants.js';
import { AuthService } from '../auth/auth.service.js';
import { SessionService } from '../auth/session.service.js';
import { CustomersService } from './customers.service.js';
import type { CustomerCheckoutCodeDto, CustomerCheckoutDto } from './dto/customer-checkout.dto.js';
import { newSignInCode, SIGN_IN_CODE_MAX_ATTEMPTS, SIGN_IN_CODE_RESEND_MS, SIGN_IN_CODE_TTL_MINUTES, signInCodeHashOf, signInCodeMatches } from './sign-in-code.js';

const MINUTE_MS = 60_000;

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'P2002';
}

/**
 * Buying with no sign-up (plan 2026-11-05--compra-sem-cadastro): the account is what the purchase
 * leaves behind. A name, an e-mail and a WhatsApp the shop does not know open the shop's account at
 * once — no password, the e-mail still to confirm — and sign it in. An e-mail it knows gets a code
 * instead, and the code signs that account in.
 *
 * It is the one door that says whether an e-mail has an account at a shop: a new customer goes on
 * and a known one is asked for a code, and no design without a step for every new customer hides
 * that. The account door's limit by address and a code per e-mail a minute are what slow a script.
 */
@Injectable()
export class CustomerCheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customers: CustomersService,
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
    private readonly mail: MailService,
  ) {}

  async identify(storeSlug: string, dto: CustomerCheckoutDto, userAgent?: string): Promise<CustomerCheckoutAnswer> {
    const scope = await this.customers.scopeOf(storeSlug);
    const known = await this.prisma.user.findFirst({ where: { email: dto.email, storeId: scope.storeId } });
    if (known) return this.codeSentTo(known, scope.shop);

    let user: UserModel;
    try {
      // The terms go in the same insert, as every account's do (BEELINK-171): the checkout says, beside its button, that going on accepts them.
      user = await this.prisma.user.create({
        data: { name: dto.name, email: dto.email, passwordHash: null, storeId: scope.storeId, legalAcceptances: { create: legalAcceptanceOf('CHECKOUT') } },
      });
    } catch (error) {
      // Opened between the read and the insert — the same person pressing twice, most likely: it is a known e-mail now.
      if (!isUniqueViolation(error)) throw error;
      return this.codeSentTo(await this.prisma.user.findFirstOrThrow({ where: { email: dto.email, storeId: scope.storeId } }), scope.shop);
    }

    const record = await this.customers.recordOf(scope.storeId, user);
    await this.phoneOn(record.id, dto.phone);
    // The confirmation link, as a sign-up sends it: confirmed, the e-mail starts hearing of the orders (BEELINK-151). Nothing waits for it.
    await this.auth.resendVerification(user.email, scope);
    return { kind: 'SESSION', session: await this.sessions.start(user, userAgent, 'CUSTOMER') };
  }

  /**
   * The code's session. Every way it fails — no such account, no code standing, past its minutes, the
   * tries spent, the wrong digits — is the one `CUSTOMER_CODE_INVALID`: none is told apart.
   */
  async signInWithCode(storeSlug: string, dto: CustomerCheckoutCodeDto, userAgent?: string): Promise<AuthSession> {
    const { storeId } = await this.customers.scopeOf(storeSlug);
    const user = await this.prisma.user.findFirst({ where: { email: dto.email, storeId } });
    if (!user) throw invalidCode();

    const now = new Date();
    const standing = await this.prisma.signInCode.findFirst({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: now }, attempts: { lt: SIGN_IN_CODE_MAX_ATTEMPTS } },
      orderBy: { createdAt: 'desc' },
    });
    if (!standing) throw invalidCode();

    if (!signInCodeMatches(env.JWT_SECRET, user.id, dto.code, standing.codeHash)) {
      await this.prisma.signInCode.updateMany({ where: { id: standing.id, attempts: { lt: SIGN_IN_CODE_MAX_ATTEMPTS } }, data: { attempts: { increment: 1 } } });
      throw invalidCode();
    }
    // Spent in one statement: two presses with the right code open one session, not two.
    const spent = await this.prisma.signInCode.updateMany({ where: { id: standing.id, usedAt: null, attempts: { lt: SIGN_IN_CODE_MAX_ATTEMPTS } }, data: { usedAt: now } });
    if (spent.count !== 1) throw invalidCode();

    // The code went to the e-mail and came back typed: the e-mail is read by whoever typed it, as a confirmation link would prove.
    const signedIn = user.emailVerifiedAt ? user : await this.prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: now } });
    await this.customers.recordOf(storeId, signedIn);
    return this.sessions.start(signedIn, userAgent, 'CUSTOMER');
  }

  /**
   * A code for an account the checkout found, unless one went out within the minute: that one still
   * holds and is on its way. A new code spends any other standing, so only the last e-mail's works.
   */
  private async codeSentTo(user: UserModel, shop: AccountShop): Promise<CustomerCheckoutAnswer> {
    const now = Date.now();
    const recent = await this.prisma.signInCode.findFirst({ where: { userId: user.id, usedAt: null, createdAt: { gt: new Date(now - SIGN_IN_CODE_RESEND_MS) } } });
    if (recent) return { kind: 'CODE_SENT' };

    const code = newSignInCode();
    await this.prisma.$transaction([
      this.prisma.signInCode.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date(now) } }),
      this.prisma.signInCode.create({
        data: { userId: user.id, codeHash: signInCodeHashOf(env.JWT_SECRET, user.id, code), expiresAt: new Date(now + SIGN_IN_CODE_TTL_MINUTES * MINUTE_MS) },
      }),
    ]);
    await this.mail.sendSignInCode(user.email, { name: user.name, code, minutes: SIGN_IN_CODE_TTL_MINUTES, shopName: shop.name });
    return { kind: 'CODE_SENT' };
  }

  /**
   * The WhatsApp on the new record. One another record of the shop has — most likely the shopkeeper
   * registered this person from a WhatsApp sale — is kept as claimed, for the panel to flag the pair,
   * as the profile does; never merged from here, and never a reason to stop the purchase.
   */
  private async phoneOn(recordId: string, phone: string): Promise<void> {
    try {
      await this.prisma.customer.update({ where: { id: recordId }, data: { phone, claimedPhone: null } });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      await this.prisma.customer.update({ where: { id: recordId }, data: { claimedPhone: phone } });
    }
  }
}

function invalidCode(): BadRequestException {
  return new BadRequestException({ errorCode: 'CUSTOMER_CODE_INVALID', message: 'That code does not open this account' });
}
