// Nest
import { Injectable, NotFoundException } from '@nestjs/common';

// Types
import type { PageDraft, PageProblem, PageVersionSummary, PublishPageResult } from '@harness-monorepo/contracts';
import type { PublishPageDto } from './dto/page-versions.dto.js';

// App
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { StoresService } from '../stores/stores.service.js';
import { documentOf, readPageDocument, sameDocument } from './page-document.js';
import { checkDraft, touchDraft } from './page-draft-revision.js';
import { freezePage, VERSION_SELECT } from './page-freeze.js';
import { sectionInclude, toSection } from './page.mapper.js';
import { problemsOf } from './page-problems.js';
import { lookupsOf } from './page-resolve.js';
import { restoreDocument } from './page-restore.js';
import { pageFor } from './page-scope.js';
import { PageRules, pageError } from './page.rules.js';
import { PAGE_VERSIONS_LISTED } from './pages.constants.js';
import { toStorePage } from './pages.mapper.js';
import { toVersionSummary } from './page-versions.mapper.js';

/** Any version: the ids are uuid v7, and the check is only that Postgres could read one. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
      revision: page.draftRevision,
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
  async publish(storeSlug: string, userId: string, pageId: string, dto: PublishPageDto, revision?: number): Promise<PublishPageResult> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const { id } = await pageFor(this.prisma, storeId, pageId);

    return this.prisma.$transaction(async (tx) => {
      await this.rules.lockShop(tx, storeId);
      // The draft the editor saw, and no later one: a write from another tab since is not published unseen.
      await checkDraft(tx, id, revision);
      const version = await freezePage(tx, { storeId, pageId: id, authorId: userId, note: dto.note ?? null });
      const page = await tx.storePage.update({
        where: { id },
        data: { status: 'PUBLISHED', publishedAt: version.createdAt },
      });

      return { page: toStorePage(page), version: toVersionSummary(version, true) } satisfies PublishPageResult;
    });
  }

  /** Every version, newest first, up to a ceiling a screen can list. The newest is live while the page is up. */
  async versions(storeSlug: string, userId: string, pageId: string): Promise<PageVersionSummary[]> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const { id } = await pageFor(this.prisma, storeId, pageId);
    const [page, rows] = await Promise.all([
      this.prisma.storePage.findUniqueOrThrow({ where: { id }, select: { status: true } }),
      this.prisma.storePageVersion.findMany({
        where: { pageId: id },
        orderBy: { number: 'desc' },
        take: PAGE_VERSIONS_LISTED,
        select: VERSION_SELECT,
      }),
    ]);

    return rows.map((row, index) => toVersionSummary(row, index === 0 && page.status === 'PUBLISHED'));
  }

  /**
   * A version copied into the draft, which it replaces: it does not publish — the shop changes only
   * when the owner presses Publicar on what they now see. One write to the draft, so the revision
   * goes up by one, as any other.
   */
  async restore(storeSlug: string, userId: string, pageId: string, versionId: string, revision?: number): Promise<PageDraft> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const { id } = await pageFor(this.prisma, storeId, pageId);

    await this.prisma.$transaction(async (tx) => {
      await this.rules.lockShop(tx, storeId);
      const version = UUID.test(versionId)
        ? await tx.storePageVersion.findFirst({ where: { id: versionId, pageId: id }, select: { document: true } })
        : null;
      if (!version) throw new NotFoundException(pageError('PAGE_VERSION_NOT_FOUND', `No version ${versionId} of this page`));

      await touchDraft(tx, id, revision);
      await restoreDocument(tx, { storeId, pageId: id, document: readPageDocument(version.document) });
    });

    return this.draft(storeSlug, userId, id);
  }

  /** What Publicar would serve that the owner may not mean to, read from the draft as the shop would resolve it. */
  async problems(storeSlug: string, userId: string, pageId: string): Promise<PageProblem[]> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const { id } = await pageFor(this.prisma, storeId, pageId);
    const rows = await this.prisma.storeSection.findMany({
      where: { pageId: id, isActive: true },
      include: sectionInclude,
      orderBy: [{ position: 'asc' }, { id: 'asc' }],
    });

    return problemsOf(rows, await lookupsOf(this.prisma, storeId, rows));
  }
}
