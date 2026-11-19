// Types
import type { AffiliatePageBlock, AffiliatePageContent, PublicAffiliatePagePlacement } from '@harness-monorepo/contracts';
import type { AffiliateApprovalMode } from '../../generated/prisma/enums.js';

// App
import type { PrismaService } from '../../shared/prisma/prisma.service.js';
import { affiliatePageContentOf } from './affiliate-page-content.js';
import { DEFAULT_COMMISSION_TABLE } from './affiliates.constants.js';

/** A shop's page as visitors see it, read once for everything that draws or takes it. */
export interface LiveAffiliatePage {
  /** The table approvals start from, as saved: null is the default table. */
  tableId: string | null;
  approval: AffiliateApprovalMode;
  placements: PublicAffiliatePagePlacement['placements'];
  content: AffiliatePageContent;
  /** The announced table's general rate: what `{comissao}` becomes. */
  rateBps: number;
  /** The highest a product on sale earns on it: above `rateBps`, `{comissao}` is "até" it. */
  maxRateBps: number;
  terms: { text: string | null; version: number };
}

/**
 * Why visitors do not see the page, or `null` when they do (plan 2026-11-14): the shopkeeper opened
 * it, the programme is on and this deployment takes affiliates in — the switch that follows the
 * privacy policy telling of them, the same one the links wait on. What the shopkeeper can change is
 * said first.
 */
export function affiliatePageBlockOf(open: boolean, programOn: boolean, linksLive: boolean): AffiliatePageBlock | null {
  if (!open) return 'CLOSED';
  if (!programOn) return 'PROGRAM_OFF';
  if (!linksLive) return 'LINKS_OFF';
  return null;
}

/** The rates a page announces: its table's general one, and the highest a product on sale earns there. */
export interface AnnouncedRates {
  rateBps: number;
  maxRateBps: number;
}

/**
 * The rates of the table a page announces: the table saved on it, else the shop's default one. A shop
 * whose programme was never opened has no table yet, and reads the one it would be born with.
 *
 * The highest is what a product on sale earns there by `rateOf` — its own rate, else its category's:
 * a category's counts only through a product on sale with no rate of its own, so no rate is announced
 * that no sale can earn.
 */
export async function announcedRatesOf(prisma: PrismaService, storeId: string, saved: { id: string; defaultRateBps: number } | null): Promise<AnnouncedRates> {
  const table = saved ?? (await prisma.commissionTable.findFirst({ where: { storeId, isDefault: true }, select: { id: true, defaultRateBps: true } }));
  if (!table) return { rateBps: DEFAULT_COMMISSION_TABLE.defaultRateBps, maxRateBps: DEFAULT_COMMISSION_TABLE.defaultRateBps };

  const above = { gt: table.defaultRateBps };
  const [byProduct, byCategory] = await Promise.all([
    prisma.commissionTableRate.findFirst({
      where: { tableId: table.id, rateBps: above, product: { status: 'ACTIVE' } },
      orderBy: { rateBps: 'desc' },
      select: { rateBps: true },
    }),
    prisma.commissionTableCategoryRate.findFirst({
      where: { tableId: table.id, rateBps: above, category: { products: { some: { status: 'ACTIVE', commissionRates: { none: { tableId: table.id } } } } } },
      orderBy: { rateBps: 'desc' },
      select: { rateBps: true },
    }),
  ]);
  return { rateBps: table.defaultRateBps, maxRateBps: Math.max(table.defaultRateBps, byProduct?.rateBps ?? 0, byCategory?.rateBps ?? 0) };
}

/** The page, when visitors see it now; `null` whenever they do not. */
export async function liveAffiliatePageOf(prisma: PrismaService, storeId: string, linksLive: boolean): Promise<LiveAffiliatePage | null> {
  // Nothing is asked of the database while the deployment takes no affiliates in: this runs on every shop window's read.
  if (!linksLive) return null;
  const page = await prisma.affiliatePage.findUnique({
    where: { storeId },
    include: {
      table: { select: { id: true, defaultRateBps: true } },
      store: { select: { affiliateProgram: { select: { enabled: true, termsText: true, termsVersion: true } } } },
    },
  });
  const program = page?.store.affiliateProgram;
  if (!page || !program || affiliatePageBlockOf(page.open, program.enabled, linksLive) !== null) return null;

  return {
    tableId: page.tableId,
    approval: page.approval,
    placements: { footerLink: page.footerLink, topStrip: page.topStrip },
    content: affiliatePageContentOf(page.content),
    ...(await announcedRatesOf(prisma, storeId, page.table)),
    terms: { text: program.termsText, version: program.termsVersion },
  };
}

/** What every page of the shop window is told of it (`PublicStore.affiliatePage`). */
export function publicPlacementOf(live: LiveAffiliatePage | null): PublicAffiliatePagePlacement | null {
  if (!live) return null;
  const { content } = live;
  return { placements: live.placements, rateBps: live.rateBps, maxRateBps: live.maxRateBps, bannerTitle: content.bannerTitle, bannerText: content.bannerText, bannerCta: content.bannerCta };
}
