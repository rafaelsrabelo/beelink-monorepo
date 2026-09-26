// Types
import type { PrismaService } from '../../shared/prisma/prisma.service.js';
import type { StoresService } from '../stores/stores.service.js';
import type { CreateLandingDto, UpdatePageDto } from './dto/pages.dto.js';

// App
import { PageRules } from './page.rules.js';
import { PagesService } from './pages.service.js';

const STORE = '0199a0f1-0000-7000-8000-000000000001';
const HOME = '0199f000-0000-7000-8000-000000000001';
const LANDING = '0199f000-0000-7000-8000-000000000002';
const PRODUCT = '0199e000-0000-7000-8000-000000000001';
const AT = new Date('2026-09-26T00:00:00.000Z');

function pageRow(over: Record<string, unknown> = {}) {
  return {
    id: LANDING,
    storeId: STORE,
    kind: 'LANDING',
    slug: 'lancamento',
    title: 'Lançamento',
    usesChrome: true,
    inMenu: false,
    seoTitle: null,
    seoDescription: null,
    seoImageUrl: null,
    status: 'DRAFT',
    publishedAt: null,
    createdAt: AT,
    updatedAt: AT,
    ...over,
  };
}

const launch = { title: 'Lançamento Whey', template: 'lancamento', productId: PRODUCT } as CreateLandingDto;

function build(
  found: {
    type?: 'ECOMMERCE' | 'INSTITUTIONAL';
    /** The product the template names, or null when it is not this shop's. */
    product?: Record<string, unknown> | null;
    /** A page already on the address being asked for. */
    taken?: boolean;
    /** The page a patch names. */
    page?: { kind: 'HOME' | 'LANDING'; status?: string };
  } = {},
) {
  const prisma = {
    store: {
      findUniqueOrThrow: vi.fn().mockResolvedValue({ type: found.type ?? 'ECOMMERCE', paymentMethods: ['PIX'] }),
    },
    product: {
      findFirst: vi.fn().mockResolvedValue(
        found.product === undefined
          ? { id: PRODUCT, name: 'Whey', description: null, images: [{ url: 'https://cdn.example/whey.png' }], category: null }
          : found.product,
      ),
    },
    storePage: {
      // Two questions, one fake: which page a patch names (by id), and whether an address is taken (by slug).
      findFirst: vi.fn().mockImplementation(({ where }: { where: { id?: string; slug?: string } }) =>
        Promise.resolve(
          where.slug !== undefined
            ? found.taken
              ? { id: 'another-page' }
              : null
            : found.page
              ? { id: where.id, kind: found.page.kind }
              : null,
        ),
      ),
      findUniqueOrThrow: vi.fn().mockResolvedValue({ status: found.page?.status ?? 'DRAFT' }),
      create: vi.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) => pageRow(data)),
      update: vi.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) => pageRow(data)),
    },
    storeSection: { create: vi.fn().mockResolvedValue({}), findMany: vi.fn().mockResolvedValue([]) },
    storePageVersion: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'v1', number: 1, note: null, createdAt: AT, author: null }),
    },
    $queryRaw: vi.fn().mockResolvedValue([]),
    $transaction: vi.fn(),
  } as unknown as PrismaService;
  vi.mocked(prisma.$transaction).mockImplementation(((work: (tx: PrismaService) => unknown) => work(prisma)) as never);

  const stores = { ownedStoreId: vi.fn().mockResolvedValue(STORE) } as unknown as StoresService;

  return { service: new PagesService(prisma, stores, new PageRules(prisma)), prisma };
}

describe('PagesService.create', () => {
  it('writes a draft landing on the address its title folds to, and its bands on it, under the shop’s lock', async () => {
    const { service, prisma } = build();

    const page = await service.create('lessari', 'user-1', launch);

    expect(prisma.storePage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ storeId: STORE, kind: 'LANDING', slug: 'lancamento-whey', title: 'Lançamento Whey', inMenu: false, usesChrome: true, seoImageUrl: 'https://cdn.example/whey.png' }),
    });
    expect(page).toMatchObject({ kind: 'LANDING', status: 'DRAFT', slug: 'lancamento-whey' });

    const bands = vi.mocked(prisma.storeSection.create).mock.calls.map(([args]) => args.data);
    expect(bands.length).toBeGreaterThan(0);
    expect(bands.every((band) => band.pageId === LANDING && band.storeId === STORE)).toBe(true);
    expect(vi.mocked(prisma.$queryRaw).mock.invocationCallOrder[0]!).toBeLessThan(
      vi.mocked(prisma.storePage.create).mock.invocationCallOrder[0]!,
    );
  });

  it('takes the address it is sent over the title’s, folded the same way', async () => {
    const { service, prisma } = build();

    await service.create('lessari', 'user-1', { ...launch, slug: 'Whey Novo!' });

    expect(prisma.storePage.create).toHaveBeenCalledWith({ data: expect.objectContaining({ slug: 'whey-novo' }) });
  });

  it('refuses an address that is taken, whether the check or the index catches it, and writes no band', async () => {
    const checked = build({ taken: true });
    await expect(checked.service.create('lessari', 'user-1', launch)).rejects.toMatchObject({
      status: 409,
      response: { errorCode: 'PAGE_SLUG_TAKEN' },
    });
    expect(checked.prisma.storePage.create).not.toHaveBeenCalled();

    const raced = build();
    vi.mocked(raced.prisma.storePage.create).mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' }));
    await expect(raced.service.create('lessari', 'user-1', launch)).rejects.toMatchObject({
      status: 409,
      response: { errorCode: 'PAGE_SLUG_TAKEN' },
    });
    expect(raced.prisma.storeSection.create).not.toHaveBeenCalled();
  });

  it('refuses an address with nothing left in it once folded', async () => {
    const { service } = build();

    await expect(service.create('lessari', 'user-1', { ...launch, slug: '!!' })).rejects.toMatchObject({
      response: { errorCode: 'PAGE_SLUG_INVALID' },
    });
  });

  it('refuses a product template without a product, or with another shop’s', async () => {
    await expect(build().service.create('lessari', 'user-1', { ...launch, productId: undefined })).rejects.toMatchObject({
      response: { errorCode: 'PAGE_PRODUCT_REQUIRED' },
    });
    await expect(build({ product: null }).service.create('lessari', 'user-1', launch)).rejects.toMatchObject({
      status: 400,
      response: { errorCode: 'PAGE_PRODUCT_INVALID' },
    });
  });

  it('opens a blank page with no product, and a site with nothing but a blank page', async () => {
    const blank = build({ type: 'INSTITUTIONAL' });
    await expect(
      blank.service.create('lessari', 'user-1', { title: 'Sobre nós', template: 'em-branco' } as CreateLandingDto),
    ).resolves.toMatchObject({ slug: 'sobre-nos' });
    expect(blank.prisma.product.findFirst).not.toHaveBeenCalled();

    await expect(build({ type: 'INSTITUTIONAL' }).service.create('lessari', 'user-1', launch)).rejects.toMatchObject({
      response: { errorCode: 'PAGE_TEMPLATE_UNAVAILABLE' },
    });
  });
});

