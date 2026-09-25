// Nest
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

// Types
import type { CustomerSignInOptions, GoogleAuthorization, GoogleSignIn } from '@harness-monorepo/contracts';
import type { UserModel } from '../../../generated/prisma/models.js';

// App
import { PrismaService } from '../../../shared/prisma/prisma.service.js';
import { SessionService } from '../../auth/session.service.js';
import { StoresService } from '../../stores/stores.service.js';
import { CustomersService } from '../customers.service.js';
import { codeChallengeOf, googleConfig, GoogleOAuthClient, newCodeVerifier, newState, type GoogleClaims, type GoogleConfig } from './google-oauth.client.js';

/** Long enough to pick an account and consent; short enough that an abandoned state is soon gone. */
const STATE_TTL_MS = 10 * 60 * 1000;

/** Only an address inside the shop the flow began at comes back out; anything else is dropped. */
function returnToOf(storeSlug: string, returnTo: string | undefined): string | null {
  const shop = `/${storeSlug}`;
  if (!returnTo || returnTo.startsWith('//')) return null;
  return returnTo === shop || returnTo.startsWith(`${shop}/`) || returnTo.startsWith(`${shop}?`) ? returnTo : null;
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
    return { google: googleConfig() !== null };
  }

  async authorize(storeSlug: string, returnTo?: string): Promise<GoogleAuthorization> {
    const config = this.config();
    const storeId = await this.stores.publicStoreId(storeSlug);
    const state = newState();
    const codeVerifier = newCodeVerifier();

    await this.prisma.$transaction([
      // Abandoned flows are swept on the way in; nothing else ever reads them.
      this.prisma.oAuthState.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
      this.prisma.oAuthState.create({
        data: { state, codeVerifier, storeId, returnTo: returnToOf(storeSlug, returnTo), expiresAt: new Date(Date.now() + STATE_TTL_MS) },
      }),
    ]);

    return { url: this.google.authorizationUrl(config, { state, codeChallenge: codeChallengeOf(codeVerifier) }), state };
  }

  async callback(code: string, state: string, userAgent?: string): Promise<GoogleSignIn> {
    const config = this.config();

    // Taken out as it is read: a replayed state finds nothing, and neither does a second tab.
    const flight = await this.prisma.oAuthState.delete({ where: { state } }).catch(() => null);
    const store = flight && flight.expiresAt > new Date() ? await this.prisma.store.findUnique({ where: { id: flight.storeId }, select: { id: true, slug: true } }) : null;
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
    const session = await this.sessions.start(user, userAgent, 'CUSTOMER');

    return { session, storeSlug: store.slug, returnTo: flight.returnTo };
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
        if (known) return known.user;

        const existing = await tx.user.findUnique({ where: { storeId_email: { storeId, email: claims.email } } });
        let user: UserModel;
        if (!existing) {
          user = await tx.user.create({ data: { name: claims.name, email: claims.email, storeId, passwordHash: null, emailVerifiedAt: new Date() } });
        } else if (!claims.authoritative) {
          // The address was verified once, when the Google account was made, and may have changed
          // hands since: it may open a new account, never someone's existing one. The refusal is
          // the unverified one, so it reads the same as Google not vouching at all.
          throw new ForbiddenException({ errorCode: 'GOOGLE_EMAIL_UNVERIFIED', message: 'Google does not vouch for this e-mail enough to open an existing account' });
        } else if (existing.emailVerifiedAt) {
          user = existing;
        } else {
          // An address never confirmed may carry a password its owner never chose — anyone can sign
          // up with someone else's e-mail. Google just proved whose it is, so that password goes, and
          // with it every session it opened. The owner sets their own through "forgot my password".
          user = await tx.user.update({ where: { id: existing.id }, data: { emailVerifiedAt: new Date(), passwordHash: null } });
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
