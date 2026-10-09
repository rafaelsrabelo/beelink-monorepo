// Types
import type { StoreRow } from './store.mapper.js';

// App
import { storeInclude, toPublicStore, toStore } from './store.mapper.js';

const row = {
  id: '0199a0f1-0000-7000-8000-000000000001',
  ownerId: '0199a0f1-0000-7000-8000-00000000000a',
  slug: 'padaria-do-bairro',
  name: 'Padaria do Bairro',
  type: 'ECOMMERCE',
  description: null,
  logoUrl: null,
  bannerImageUrl: null,
  categoryId: '0199a0f1-0000-7000-8000-0000000000c1',
  pageVersions: [],
  pages: [],
  integrations: [],
  category: {
    id: '0199a0f1-0000-7000-8000-0000000000c1',
    slug: 'alimentacao',
    name: 'Alimentação',
    description: null,
    icon: 'utensils',
    color: '#3B7AF7',
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-01T00:00:00.000Z'),
  },
  layoutType: 'BANNER',
  routeVocabulary: 'PT_BR',
  colorBackground: '#F0F9FF',
  colorPrimary: '#3B7AF7',
  colorFooter: '#3B7AF7',
  colorHeader: '#3B7AF7',
  whatsappPhone: '5511999998888',
  instagram: 'minhaloja',
  tiktok: null,
  spotify: null,
  youtube: null,
  addressStreet: 'Avenida Paulista',
  addressNumber: '1000',
  addressComplement: null,
  addressNeighborhood: 'Bela Vista',
  addressCity: 'São Paulo',
  addressState: 'SP',
  addressZipCode: '01310930',
  latitude: { toNumber: () => -23.5613 },
  longitude: { toNumber: () => -46.6565 },
  layoutSettings: {},
  paymentMethods: ['MONEY', 'PIX'],
  createdAt: new Date('2026-09-10T12:00:00.000Z'),
  updatedAt: new Date('2026-09-11T12:00:00.000Z'),
} as unknown as StoreRow;

describe('toStore', () => {
  it('composes the four colour columns back into the object the wire carries', () => {
    expect(toStore(row).colors).toEqual({
      background: '#F0F9FF',
      primary: '#3B7AF7',
      footer: '#3B7AF7',
      header: '#3B7AF7',
    });
  });

  it('sends coordinates as numbers, not as the Decimal the database keeps', () => {
    const store = toStore(row);

    expect(store.latitude).toBe(-23.5613);
    expect(typeof store.longitude).toBe('number');
  });

  it('leaves the coordinates null when the address was never resolved', () => {
    const store = toStore({ ...row, latitude: null, longitude: null } as unknown as StoreRow);

    expect(store).toMatchObject({ latitude: null, longitude: null });
  });

  it('sends dates as ISO-8601 strings, as the contract says', () => {
    expect(toStore(row).createdAt).toBe('2026-09-10T12:00:00.000Z');
  });

  it('carries the words to the panel as well, which renders the same links', () => {
    expect(toStore(row).routeWords).toMatchObject({ products: 'produtos' });
  });

  it('carries the taxonomy row without its timestamps', () => {
    expect(toStore(row).category).toEqual({
      id: '0199a0f1-0000-7000-8000-0000000000c1',
      slug: 'alimentacao',
      name: 'Alimentação',
      description: null,
      icon: 'utensils',
      color: '#3B7AF7',
    });
  });
});

