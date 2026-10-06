// Types
import type { PrismaService } from '../../shared/prisma/prisma.service.js';
import type { StoresService } from '../stores/stores.service.js';

// App
import { PageTemplatesService } from './page-templates.service.js';

const STORE = '0199a0f1-0000-7000-8000-000000000001';
const HOME = '0199f000-0000-7000-8000-000000000001';
const AT = new Date('2026-10-06T00:00:00.000Z');

function component(id: string, kind: string, title: string) {
  return {
    id,
    sectionId: 'b1',
    storeId: STORE,
    kind,
    title,
    subtitle: null,
    body: null,
    span: 'FULL',
    display: kind === 'ANNOUNCEMENT' ? 'STATIC' : null,
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

function band(id: string, position: number, components: ReturnType<typeof component>[]) {
  return { id, storeId: STORE, pageId: HOME, name: null, width: 'FULL', background: null, position, isActive: true, createdAt: AT, updatedAt: AT, components };
}

/**
 * A client that can only read, and only what a preview of a model with no product reads: a call to
 * anything else — a write above all — is a TypeError, and the test fails.
 */
function build(found: { type?: 'ECOMMERCE' | 'INSTITUTIONAL'; kind?: 'HOME' | 'LANDING'; draft?: ReturnType<typeof band>[] } = {}) {
  const kind = found.kind ?? 'HOME';
  const row = {
    id: HOME,
    storeId: STORE,
    kind,
    slug: kind === 'HOME' ? null : 'campanha',
    title: 'Campanha',
    usesChrome: true,
    inMenu: false,
    seoTitle: null,
    seoDescription: null,
    seoImageUrl: null,
    status: 'PUBLISHED',
    publishedAt: AT,
    draftRevision: 4,
    createdAt: AT,
    updatedAt: AT,
  };
  const prisma = {
    store: { findUniqueOrThrow: vi.fn().mockResolvedValue({ type: found.type ?? 'INSTITUTIONAL', paymentMethods: [] }) },
    storePage: {
      findFirst: vi.fn().mockResolvedValue({ id: HOME, kind }),
      findUniqueOrThrow: vi
        .fn()
        .mockImplementation(({ include }: { include?: object }) =>
          Promise.resolve(include ? { ...row, store: { id: STORE, slug: 'asfalto-norte', routeVocabulary: 'PRODUCTS' } } : { title: row.title }),
        ),
    },
    storeSection: { findMany: vi.fn().mockResolvedValue(found.draft ?? []) },
  };
  const stores = { ownedStoreId: vi.fn().mockResolvedValue(STORE) };

  return { prisma, stores, service: new PageTemplatesService(prisma as unknown as PrismaService, stores as unknown as StoresService) };
}

const kindsOf = (sections: readonly { components: readonly { kind: string }[] }[]) => sections.map((section) => section.components.map((component) => component.kind));

describe('a model previewed on a page', () => {
  it('answers the page as it is and the bands the model would leave, reading and nothing more', async () => {
    const { service, stores } = build();

    const preview = await service.preview('asfalto-norte', 'user-1', 'servicos-b2b');

    expect(stores.ownedStoreId).toHaveBeenCalledWith('asfalto-norte', 'user-1');
    expect(preview.page).toMatchObject({ id: HOME, kind: 'HOME', title: 'Campanha', status: 'PUBLISHED' });
    expect(preview.sections.map((section) => section.name)).toEqual(['Início', 'Serviços', 'Sobre', 'Como funciona', 'Dúvidas', 'Contato']);
    expect(kindsOf(preview.sections)).toEqual([['HEADING'], ['BENEFITS'], ['HEADING', 'TEXT'], ['HEADING', 'TEXT'], ['FAQ'], ['CONTACT']]);
  });

  it('draws what the page keeps: the home’s strip first, and the id of the form the draft holds', async () => {
    const draft = [band('b1', 0, [component('old-form', 'CONTACT', 'Fale')]), band('strip-band', 1, [component('strip', 'ANNOUNCEMENT', 'Frete grátis')])];
    const { service } = build({ draft });

    const preview = await service.preview('asfalto-norte', 'user-1', 'servicos-b2b', { pageId: HOME });

    expect(preview.sections[0]).toMatchObject({ id: 'strip-band', components: [{ id: 'strip', kind: 'ANNOUNCEMENT', title: 'Frete grátis' }] });
    expect(preview.sections.at(-1)!.components[0]).toMatchObject({ id: 'old-form', kind: 'CONTACT', title: 'Fale com a gente' });
  });

  it('fills the model from the page it is previewed on', async () => {
    const { service } = build({ type: 'ECOMMERCE', kind: 'LANDING' });

    // "em-branco" is one heading; the page's own title is what it says.
    const preview = await service.preview('lessari', 'user-1', 'em-branco', { pageId: HOME });

    expect(preview.sections).toHaveLength(1);
    expect(preview.sections[0]!.components[0]).toMatchObject({ kind: 'HEADING', title: 'Campanha' });
  });

  it('refuses a model that is none, one for another page or store, and one missing its product — as applying does', async () => {
    const refusal = (errorCode: string) => ({ response: expect.objectContaining({ errorCode }) });

    await expect(build().service.preview('asfalto-norte', 'user-1', 'nao-existe')).rejects.toMatchObject(refusal('PAGE_TEMPLATE_UNAVAILABLE'));
    await expect(build().service.preview('asfalto-norte', 'user-1', 'em-branco')).rejects.toMatchObject(refusal('PAGE_TEMPLATE_UNAVAILABLE'));
    await expect(build({ type: 'ECOMMERCE' }).service.preview('lessari', 'user-1', 'servicos-b2b')).rejects.toMatchObject(refusal('PAGE_TEMPLATE_UNAVAILABLE'));
    await expect(build({ type: 'ECOMMERCE', kind: 'LANDING' }).service.preview('lessari', 'user-1', 'lancamento')).rejects.toMatchObject(
      refusal('PAGE_PRODUCT_REQUIRED'),
    );
  });
});
