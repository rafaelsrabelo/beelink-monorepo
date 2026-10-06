// Nest
import { Injectable } from '@nestjs/common';

// Types
import type { PageTemplateSummary } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { StoresService } from '../stores/stores.service.js';
import { pageFor } from './page-scope.js';
import { templatesFor } from './template-catalog.js';

/** The models a shop's page may be arranged with. It lists; arranging a page is not done here. */
@Injectable()
export class PageTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
  ) {}

  /** For the page named, or the home when none is: the catalogue narrowed to its kind and the store's type. */
  async list(storeSlug: string, userId: string, pageId?: string): Promise<PageTemplateSummary[]> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const page = await pageFor(this.prisma, storeId, pageId);
    const store = await this.prisma.store.findUniqueOrThrow({
      where: { id: storeId },
      select: { type: true, category: { select: { slug: true } } },
    });

    return templatesFor(page.kind, store.type, store.category?.slug ?? null);
  }
}
