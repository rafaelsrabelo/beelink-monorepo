// Types
import type { StorePage } from '@harness-monorepo/contracts';
import type { StorePageModel } from '../../generated/prisma/models.js';

/** A page as its owner manages it. Four SEO columns on the way out, one object on the wire. */
export function toStorePage(row: StorePageModel): StorePage {
  return {
    id: row.id,
    kind: row.kind,
    slug: row.slug,
    title: row.title,
    usesChrome: row.usesChrome,
    inMenu: row.inMenu,
    status: row.status,
    seo: { title: row.seoTitle, description: row.seoDescription, imageUrl: row.seoImageUrl },
    publishedAt: row.publishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  } satisfies StorePage;
}
