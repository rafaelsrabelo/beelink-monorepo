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

/**
 * The general rate of the table a page announces: the table saved on it, else the shop's default one.
 * A shop whose programme was never opened has no table yet, and reads the one it would be born with.
 */
export async function announcedRateOf(prisma: PrismaService, storeId: string, tableRateBps: number | null): Promise<number> {
  if (tableRateBps !== null) return tableRateBps;
  const fallback = await prisma.commissionTable.findFirst({ where: { storeId, isDefault: true }, select: { defaultRateBps: true } });
  return fallback?.defaultRateBps ?? DEFAULT_COMMISSION_TABLE.defaultRateBps;
}

/** The page, when visitors see it now; `null` whenever they do not. */
export async function liveAffiliatePageOf(prisma: PrismaService, storeId: string, linksLive: boolean): Promise<LiveAffiliatePage | null> {
  // Nothing is asked of the database while the deployment takes no affiliates in: this runs on every shop window's read.
  if (!linksLive) return null;
  const page = await prisma.affiliatePage.findUnique({
    where: { storeId },
    include: {
      table: { select: { defaultRateBps: true } },
      store: { select: { affiliateProgram: { select: { enabled: true, termsText: true, termsVersion: true } } } },
    },
  });
  const program = page?.store.affiliateProgram;
  if (!page || !program || affiliatePageBlockOf(page.open, program.enabled, linksLive) !== null) return null;

  return {
    tableId: page.tableId,
    approval: page.approval,
    placements: { homeBanner: page.homeBanner, footerLink: page.footerLink, topStrip: page.topStrip },
    content: affiliatePageContentOf(page.content),
    rateBps: await announcedRateOf(prisma, storeId, page.table?.defaultRateBps ?? null),
    terms: { text: program.termsText, version: program.termsVersion },
  };
}

/** What every page of the shop window is told of it (`PublicStore.affiliatePage`). */
export function publicPlacementOf(live: LiveAffiliatePage | null): PublicAffiliatePagePlacement | null {
  if (!live) return null;
  const { content } = live;
  return { placements: live.placements, rateBps: live.rateBps, bannerTitle: content.bannerTitle, bannerText: content.bannerText, bannerCta: content.bannerCta };
}
