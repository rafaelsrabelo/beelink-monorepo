// Nest
import { Injectable, NotFoundException } from '@nestjs/common';

// Types
import type { PagePreview, PublicLanding, PublicSection } from '@harness-monorepo/contracts';
import type { RouteVocabulary } from '../../generated/prisma/enums.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { ROUTE_WORDS } from '../catalog/catalog.constants.js';
import { StoresService } from '../stores/stores.service.js';
import { readPageDocument, servedSectionsOf, type SectionShape } from './page-document.js';
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
   * A published landing, at `/<shop>/lp/<slug>`, as it was last published — its draft is the owner's
   * until Publicar. A draft and an archived one answer as missing: the address is not a page yet, or
   * not anymore, and a crawler has to hear exactly that. So does one never frozen, which no path
   * leaves published.
   */
  async publicLanding(storeSlug: string, pageSlug: string): Promise<PublicLanding> {
    const storeId = await this.stores.publicStoreId(storeSlug);
    const page = await this.prisma.storePage.findFirst({
      where: { storeId, kind: 'LANDING', slug: pageSlug, status: 'PUBLISHED' },
      include: {
        store: { select: SHOP_WORDS },
        versions: { orderBy: { number: 'desc' }, take: 1, select: { document: true } },
      },
    });
    const version = page?.versions[0];
    if (!page?.slug || !version) {
      throw new NotFoundException(pageError('PAGE_NOT_FOUND', `No page "${pageSlug}" in this shop`));
    }

    return {
      slug: page.slug,
      title: page.title,
      usesChrome: page.usesChrome,
      seo: { title: page.seoTitle, description: page.seoDescription, imageUrl: page.seoImageUrl },
      sections: await this.sectionsOf(page.store, servedSectionsOf(readPageDocument(version.document))),
    } satisfies PublicLanding;
  }

  /**
   * Any page of the owner's, whatever its status, drawn from its draft as it would be served: the
   * editor's canvas. No id is the shop's home, which the editor opens without knowing its id.
   */
  async preview(storeSlug: string, userId: string, pageId?: string): Promise<PagePreview> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const { id } = await pageFor(this.prisma, storeId, pageId);

    const { store, ...page } = await this.prisma.storePage.findUniqueOrThrow({
      where: { id },
      include: { store: { select: SHOP_WORDS } },
    });
    const rows = await this.prisma.storeSection.findMany({
      where: { pageId: id, isActive: true },
      include: sectionInclude,
      orderBy: [{ position: 'asc' }, { id: 'asc' }],
    });

    return { page: toStorePage(page), sections: await this.sectionsOf(store, rows) } satisfies PagePreview;
  }

  /** The shown bands, resolved: a draft's rows or a version's document, read by the same mapper. */
  private async sectionsOf(
    store: { id: string; slug: string; routeVocabulary: RouteVocabulary },
    sections: readonly SectionShape[],
  ): Promise<PublicSection[]> {
    const lookups = await lookupsOf(this.prisma, store.id, sections);
    const words = ROUTE_WORDS[store.routeVocabulary];

    return sections.map((section) => toPublicSection(section, store.slug, words, lookups));
  }
}
