// Nest
import { ConflictException, ForbiddenException, GoneException, Injectable, NotFoundException } from '@nestjs/common';

// Libs
import { hash } from '@node-rs/argon2';

// Types
import type {
  AcceptedAffiliate,
  AffiliateInvitation,
  AffiliateInviteEmailMismatchDetails,
  AffiliateSignUpResult,
  AffiliateSlugAvailability,
  AffiliateSlugUnavailableDetails,
  AffiliateSlugUnavailableReason,
} from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';

// App
import { slugify } from '../../shared/slug.js';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { legalAcceptanceOf } from '../auth/auth.constants.js';
import { hashToken } from '../auth/auth.tokens.js';
import { SessionService } from '../auth/session.service.js';
import { lockShopSegment, shopSegmentHolder } from '../catalog/shop-segments.js';
import { slugAvailability, slugProblemOf, suggestedSlugOf } from './affiliate-slug.js';
import { affiliateError, isUniqueViolation } from './affiliates.constants.js';
import type { AffiliateAcceptanceDto, AffiliateSignUpDto } from './dto/affiliate.dto.js';

/** An invite that still works: its affiliate, still INVITED, with the shop it is for. */
interface LiveInvite {
  affiliateId: string;
  storeId: string;
  name: string;
  email: string;
  tableId: string;
  expiresAt: Date;
  store: { name: string; slug: string; logoUrl: string | null };
}

const inviteMissing = () => new NotFoundException(affiliateError('AFFILIATE_INVITE_NOT_FOUND', 'No invite answers to this link'));
const slugRefused = (reason: AffiliateSlugUnavailableReason) =>
  new ConflictException(affiliateError<AffiliateSlugUnavailableDetails>('AFFILIATE_SLUG_UNAVAILABLE', `That /name cannot be the affiliate's: ${reason}`, { reason }));

/**
 * An invite as the person invited meets it (IMPULSEIA-103), by the token in its link: read it, try
 * a `/name`, accept — signed in with the bee-link account of the e-mail invited, or making that
 * account here, already verified, since the link reached that inbox.
 */
