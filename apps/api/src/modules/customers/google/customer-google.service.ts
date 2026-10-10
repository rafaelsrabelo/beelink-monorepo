// Node
import { createHash, randomBytes } from 'node:crypto';

// Nest
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

// Types
import type { CustomerSignInOptions, GoogleAuthorization, GoogleHandoffSession, GoogleSignIn } from '@harness-monorepo/contracts';
import type { Prisma } from '../../../generated/prisma/client.js';
import type { UserModel } from '../../../generated/prisma/models.js';

// App
import { env } from '../../../shared/config/env.js';
import { PrismaService } from '../../../shared/prisma/prisma.service.js';
import { LEGAL_VERSION, legalAcceptanceOf } from '../../auth/auth.constants.js';
import { SessionService } from '../../auth/session.service.js';
import { StoresService } from '../../stores/stores.service.js';
import { CustomersService } from '../customers.service.js';
import { codeChallengeOf, googleConfig, GoogleOAuthClient, newCodeVerifier, newState, type GoogleClaims, type GoogleConfig } from './google-oauth.client.js';

/** Long enough to pick an account and consent; short enough that an abandoned state is soon gone. */
const STATE_TTL_MS = 10 * 60 * 1000;

/**
 * How long a handoff's code is good for: the browser carries it from the platform's host to the
 * shop's domain in one redirect, so a minute is a slow network, not a person.
 */
export const HANDOFF_TTL_MS = 60 * 1000;

