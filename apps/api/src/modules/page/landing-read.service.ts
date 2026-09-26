// Nest
import { Injectable, NotFoundException } from '@nestjs/common';

// Types
import type { PagePreview, PublicLanding, PublicSection } from '@harness-monorepo/contracts';
import type { RouteVocabulary } from '../../generated/prisma/enums.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { ROUTE_WORDS } from '../catalog/catalog.constants.js';
import { StoresService } from '../stores/stores.service.js';
import { pageFor } from './page-scope.js';
import { lookupsOf } from './page-resolve.js';
import { toPublicSection } from './page-public.mapper.js';
import { sectionInclude } from './page.mapper.js';
import { pageError } from './page.rules.js';
import { toStorePage } from './pages.mapper.js';

/** What a band's links are built from: the shop's address and the words its routes use. */
const SHOP_WORDS = { id: true, slug: true, routeVocabulary: true } as const;

/**
 * A page's bands as a visitor is served them: a published landing to anyone, any page to its owner.
 * Both are the same read the shop's home gets — the same query, the same mapper, the same lookups —
 * which is what stops a landing and the home it sits beside from drawing a band two ways.
 */
@Injectable()
export class LandingReadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
  ) {}

  /**
   * A published landing, at `/<shop>/lp/<slug>`. A draft and an archived one answer as missing: the
   * address is not a page yet, or not anymore, and a crawler has to hear exactly that.
   */
  async publicLanding(storeSlug: string, pageSlug: string): Promise<PublicLanding> {
    const storeId = await this.stores.publicStoreId(storeSlug);
    const page = await this.prisma.storePage.findFirst({
      where: { storeId, kind: 'LANDING', slug: pageSlug, status: 'PUBLISHED' },
      include: { store: { select: SHOP_WORDS } },
    });
    if (!page?.slug) throw new NotFoundException(pageError('PAGE_NOT_FOUND', `No page "${pageSlug}" in this shop`));

    return {
      slug: page.slug,
      title: page.title,
      usesChrome: page.usesChrome,
      seo: { title: page.seoTitle, description: page.seoDescription, imageUrl: page.seoImageUrl },
      sections: await this.sectionsOf(page.store, page.id),
    } satisfies PublicLanding;
  }

  /** Any page of the owner's, whatever its status, drawn as it would be served: the editor's canvas for it. */
  async preview(storeSlug: string, userId: string, pageId: string): Promise<PagePreview> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const { id } = await pageFor(this.prisma, storeId, pageId);

    const { store, ...page } = await this.prisma.storePage.findUniqueOrThrow({
      where: { id },
      include: { store: { select: SHOP_WORDS } },
    });

    return { page: toStorePage(page), sections: await this.sectionsOf(store, id) } satisfies PagePreview;
  }

  /** The page's shown bands, resolved. A hidden band is not served; a hidden block inside one is dropped by the mapper. */
  private async sectionsOf(
    store: { id: string; slug: string; routeVocabulary: RouteVocabulary },
    pageId: string,
  ): Promise<PublicSection[]> {
    const rows = await this.prisma.storeSection.findMany({
      where: { pageId, isActive: true },
      include: sectionInclude,
      orderBy: [{ position: 'asc' }, { id: 'asc' }],
    });
    const { slugs, shelves } = await lookupsOf(this.prisma, store.id, rows);
    const words = ROUTE_WORDS[store.routeVocabulary];

    return rows.map((row) => toPublicSection(row, store.slug, words, slugs, shelves));
  }
}