@Injectable()
export class AffiliateInvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionService,
  ) {}

  async read(token: string): Promise<AffiliateInvitation> {
    const invite = await this.liveInvite(token);
    const [table, program, account, suggestedSlug] = await Promise.all([
      this.prisma.commissionTable.findUniqueOrThrow({
        where: { id: invite.tableId },
        select: {
          name: true,
          defaultRateBps: true,
          // A product off the shelf sells nothing through a link: only those on it are shown.
          rates: { where: { product: { status: 'ACTIVE' } }, select: { productId: true, rateBps: true, product: { select: { name: true } } }, orderBy: { product: { name: 'asc' } } },
          categoryRates: { select: { categoryId: true, rateBps: true, category: { select: { name: true } } }, orderBy: { category: { name: 'asc' } } },
        },
      }),
      this.prisma.affiliateProgram.findUniqueOrThrow({ where: { storeId: invite.storeId }, select: { termsText: true, termsVersion: true } }),
      this.prisma.user.findFirst({ where: { email: invite.email, storeId: null }, select: { id: true } }),
      suggestedSlugOf(this.prisma, invite.storeId, invite.name, invite.affiliateId),
    ]);

    return {
      store: invite.store,
      affiliate: { name: invite.name, email: invite.email },
      table: {
        name: table.name,
        defaultRateBps: table.defaultRateBps,
        categories: table.categoryRates.map((rate) => ({ categoryId: rate.categoryId, name: rate.category.name, rateBps: rate.rateBps })),
        products: table.rates.map((rate) => ({ productId: rate.productId, name: rate.product.name, rateBps: rate.rateBps })),
      },
      terms: { text: program.termsText, version: program.termsVersion },
      expiresAt: invite.expiresAt.toISOString(),
      hasAccount: account !== null,
      suggestedSlug,
    };
  }

  async slug(token: string, raw: string): Promise<AffiliateSlugAvailability> {
    const invite = await this.liveInvite(token);
    return slugAvailability(this.prisma, invite.storeId, raw, invite.affiliateId);
  }

  /** Signed in: the account must be the one invited, by its e-mail. */
  async accept(token: string, userId: string, dto: AffiliateAcceptanceDto): Promise<AcceptedAffiliate> {
    const invite = await this.liveInvite(token);
    const account = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });
    if (account.email !== invite.email) {
      throw new ForbiddenException(
        affiliateError<AffiliateInviteEmailMismatchDetails>('AFFILIATE_INVITE_EMAIL_MISMATCH', 'This invite is for another e-mail', { email: invite.email }),
      );
    }
    return this.prisma.$transaction((tx) => this.acceptWithin(tx, invite, userId, dto));
  }

  /**
   * No account yet: one is made with the invited e-mail, verified by the invite itself, accepting
   * bee-link's terms as a sign-up does — and the invite accepted, in the same transaction, so a
   * refused `/name` leaves no account behind. Answers the session, as signing in does.
   */
  async signUp(token: string, dto: AffiliateSignUpDto, userAgent?: string): Promise<AffiliateSignUpResult> {
    const invite = await this.liveInvite(token);
    const taken = () => new ConflictException(affiliateError('AUTH_EMAIL_TAKEN', 'This e-mail has an account: sign in to accept'));
    if (await this.prisma.user.findFirst({ where: { email: invite.email, storeId: null }, select: { id: true } })) throw taken();

    const passwordHash = await hash(dto.password);
    const now = new Date();
    let result;
    try {
      result = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: { name: dto.name, email: invite.email, passwordHash, storeId: null, emailVerifiedAt: now, legalAcceptances: { create: legalAcceptanceOf('SIGN_UP') } },
        });
        return { user, affiliate: await this.acceptWithin(tx, invite, user.id, dto) };
      });
    } catch (error) {
      // The account made by someone else in between: the e-mail is unique among bee-link's accounts.
      if (isUniqueViolation(error) && (await this.prisma.user.findFirst({ where: { email: invite.email, storeId: null }, select: { id: true } }))) throw taken();
      throw error;
    }

    return { session: await this.sessions.start(result.user, userAgent), affiliate: result.affiliate };
  }

  /**
   * The acceptance itself: the terms read are the terms in force, the `/name` claimed under the
   * segment's lock — shared with the shop's categories — and the affiliate moved out of INVITED by a
   * write that holds only while they are still in it.
   */
  private async acceptWithin(tx: Prisma.TransactionClient, invite: LiveInvite, userId: string, dto: AffiliateAcceptanceDto): Promise<AcceptedAffiliate> {
    const slug = slugify(dto.slug);
    const problem = slugProblemOf(slug);
    if (problem) throw slugRefused(problem);

    const program = await tx.affiliateProgram.findUniqueOrThrow({ where: { storeId: invite.storeId }, select: { termsVersion: true } });
    if (program.termsVersion !== dto.termsVersion) {
      throw new ConflictException(affiliateError('AFFILIATE_TERMS_CHANGED', 'The shop changed its terms since they were read'));
    }

    const linked = await tx.affiliate.findFirst({ where: { storeId: invite.storeId, userId, status: { not: 'ENDED' } }, select: { id: true } });
    if (linked) throw new ConflictException(affiliateError('AFFILIATE_ALREADY_LINKED', 'This account already sells for this shop'));

    await lockShopSegment(tx, invite.storeId, slug);
    if (await shopSegmentHolder(tx, invite.storeId, slug, { affiliateId: invite.affiliateId })) throw slugRefused('TAKEN');

    const now = new Date();
    const moved = await tx.affiliate.updateMany({
      where: { id: invite.affiliateId, status: 'INVITED' },
      data: { status: 'ACTIVE', slug, userId, pixKey: dto.pixKey, termsVersion: program.termsVersion, termsAcceptedAt: now, acceptedAt: now },
    });
    if (moved.count === 0) throw inviteMissing();
    await tx.affiliateInvite.update({ where: { affiliateId: invite.affiliateId }, data: { usedAt: now } });

    return { storeName: invite.store.name, storeSlug: invite.store.slug, slug };
  }

  /** The invite a token names, if it still works: never one, used, replaced or cancelled is 404; past its week, 410. */
  private async liveInvite(token: string): Promise<LiveInvite> {
    const row = await this.prisma.affiliateInvite.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { affiliate: { include: { store: { select: { name: true, slug: true, logoUrl: true } } } } },
    });
    if (!row || row.usedAt || row.affiliate.status !== 'INVITED') throw inviteMissing();
    if (row.expiresAt.getTime() <= Date.now()) {
      throw new GoneException(affiliateError('AFFILIATE_INVITE_EXPIRED', "The invite's week is over: the shop can send it again"));
    }

    const { affiliate } = row;
    return { affiliateId: affiliate.id, storeId: affiliate.storeId, name: affiliate.name, email: affiliate.email, tableId: affiliate.tableId, expiresAt: row.expiresAt, store: affiliate.store };
  }
}