function hashOf(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

/**
 * The Google button says continuing accepts bee-link's terms (BEELINK-171), on the sign-in face too:
 * an account that holds no acceptance of the version in force — one from before the terms — takes
 * it now, however Google lands on it. One that already holds it gets no second row.
 */
async function acceptTermsIfDue(tx: Prisma.TransactionClient, userId: string): Promise<void> {
  const accepted = await tx.legalAcceptance.count({ where: { userId, version: LEGAL_VERSION } });
  if (accepted === 0) await tx.legalAcceptance.create({ data: { userId, ...legalAcceptanceOf('GOOGLE') } });
}

/** Only an address inside the shop the flow began at comes back out; anything else is dropped. */
function returnToOf(storeSlug: string, returnTo: string | undefined): string | null {
  const shop = `/${storeSlug}`;
  const inside = (path: string) => path === shop || path.startsWith(`${shop}/`);
  if (!returnTo || returnTo.startsWith('//') || returnTo.includes('\\')) return null;
  if (!inside(returnTo) && !returnTo.startsWith(`${shop}?`)) return null;

  // Resolved as a browser resolves it: `/loja/../outra` is `/outra`, and so is `%2e%2e`.
  const resolved = URL.canParse(returnTo, 'http://shop.invalid') ? new URL(returnTo, 'http://shop.invalid').pathname : '';
  return inside(resolved) ? returnTo : null;
}

/**
 * "Continuar com Google" at a shop: the authorization-code flow with PKCE and a one-use state, done
 * here so no secret and no verifier ever reach a browser.
 *
 * Which account a Google sign-in lands on — always one of the shop the flow began at, since a
 * shopper's account is that shop's alone:
 * - the one this Google account signed into there before (`account_identities`);
 * - else the shop's account with the same e-mail, when Google owns the address outright (a Gmail
 *   or Workspace one — `authoritative`);
 * - else a new one, verified — Google did the verifying — and with no password, which it can set
 *   later through "forgot my password".
 * Google not vouching for the e-mail is refused for everyone alike, so the refusal says nothing
 * about whether an account exists.
 *
 * A flow begun at the shop's own domain (BEELINK-284) cannot end here with a session: the callback
 * is on the platform's host, and the cookies belong on the shop's. It ends with a handoff — a code
 * the browser carries to that domain, which trades it for the session. What the code is held to:
 * - the shop and the account, so it opens nothing else;
 * - one use and one minute, taken by the delete that reads it;
 * - the challenge the flow began with, whose secret only the browser that began it holds, in a
 *   cookie of the shop's domain. A code read off an address, a log or a history opens nothing
 *   without it — and a code of someone's own sign-in, sent to another person's browser, signs
 *   nobody in there, which is what the state cookie does for the platform's host.
 * The domain it goes to is the shop's `ACTIVE` one as the database has it at that moment; no request
 * ever names a host.
 */
@Injectable()
export class CustomerGoogleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
    private readonly sessions: SessionService,
    private readonly customers: CustomersService,
    private readonly google: GoogleOAuthClient,
  ) {}

  options(): CustomerSignInOptions {
    return { google: googleConfig() !== null, platformOrigin: new URL(env.WEB_URL).origin };
  }

  async authorize(storeSlug: string, returnTo?: string, handoffChallenge?: string): Promise<GoogleAuthorization> {
    const config = this.config();
    const storeId = await this.stores.publicStoreId(storeSlug);
    const state = newState();
    const codeVerifier = newCodeVerifier();

    await this.prisma.$transaction([
      // Abandoned flows are swept on the way in; nothing else ever reads them.
      this.prisma.oAuthState.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
      this.prisma.oAuthState.create({
        data: { state, codeVerifier, storeId, returnTo: returnToOf(storeSlug, returnTo), handoffChallenge: handoffChallenge ?? null, expiresAt: new Date(Date.now() + STATE_TTL_MS) },
      }),
    ]);

    return { url: this.google.authorizationUrl(config, { state, codeChallenge: codeChallengeOf(codeVerifier) }), state };
  }

  async callback(code: string, state: string, userAgent?: string): Promise<GoogleSignIn> {
    const config = this.config();

    // Taken out as it is read: a replayed state finds nothing, and neither does a second tab.
    const flight = await this.prisma.oAuthState.delete({ where: { state } }).catch(() => null);
    const store =
      flight && flight.expiresAt > new Date()
        ? await this.prisma.store.findUnique({ where: { id: flight.storeId }, select: { id: true, slug: true, customDomain: true, customDomainStatus: true } })
        : null;
    if (!flight || !store) {
      throw new BadRequestException({ errorCode: 'GOOGLE_STATE_INVALID', message: 'This Google sign-in was not started here, was used, or took too long' });
    }

    const claims = await this.google.exchange(config, code, flight.codeVerifier);
    if (!claims) {
      throw new BadRequestException({ errorCode: 'GOOGLE_EXCHANGE_FAILED', message: 'Google refused the code' });
    }
    if (!claims.emailVerified) {
      throw new ForbiddenException({ errorCode: 'GOOGLE_EMAIL_UNVERIFIED', message: 'Google did not vouch for this e-mail' });
    }

    const user = await this.accountOf(store.id, claims);
    await this.customers.recordOf(store.id, user);

    // Begun at the shop's own domain, and the domain still is the shop's: the session is opened
    // there, by the trade. A domain removed or unverified since leaves the flow on this host.
    if (flight.handoffChallenge && store.customDomain && store.customDomainStatus === 'ACTIVE') {
      const code = await this.issueHandoff({ challenge: flight.handoffChallenge, storeId: store.id, userId: user.id, returnTo: flight.returnTo });
      return { session: null, handoff: { host: store.customDomain, code }, storeSlug: store.slug, returnTo: flight.returnTo };
    }

    const session = await this.sessions.start(user, userAgent, 'CUSTOMER');

    return { session, handoff: null, storeSlug: store.slug, returnTo: flight.returnTo };
  }

  /**
   * The session a handoff carried to the shop's own domain. One refusal for every way it can fail —
   * unknown, used, late, another shop's, another browser's — so it tells a guesser nothing; and the
   * code is spent by being read, whatever comes of it.
   */
  async redeemHandoff(storeSlug: string, code: string, verifier: string, userAgent?: string): Promise<GoogleHandoffSession> {
    const storeId = await this.stores.publicStoreId(storeSlug);

    // Taken out as it is read: of two trades at once, one finds nothing.
    const taken = await this.prisma.googleHandoff.delete({ where: { codeHash: hashOf(code) } }).catch(() => null);
    const holds = taken !== null && taken.expiresAt > new Date() && taken.storeId === storeId && taken.challenge === codeChallengeOf(verifier);
    const user = holds ? await this.prisma.user.findFirst({ where: { id: taken.userId, storeId } }) : null;
    if (!taken || !user) {
      throw new BadRequestException({ errorCode: 'GOOGLE_STATE_INVALID', message: 'This Google sign-in was not started here, was used, or took too long' });
    }

    return { session: await this.sessions.start(user, userAgent, 'CUSTOMER'), returnTo: taken.returnTo };
  }

  private async issueHandoff(row: { challenge: string; storeId: string; userId: string; returnTo: string | null }): Promise<string> {
    const now = Date.now();
    // 32 random bytes: 43 characters of base64url, nothing to guess.
    const code = randomBytes(32).toString('base64url');
    await this.prisma.$transaction([
      // The ones nobody traded: swept here, so the table never outgrows a minute of handoffs.
      this.prisma.googleHandoff.deleteMany({ where: { expiresAt: { lte: new Date(now) } } }),
      this.prisma.googleHandoff.create({ data: { codeHash: hashOf(code), ...row, expiresAt: new Date(now + HANDOFF_TTL_MS) } }),
    ]);
    return code;
  }

  private config(): GoogleConfig {
    const config = googleConfig();
    if (!config) throw new NotFoundException({ errorCode: 'GOOGLE_SIGN_IN_UNAVAILABLE', message: 'Google sign-in is not set up here' });
    return config;
  }

  /** The shop's account this Google account signs into, tying the two on first use. */
  private async accountOf(storeId: string, claims: GoogleClaims): Promise<UserModel> {
    const tie = { storeId_provider_subject: { storeId, provider: 'GOOGLE', subject: claims.sub } } as const;

    try {
      return await this.prisma.$transaction(async (tx) => {
        const known = await tx.accountIdentity.findUnique({ where: tie, include: { user: true } });
        if (known) {
          await acceptTermsIfDue(tx, known.user.id);
          return known.user;
        }

        const existing = await tx.user.findUnique({ where: { storeId_email: { storeId, email: claims.email } } });
        let user: UserModel;
        if (!existing) {
          // The Google button says continuing accepts the terms (BEELINK-171), and there is no form.
          user = await tx.user.create({
            data: { name: claims.name, email: claims.email, storeId, passwordHash: null, emailVerifiedAt: new Date(), legalAcceptances: { create: legalAcceptanceOf('GOOGLE') } },
          });
        } else if (!claims.authoritative) {
          // The address was verified once, when the Google account was made, and may have changed
          // hands since: it may open a new account, never someone's existing one. The refusal is
          // the unverified one, so it reads the same as Google not vouching at all.
          throw new ForbiddenException({ errorCode: 'GOOGLE_EMAIL_UNVERIFIED', message: 'Google does not vouch for this e-mail enough to open an existing account' });
        } else if (existing.emailVerifiedAt) {
          user = existing;
          await acceptTermsIfDue(tx, existing.id);
        } else {
          // An address never confirmed may carry a password its owner never chose — anyone can sign
          // up with someone else's e-mail. Google just proved whose it is, so that password goes, and
          // with it every session it opened. The owner sets their own through "forgot my password".
          // Whoever accepted the terms at sign-up may not have been the owner either: the owner does, now.
          user = await tx.user.update({
            where: { id: existing.id },
            data: { emailVerifiedAt: new Date(), passwordHash: null, legalAcceptances: { create: legalAcceptanceOf('GOOGLE') } },
          });
          await tx.session.deleteMany({ where: { userId: existing.id } });
        }

        await tx.accountIdentity.create({ data: { provider: 'GOOGLE', subject: claims.sub, storeId, userId: user.id } });
        return user;
      });
    } catch (error) {
      // Two callbacks of one Google account at once: the other one tied it first, so read its tie.
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        const known = await this.prisma.accountIdentity.findUnique({ where: tie, include: { user: true } });
        if (known) return known.user;
      }
      throw error;
    }
  }
}
