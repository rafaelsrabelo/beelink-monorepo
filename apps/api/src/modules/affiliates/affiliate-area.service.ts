// Nest
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

// Types
import type { AffiliateHome, AffiliateOrderPage, AffiliatePayoutPage, AffiliateProductPage, AffiliateProfile, AffiliateShop, AffiliateStatement, AffiliateStatusDetails } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';

// App
import { env } from '../../shared/config/env.js';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { StoresService } from '../stores/stores.service.js';
import { nextPaymentOf, numbersOf, ordersOf, payoutsOf, productsOf } from './affiliate-area-reads.js';
import { statementOf } from './affiliate-statement.js';
import { AFFILIATE_AREA_PAGE_SIZE, affiliateError } from './affiliates.constants.js';
import type { AffiliateAreaPageQueryDto, AffiliateProductQueryDto, AffiliateProfileDto } from './dto/affiliate-area.dto.js';

/** The standings the area reads: the person accepted. One invited has nothing to show yet. */
const READ = { in: ['ACTIVE', 'PAUSED', 'ENDED'] as ('ACTIVE' | 'PAUSED' | 'ENDED')[] };
/** The live standing first, then the latest ended (plan IMPULSEIA-108). */
const NEWEST: Prisma.AffiliateOrderByWithRelationInput[] = [{ endedAt: { sort: 'desc', nulls: 'first' } }, { acceptedAt: 'desc' }];

const STANDING = {
  id: true,
  name: true,
  slug: true,
  status: true,
  tableId: true,
  pixKey: true,
  phone: true,
  photoUrl: true,
  tagline: true,
  pendingCents: true,
  availableCents: true,
  table: { select: { name: true, defaultRateBps: true } },
  store: { select: { id: true, slug: true, name: true, logoUrl: true, routeVocabulary: true, affiliateProgram: { select: { enabled: true } } } },
} satisfies Prisma.AffiliateSelect;

type Standing = Prisma.AffiliateGetPayload<{ select: typeof STANDING }> & { status: 'ACTIVE' | 'PAUSED' | 'ENDED'; slug: string };

const pageOf = (query: AffiliateAreaPageQueryDto) => ({ page: query.page ?? 1, pageSize: query.pageSize ?? AFFILIATE_AREA_PAGE_SIZE });
const profileOf = (row: Pick<Standing, 'pixKey' | 'phone' | 'photoUrl' | 'tagline'>): AffiliateProfile => ({ pixKey: row.pixKey, phone: row.phone, photoUrl: row.photoUrl, tagline: row.tagline });

/**
 * The affiliate's own area (IMPULSEIA-108): what an account reads of the shops it sells for. Every
 * read goes through the account's standing with the shop — never the shop's routes — so the only
 * key is the session's own account.
 */