describe('PagesService.update', () => {
  it('refuses any patch of the home, which is the shop’s own address', async () => {
    const { service, prisma } = build({ page: { kind: 'HOME' } });

    await expect(service.update('lessari', 'user-1', HOME, { title: 'Início' } as UpdatePageDto)).rejects.toMatchObject({
      response: { errorCode: 'PAGE_HOME_FIXED' },
    });
    expect(prisma.storePage.update).not.toHaveBeenCalled();
  });

  it('answers a page that is not this shop’s as one that is not there', async () => {
    const { service } = build();

    await expect(service.update('lessari', 'user-1', LANDING, { title: 'Oi' } as UpdatePageDto)).rejects.toMatchObject({
      response: { errorCode: 'PAGE_NOT_FOUND' },
    });
  });

  it('stamps the moment a landing goes up, and leaves it alone on a page already up', async () => {
    const going = build({ page: { kind: 'LANDING', status: 'DRAFT' } });
    await going.service.update('lessari', 'user-1', LANDING, { status: 'PUBLISHED' } as UpdatePageDto);
    expect(vi.mocked(going.prisma.storePage.update).mock.calls[0]![0].data).toMatchObject({
      status: 'PUBLISHED',
      publishedAt: expect.any(Date),
    });
    // Up means the draft as it is now: it is frozen as the landing's next version on the way.
    expect(going.prisma.storePageVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ pageId: LANDING, number: 1, authorId: 'user-1' }) }),
    );

    const up = build({ page: { kind: 'LANDING', status: 'PUBLISHED' } });
    await up.service.update('lessari', 'user-1', LANDING, { status: 'PUBLISHED' } as UpdatePageDto);
    expect(vi.mocked(up.prisma.storePage.update).mock.calls[0]![0].data).not.toHaveProperty('publishedAt');
    expect(up.prisma.storePageVersion.create).not.toHaveBeenCalled();
  });

  it('clears an SEO field sent as null, and leaves one it is not sent alone', async () => {
    const { service, prisma } = build({ page: { kind: 'LANDING' } });

    await service.update('lessari', 'user-1', LANDING, { seo: { title: null } } as UpdatePageDto);

    const { data } = vi.mocked(prisma.storePage.update).mock.calls[0]![0];
    expect(data).toEqual({ seoTitle: null });
  });

  it('refuses a new address another page holds, and keeps a landing’s own', async () => {
    const { service, prisma } = build({ page: { kind: 'LANDING' }, taken: true });

    await expect(service.update('lessari', 'user-1', LANDING, { slug: 'ofertas' } as UpdatePageDto)).rejects.toMatchObject({
      response: { errorCode: 'PAGE_SLUG_TAKEN' },
    });
    // The page being renamed is left out of the question, so saving its own address is not a clash.
    expect(prisma.storePage.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { storeId: STORE, slug: 'ofertas', id: { not: LANDING } } }),
    );
  });
});

describe('PagesService.availability', () => {
  it('answers the address as it would be stored, and why it is not free', async () => {
    await expect(build().service.availability('lessari', 'user-1', 'Black Friday')).resolves.toEqual({
      slug: 'black-friday',
      available: true,
      reason: null,
    });
    await expect(build({ taken: true }).service.availability('lessari', 'user-1', 'black-friday')).resolves.toEqual({
      slug: 'black-friday',
      available: false,
      reason: 'TAKEN',
    });
    await expect(build().service.availability('lessari', 'user-1', '??')).resolves.toMatchObject({
      available: false,
      reason: 'INVALID',
    });
  });
});
