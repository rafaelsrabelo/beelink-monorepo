// Types
import type { StoreRow } from './store.mapper.js';

// App
import { toPublicStore, toStore } from './store.mapper.js';

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
  showProductsByCategory: true,
  routeVocabulary: 'PT_BR',
  colorBackground: '#F0F9FF',
  colorPrimary: '#3B7AF7',
  colorText: '#1A202C',
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
      text: '#1A202C',
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
    });
  });

  it('follows the vocabulary rather than a default, so EN answers the English words', () => {
    const store = toPublicStore({ ...row, routeVocabulary: 'EN' } as unknown as StoreRow);

    expect(store.routeWords).toEqual({
      products: 'products',
      categories: 'categories',
      search: 'search',
      cart: 'cart',
    });
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

  it('keeps a layout blob it can trust', () => {
    const settings = toPublicStore({
      ...row,
      layoutSettings: { showBanner: true, productsPerRow: 3, bannerType: 'carousel' },
    } as unknown as StoreRow).layoutSettings;

    expect(settings).toEqual({ showBanner: true, productsPerRow: 3, bannerType: 'carousel' });
  });
});
