// Nest
import { Injectable } from '@nestjs/common';

// Types
import type { ApplyTemplatePayload, PageDraft } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { StoresService } from '../stores/stores.service.js';
import { touchDraft } from './page-draft-revision.js';
import { restoreDocument } from './page-restore.js';
import { pageFor } from './page-scope.js';
import { templateDocument } from './page-template-choice.js';
import { PageVersionsService } from './page-versions.service.js';
import { PageRules } from './page.rules.js';

/** A model applied to a page that already exists. Listing the models is `PageTemplatesService`'s. */
@Injectable()
export class PageTemplateApplyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
    private readonly rules: PageRules,
    private readonly drafts: PageVersionsService,
  ) {}

  /**
   * The model's bands, written over the page's draft, which they replace: it does not publish — the
   * shop changes only when the owner presses Publicar on what they now see. Neither the page's
   * status nor its words for a search result are touched: those have no draft.
   *
   * The same write a restored version is, by the same function: one transaction under the shop's
   * lock, one revision up. The model is refused before the revision is touched, so a refusal leaves
   * the draft and its revision as they were.
   */
  async apply(storeSlug: string, userId: string, pageId: string, choice: ApplyTemplatePayload, revision?: number): Promise<PageDraft> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const page = await pageFor(this.prisma, storeId, pageId);

    await this.prisma.$transaction(async (tx) => {
      await this.rules.lockShop(tx, storeId);
      const document = await templateDocument(tx, { storeId, page }, choice);

      await touchDraft(tx, page.id, revision);
      await restoreDocument(tx, { storeId, pageId: page.id, document });
    });

    return this.drafts.draft(storeSlug, userId, page.id);
  }
}