@Injectable()
export class AffiliateAreaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
  ) {}

  /** The shops the account sells for, one standing each, the live before the ended. */
  async shops(userId: string): Promise<AffiliateShop[]> {
    const rows = await this.prisma.affiliate.findMany({
      where: { userId, status: READ, slug: { not: null } },
      orderBy: NEWEST,
      select: { storeId: true, slug: true, status: true, availableCents: true, pendingCents: true, store: { select: { slug: true, name: true, logoUrl: true } } },
    });
    const seen = new Set<string>();
    const shops: AffiliateShop[] = [];
    for (const row of rows) {
      if (seen.has(row.storeId)) continue;
      seen.add(row.storeId);
      shops.push({ store: row.store, slug: row.slug!, status: row.status as AffiliateShop['status'], availableCents: row.availableCents, pendingCents: row.pendingCents });
    }
    return shops.sort((a, b) => Number(a.status === 'ENDED') - Number(b.status === 'ENDED') || a.store.name.localeCompare(b.store.name, 'pt-BR'));
  }

  async home(userId: string, storeSlug: string): Promise<AffiliateHome> {
    const standing = await this.standingOf(userId, storeSlug);
    const now = new Date();
    const [payment, numbers] = await Promise.all([nextPaymentOf(this.prisma, standing.id, standing.availableCents), numbersOf(this.prisma, standing.id, now)]);
    const { store } = standing;

    return {
      store: { slug: store.slug, name: store.name, logoUrl: store.logoUrl },
      affiliate: { id: standing.id, name: standing.name, slug: standing.slug, status: standing.status, table: standing.table },
      linksCredit: env.AFFILIATE_LINKS_ENABLED && standing.status === 'ACTIVE' && store.affiliateProgram?.enabled === true,
      linkPath: standing.status === 'ENDED' ? null : `/${store.slug}/${standing.slug}`,
      pendingCents: standing.pendingCents,
      availableCents: standing.availableCents,
      payment,
      numbers,
      profile: profileOf(standing),
    };
  }

  /** Links are for selling: an ended standing has none. */
  async products(userId: string, storeSlug: string, query: AffiliateProductQueryDto): Promise<AffiliateProductPage> {
    const standing = await this.standingOf(userId, storeSlug);
    if (standing.status === 'ENDED') throw statusRefused(standing.status);
    const owner = {
      storeId: standing.store.id,
      storeSlug: standing.store.slug,
      routeVocabulary: standing.store.routeVocabulary,
      tableId: standing.tableId,
      defaultRateBps: standing.table.defaultRateBps,
      affiliateSlug: standing.slug,
    };
    return productsOf(this.prisma, owner, { ...pageOf(query), q: query.q ?? null });
  }

  async orders(userId: string, storeSlug: string, query: AffiliateAreaPageQueryDto): Promise<AffiliateOrderPage> {
    return ordersOf(this.prisma, (await this.standingOf(userId, storeSlug)).id, pageOf(query));
  }

  async statement(userId: string, storeSlug: string, query: AffiliateAreaPageQueryDto): Promise<AffiliateStatement> {
    const { page, pageSize } = pageOf(query);
    return statementOf(this.prisma, (await this.standingOf(userId, storeSlug)).id, page, pageSize);
  }

  async payouts(userId: string, storeSlug: string, query: AffiliateAreaPageQueryDto): Promise<AffiliatePayoutPage> {
    return payoutsOf(this.prisma, (await this.standingOf(userId, storeSlug)).id, pageOf(query));
  }

  /** Their own data. Ended, they keep only what the shop still pays them through: the Pix key and the phone. */
  async updateProfile(userId: string, storeSlug: string, dto: AffiliateProfileDto): Promise<AffiliateProfile> {
    const standing = await this.standingOf(userId, storeSlug);
    const showcase = dto.photoUrl !== undefined || dto.tagline !== undefined;
    if (standing.status === 'ENDED' && showcase) throw statusRefused(standing.status);

    const row = await this.prisma.affiliate.update({
      where: { id: standing.id },
      data: {
        ...(dto.pixKey !== undefined ? { pixKey: dto.pixKey } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.photoUrl !== undefined ? { photoUrl: dto.photoUrl } : {}),
        ...(dto.tagline !== undefined ? { tagline: dto.tagline } : {}),
      },
      select: { pixKey: true, phone: true, photoUrl: true, tagline: true },
    });
    return profileOf(row);
  }

  /**
   * The account's standing with the shop the area reads: the live one, else the latest ended. The
   * shop is found as its window finds it — a left address answers where it is now. No standing is
   * one answer, whoever asks: the shop is public, whom it pays is not.
   */
  private async standingOf(userId: string, storeSlug: string): Promise<Standing> {
    const storeId = await this.stores.publicStoreId(storeSlug);
    const row = await this.prisma.affiliate.findFirst({ where: { storeId, userId, status: READ, slug: { not: null } }, orderBy: NEWEST, select: STANDING });
    if (!row) throw new NotFoundException(affiliateError('AFFILIATE_NOT_FOUND', 'This account does not sell for this shop'));
    return row as Standing;
  }
}

function statusRefused(status: AffiliateStatusDetails['status']): ConflictException {
  return new ConflictException(affiliateError<AffiliateStatusDetails>('AFFILIATE_STATUS_INVALID', `Not while ${status}`, { status }));
}
