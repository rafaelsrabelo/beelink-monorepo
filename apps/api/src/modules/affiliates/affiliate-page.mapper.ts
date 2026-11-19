// Types
import type { AffiliatePageContent, AffiliatePageSettings, ShopAffiliateApplication } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';
import type { AffiliateApplicationModel, AffiliatePageModel } from '../../generated/prisma/models.js';
import type { AffiliateStatus } from '../../generated/prisma/enums.js';

// App
import { affiliatePageContentOf } from './affiliate-page-content.js';
import { EMPTY_AFFILIATE_PAGE_CONTENT } from './affiliate-page.constants.js';

/** The page as its owner edits it; a shop that never saved one reads it closed, with every text the product's own. */
export function toAffiliatePageSettings(row: AffiliatePageModel | null): AffiliatePageSettings {
  if (!row) {
    return {
      open: false,
      placements: { footerLink: true, topStrip: false },
      tableId: null,
      approval: 'MANUAL',
      content: { ...EMPTY_AFFILIATE_PAGE_CONTENT },
      updatedAt: null,
    };
  }
  return {
    open: row.open,
    placements: { footerLink: row.footerLink, topStrip: row.topStrip },
    tableId: row.tableId,
    approval: row.approval,
    content: affiliatePageContentOf(row.content),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** What the `content` column is written with: the contract's shape, key by key, so nothing the DTO did not check reaches it. */
export function contentJsonOf(content: AffiliatePageContent): Prisma.InputJsonObject {
  return {
    badge: content.badge,
    title: content.title,
    subtitle: content.subtitle,
    ctaLabel: content.ctaLabel,
    highlights: content.highlights ? [...content.highlights] : null,
    imageUrl: content.imageUrl,
    stepsTitle: content.stepsTitle,
    steps: content.steps?.map(({ title, text }) => ({ title, text })) ?? null,
    benefits: content.benefits?.map(({ title, text }) => ({ title, text })) ?? null,
    questionsTitle: content.questionsTitle,
    questions: content.questions?.map(({ question, answer }) => ({ question, answer })) ?? null,
    closingTitle: content.closingTitle,
    closingText: content.closingText,
    formTitle: content.formTitle,
    formSubtitle: content.formSubtitle,
    askExtraQuestion: content.askExtraQuestion,
    extraQuestion: content.extraQuestion,
    successMessage: content.successMessage,
    bannerTitle: content.bannerTitle,
    bannerText: content.bannerText,
    bannerCta: content.bannerCta,
  };
}

/** What every read of an application brings along: where the affiliate it invited stands now. */
export const applicationInclude = { affiliate: { select: { id: true, status: true } } } as const;

export function toShopAffiliateApplication(row: AffiliateApplicationModel & { affiliate: { id: string; status: AffiliateStatus } | null }): ShopAffiliateApplication {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    extraQuestion: row.extraQuestion,
    extraAnswer: row.extraAnswer,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    decidedAt: row.decidedAt?.toISOString() ?? null,
    affiliate: row.affiliate,
  };
}
