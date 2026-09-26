// Types
import type { PrismaService } from '../../shared/prisma/prisma.service.js';
import type { StoresService } from '../stores/stores.service.js';

// App
import { documentOf } from './page-document.js';
import { PageRules } from './page.rules.js';
import { PageVersionsService } from './page-versions.service.js';

const STORE = '0199a0f1-0000-7000-8000-000000000001';
const PAGE = '0199f000-0000-7000-8000-000000000002';
const AT = new Date('2026-09-26T00:00:00.000Z');

function component(id: string, title: string) {
  return {
    id,
    sectionId: 'b1',
    storeId: STORE,
    kind: 'HEADING',
    title,
    subtitle: null,
    body: null,
    span: 'FULL',
    display: null,
    source: null,
    sourceCategoryId: null,
    limit: null,
    columns: null,
    align: null,
    visibleOn: 'ALL',
    items: [],
    position: 0,
    isActive: true,
    createdAt: AT,
    updatedAt: AT,
  };
}

function rows(title: string) {
  return [
    { id: 'b1', storeId: STORE, pageId: PAGE, name: null, width: 'CONTAINED', background: null, position: 0, isActive: true, createdAt: AT, updatedAt: AT, components: [component('c1', title)] },
  ];
}

function page(status: string) {
  return {
    id: PAGE,
    storeId: STORE,
    kind: 'LANDING',
    slug: 'ofertas',
    title: 'Ofertas',
    usesChrome: true,
    inMenu: false,
    seoTitle: null,
    seoDescription: null,
    seoImageUrl: null,
    status,
    publishedAt: null,
    createdAt: AT,
    updatedAt: AT,
  };
}

function build(found: { status?: string; draftTitle?: string; publishedTitle?: string | null } = {}) {
  const latest =
    found.publishedTitle === null
      ? null
      : { id: 'v1', number: 1, note: null, createdAt: AT, author: { id: 'u1', name: 'Ana' }, document: documentOf(rows(found.publishedTitle ?? 'Oi') as never) };
  const prisma = {
    storePage: {
      findFirst: vi.fn().mockResolvedValue({ id: PAGE, kind: 'LANDING' }),
      findUniqueOrThrow: vi.fn().mockResolvedValue(page(found.status ?? 'PUBLISHED')),
      update: vi.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) => ({ ...page('DRAFT'), ...data })),
    },
    storeSection: { findMany: vi.fn().mockResolvedValue(rows(found.draftTitle ?? 'Oi')) },
    storePageVersion: {
      findFirst: vi.fn().mockResolvedValue(latest),
      create: vi.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) => ({ id: 'v2', note: null, createdAt: AT, author: { id: 'u1', name: 'Ana' }, ...data })),
    },
    $queryRaw: vi.fn().mockResolvedValue([]),
    $transaction: vi.fn(),
  } as unknown as PrismaService;
  vi.mocked(prisma.$transaction).mockImplementation(((work: unknown) =>
    typeof work === 'function' ? (work as (tx: PrismaService) => unknown)(prisma) : Promise.resolve([])) as never);

  const stores = { ownedStoreId: vi.fn().mockResolvedValue(STORE) } as unknown as StoresService;

  return { service: new PageVersionsService(prisma, stores, new PageRules(prisma)), prisma };
}

describe('PageVersionsService.draft', () => {
  it('says there is nothing to publish while the draft is what is served', async () => {
    const draft = await build().service.draft('lessari', 'u1', PAGE);

    expect(draft).toMatchObject({ hasUnpublishedChanges: false, published: { number: 1, live: true, author: { name: 'Ana' } } });
    expect(draft.sections[0]!.components[0]!.title).toBe('Oi');
  });

  it('says there is when the draft differs, and when nothing was ever published', async () => {
    expect((await build({ draftTitle: 'Novo' }).service.draft('lessari', 'u1', PAGE)).hasUnpublishedChanges).toBe(true);
    expect(await build({ publishedTitle: null }).service.draft('lessari', 'u1', PAGE)).toMatchObject({ hasUnpublishedChanges: true, published: null });
  });

  it('serves no version while the page is taken down, whatever it holds', async () => {
    expect((await build({ status: 'ARCHIVED' }).service.draft('lessari', 'u1', PAGE)).published).toBeNull();
  });
});

describe('PageVersionsService.publish', () => {
  it('freezes the draft as the next number under the shop’s lock, and puts the page up with it', async () => {
    const { service, prisma } = build({ status: 'DRAFT', draftTitle: 'Novo' });

    const result = await service.publish('lessari', 'u1', PAGE, { note: 'Black Friday' });

    expect(prisma.storePageVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ pageId: PAGE, storeId: STORE, number: 2, note: 'Black Friday', authorId: 'u1' }),
      }),
    );
    const { data } = vi.mocked(prisma.storePageVersion.create).mock.calls[0]![0] as { data: { document: { sections: { components: { title: string }[] }[] } } };
    expect(data.document.sections[0]!.components[0]!.title).toBe('Novo');
    expect(prisma.storePage.update).toHaveBeenCalledWith({ where: { id: PAGE }, data: { status: 'PUBLISHED', publishedAt: AT } });
    expect(vi.mocked(prisma.$queryRaw).mock.invocationCallOrder[0]!).toBeLessThan(
      vi.mocked(prisma.storePageVersion.create).mock.invocationCallOrder[0]!,
    );
    expect(result.version).toMatchObject({ number: 2, note: 'Black Friday', live: true });
  });
});
