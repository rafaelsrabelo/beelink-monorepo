// Nest
import { Injectable } from '@nestjs/common';

// Types
import type { PageDraft, PublishPageResult } from '@harness-monorepo/contracts';
import type { PublishPageDto } from './dto/page-versions.dto.js';

// App
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { StoresService } from '../stores/stores.service.js';
import { documentOf, sameDocument } from './page-document.js';
import { freezePage, VERSION_SELECT } from './page-freeze.js';
import { sectionInclude, toSection } from './page.mapper.js';
import { pageFor } from './page-scope.js';
import { PageRules } from './page.rules.js';
import { toStorePage } from './pages.mapper.js';
import { toVersionSummary } from './page-versions.mapper.js';

/**
 * A page's draft and its versions. The rows the panel edits are the draft; Publicar freezes them as
 * the page's next version, which is what the shop serves. Products, prices and stock are not frozen:
 * they are resolved whenever a page is read.
 */
@Injectable()
export class PageVersionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
    private readonly rules: PageRules,
  ) {}

  /**
   * The draft, and whether it differs from what is served. One snapshot: the rows and the version
   * compared with them are read in a single repeatable-read transaction, so a write landing between
   * the two reads cannot make the answer describe a draft nobody has.
   *
   * The comparison is exact, so a band moved and moved back is no change — which is what the owner
   * means by "nothing to publish".
   */
  async draft(storeSlug: string, userId: string, pageId: string): Promise<PageDraft> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const { id } = await pageFor(this.prisma, storeId, pageId);

    const [page, rows, latest] = await this.prisma.$transaction(
      (tx) =>
        Promise.all([
          tx.storePage.findUniqueOrThrow({ where: { id } }),
          tx.storeSection.findMany({ where: { pageId: id }, include: sectionInclude, orderBy: [{ position: 'asc' }, { id: 'asc' }] }),
          tx.storePageVersion.findFirst({
            where: { pageId: id },
            orderBy: { number: 'desc' },
            select: { ...VERSION_SELECT, document: true },
          }),
        ]),
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );

    const live = page.status === 'PUBLISHED' && latest !== null;

    return {
      page: toStorePage(page),
      hasUnpublishedChanges: !latest || !sameDocument(documentOf(rows), latest.document),
      published: live ? toVersionSummary(latest, true) : null,
      sections: rows.map(toSection),
    } satisfies PageDraft;
  }

  /**
   * The draft, frozen as the page's next version and served from now on; a landing goes up with it.
   * Under the shop's lock, so two presses cannot take one number. Problems a check would list are
   * the owner's to weigh, never a refusal: the ticket's "dá para publicar mesmo assim".
   */
  async publish(storeSlug: string, userId: string, pageId: string, dto: PublishPageDto): Promise<PublishPageResult> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const { id } = await pageFor(this.prisma, storeId, pageId);

    return this.prisma.$transaction(async (tx) => {
      await this.rules.lockShop(tx, storeId);
      const version = await freezePage(tx, { storeId, pageId: id, authorId: userId, note: dto.note ?? null });
      const page = await tx.storePage.update({
        where: { id },
        data: { status: 'PUBLISHED', publishedAt: version.createdAt },
      });

      return { page: toStorePage(page), version: toVersionSummary(version, true) } satisfies PublishPageResult;
    });
  }
}
