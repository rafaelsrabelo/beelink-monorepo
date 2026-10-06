// Nest
import { Injectable } from '@nestjs/common';

// Types
import type { OpeningTemplatesQuery, PagePreview, PageTemplatesQuery, PageTemplateSummary, TemplatePreviewQuery } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { StoresService } from '../stores/stores.service.js';
import { servedSectionsOf } from './page-document.js';
import { servedSections, SHOP_WORDS } from './page-resolve.js';
import { pageFor } from './page-scope.js';
import { templateDocument, templateIdOf } from './page-template-choice.js';
import { toStorePage } from './pages.mapper.js';
import { templatesFor } from './template-catalog.js';

/** The models a shop's page may be arranged with, and how each would look on it. It reads; arranging a page is not done here. */
@Injectable()
export class PageTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
  ) {}

  /**
   * For the page named, or the home when none is: the catalogue narrowed to its kind and the store's
   * type. `kind` with no page asks about one that does not exist yet — a landing about to be made —
   * and no page is read for it.
   */
  async list(storeSlug: string, userId: string, { pageId, kind }: PageTemplatesQuery = {}): Promise<PageTemplateSummary[]> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const pageKind = !pageId && kind ? kind : (await pageFor(this.prisma, storeId, pageId)).kind;
    const store = await this.prisma.store.findUniqueOrThrow({
      where: { id: storeId },
      select: { type: true, category: { select: { slug: true } } },
    });

    return templatesFor(pageKind, store.type, store.category?.slug ?? null);
  }

  /**
   * The models a store of this type may open its home with, before the store exists. The category is
   * the one picked in the form: it orders the answer and hides nothing, so one that names no row is
   * not a refusal — it suggests nothing.
   */
  async opening({ storeType, categoryId }: OpeningTemplatesQuery): Promise<PageTemplateSummary[]> {
    const category = categoryId ? await this.prisma.storeCategory.findUnique({ where: { id: categoryId }, select: { slug: true } }) : null;

    return templatesFor('HOME', storeType, category?.slug ?? null);
  }

  /**
   * A model as it would look on a page of this shop, with nothing written: the document applying it
   * would restore into the draft, resolved as a visitor would be served it — today's products, prices
   * and addresses. Refused exactly where applying is, by the same function.
   *
   * The ids of its bands and blocks are made up for this answer, but for the strip and a contact
   * form the draft already holds: they name no row, and are not to be written back.
   */
  async preview(storeSlug: string, userId: string, templateId: string, query: TemplatePreviewQuery = {}): Promise<PagePreview> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const page = await pageFor(this.prisma, storeId, query.pageId);

    const document = await templateDocument(this.prisma, { storeId, page }, { template: templateIdOf(templateId), productId: query.productId, categoryId: query.categoryId });
    const { store, ...row } = await this.prisma.storePage.findUniqueOrThrow({ where: { id: page.id }, include: { store: { select: SHOP_WORDS } } });

    return { page: toStorePage(row), sections: await servedSections(this.prisma, store, servedSectionsOf(document)) } satisfies PagePreview;
  }
}