describe('toPublicStore', () => {
  // The words and not the enum: the web builds every storefront link from these, so a shop whose
  // vocabulary changes moves every link at once and no component holds "produtos" of its own.
  it('sends the words the shop addresses itself with, for the vocabulary it is on', () => {
    expect(toPublicStore(row).routeWords).toEqual({
      products: 'produtos',
      categories: 'categorias',
      search: 'busca',
      cart: 'carrinho',
      signIn: 'entrar',
      verifyEmail: 'confirmar-email',
      resetPassword: 'nova-senha',
      account: 'conta',
      accountTabs: { orders: 'pedidos', favorites: 'favoritos', reviews: 'avaliacoes', cashback: 'cashback', profile: 'perfil', messages: 'conversas' },
    });
  });

  it('follows the vocabulary rather than a default, so EN answers the English words', () => {
    const store = toPublicStore({ ...row, routeVocabulary: 'EN' } as unknown as StoreRow);

    expect(store.routeWords).toEqual({
      products: 'products',
      categories: 'categories',
      search: 'search',
      cart: 'cart',
      signIn: 'login',
      verifyEmail: 'verify-email',
      resetPassword: 'reset-password',
      account: 'account',
      accountTabs: { orders: 'orders', favorites: 'favorites', reviews: 'reviews', cashback: 'cashback', profile: 'profile', messages: 'messages' },
    });
  });

  it("carries the shop's Meta Pixel ID, and null while the shop saved none (BEELINK-269)", () => {
    expect(toPublicStore(row).metaPixelId).toBeNull();
    expect(toPublicStore({ ...row, integrations: [{ provider: 'META_PIXEL', pixelId: '1234567890123456', measurementId: null }] }).metaPixelId).toBe('1234567890123456');
    expect(toPublicStore({ ...row, integrations: [{ provider: 'META_PIXEL', pixelId: null, measurementId: null }] }).metaPixelId).toBeNull();
  });

  it("carries the shop's Google Analytics measurement ID, and null while the shop saved none (BEELINK-301)", () => {
    expect(toPublicStore(row).googleAnalyticsId).toBeNull();
    expect(toPublicStore({ ...row, integrations: [{ provider: 'GOOGLE_ANALYTICS', pixelId: null, measurementId: 'G-AB12CD34EF' }] })).toMatchObject({ googleAnalyticsId: 'G-AB12CD34EF', metaPixelId: null });
    expect(toPublicStore({ ...row, integrations: [{ provider: 'GOOGLE_ANALYTICS', pixelId: null, measurementId: null }] }).googleAnalyticsId).toBeNull();
  });

  /** The rows come in no promised order, and a column filled on the wrong party's row is not that party's ID. */
  it("reads each ID from its own party's row, whichever comes first", () => {
    const pixel = { provider: 'META_PIXEL', pixelId: '1234567890123456', measurementId: null } as const;
    const analytics = { provider: 'GOOGLE_ANALYTICS', pixelId: null, measurementId: 'G-AB12CD34EF' } as const;
    const both = { metaPixelId: '1234567890123456', googleAnalyticsId: 'G-AB12CD34EF' };

    expect(toPublicStore({ ...row, integrations: [pixel, analytics] })).toMatchObject(both);
    expect(toPublicStore({ ...row, integrations: [analytics, pixel] })).toMatchObject(both);
    expect(toPublicStore({ ...row, integrations: [{ provider: 'GOOGLE_ANALYTICS', pixelId: '9999999999', measurementId: null }, { provider: 'META_PIXEL', pixelId: null, measurementId: 'G-ZZ99ZZ99ZZ' }] })).toMatchObject({ metaPixelId: null, googleAnalyticsId: null });
  });

  it("carries the shop's own domain and where it stands, pending as well as active, and null while the shop saved none (BEELINK-281)", () => {
    expect(toPublicStore(row).customDomain).toBeNull();
    expect(toPublicStore({ ...row, customDomain: null, customDomainStatus: null }).customDomain).toBeNull();
    expect(toPublicStore({ ...row, customDomain: 'minhaloja.com.br', customDomainStatus: 'PENDING' }).customDomain).toEqual({ host: 'minhaloja.com.br', status: 'PENDING' });
    // The host and the status and nothing else: when it was checked, and what was found, are the owner's to read.
    expect(toPublicStore({ ...row, customDomain: 'minhaloja.com.br', customDomainStatus: 'ACTIVE', customDomainCheckedAt: new Date(), customDomainProblem: 'DNS_NOT_FOUND' }).customDomain).toEqual({ host: 'minhaloja.com.br', status: 'ACTIVE' });
    expect(toStore({ ...row, customDomain: 'minhaloja.com.br', customDomainStatus: 'ACTIVE' }).customDomain).toEqual({ host: 'minhaloja.com.br', status: 'ACTIVE' });
  });

  /** What Melhor Envio or Asaas gave the shop is sealed: the public read asks for the two public parties' rows, and for their IDs alone. */
  it("reads the two public IDs and nothing else of an integration's row", () => {
    expect(storeInclude.integrations).toEqual({ where: { provider: { in: ['META_PIXEL', 'GOOGLE_ANALYTICS'] } }, select: { provider: true, pixelId: true, measurementId: true } });
  });

  it('keeps the owner, the address, the coordinates and the timestamps off the storefront', () => {
    const json = JSON.stringify(toPublicStore(row));

    expect(json).not.toContain('ownerId');
    expect(json).not.toContain('Avenida Paulista');
    expect(json).not.toContain('latitude');
    expect(json).not.toContain('createdAt');
  });

  // Per key, not per object: the panel echoes this value back into the PUT that replaces the column,
  // so discarding the whole blob over one bad key would delete the rest on the next save.
  it('narrows a layout blob it cannot trust to the shape the contract declares', () => {
    const settings = toPublicStore({
      ...row,
      layoutSettings: { showBanner: 'yes', productsPerRow: 3 },
    } as unknown as StoreRow).layoutSettings;

    expect(settings).toEqual({ productsPerRow: 3 });
  });

  // The query already chose them — published landings marked for the menu — so a null slug here is the home's.
  it('links the landings the menu shows, and never the home', () => {
    const pages = toPublicStore({
      ...row,
      pages: [
        { slug: null, title: 'Página inicial' },
        { slug: 'lancamento', title: 'Lançamento' },
      ],
    } as unknown as StoreRow).pages;

    expect(pages).toEqual([{ slug: 'lancamento', title: 'Lançamento' }]);
  });

  // What the panel edits is the draft; a visitor is served the home as it was last published.
  it('serves the home from its last published version, its hidden bands left out', () => {
    const band = (id: string, isActive: boolean) => ({ id, name: null, width: 'CONTAINED', background: null, isActive, components: [] });
    const sections = toPublicStore({
      ...row,
      pageVersions: [{ document: { format: 1, sections: [band('0199b000-0000-7000-8000-000000000001', true), band('0199b000-0000-7000-8000-000000000002', false)] } }],
    } as unknown as StoreRow).sections;

    expect(sections.map((section) => section.id)).toEqual(['0199b000-0000-7000-8000-000000000001']);
    expect(toPublicStore(row).sections).toEqual([]);
  });

  it('keeps a layout blob it can trust', () => {
    const settings = toPublicStore({
      ...row,
      layoutSettings: { showBanner: true, productsPerRow: 3, bannerType: 'carousel' },
    } as unknown as StoreRow).layoutSettings;

    expect(settings).toEqual({ showBanner: true, productsPerRow: 3, bannerType: 'carousel' });
  });
});
