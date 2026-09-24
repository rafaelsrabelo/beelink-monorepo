// Types
import type { ProductFieldRefs } from '../../generated/prisma/models/Product.js';

// App
import { ON_THE_SHELF_WHERE } from './catalog.visibility.js';
import { selectionOf, shelfOf, showcaseQuery, type ShowcaseCardRow } from './showcase.query.js';

const STORE = '0199a0f1-0000-7000-8000-000000000001';
const CATEGORY = '0199d000-0000-7000-8000-000000000001';
const P1 = '0199e000-0000-7000-8000-000000000001';
const P2 = '0199e000-0000-7000-8000-000000000002';
const P3 = '0199e000-0000-7000-8000-000000000003';
const GONE = '0199e000-0000-7000-8000-0000000000ff';
const PRICE = { name: 'priceCents' } as unknown as ProductFieldRefs['priceCents'];

function showcase(over: Partial<Parameters<typeof showcaseQuery>[1]> = {}) {
  return { source: 'ALL' as const, sourceCategoryId: null, limit: null, items: [], ...over };
}

function row(id: string): ShowcaseCardRow {
  return {
    id,
    slug: id,
    name: id,
    priceCents: 100,
    compareAtPriceCents: null,
    images: [{ url: `/${id}.jpg` }],
    category: { slug: 'blusas' },
  };
}

describe('showcaseQuery — what each source asks the shelf for', () => {
  /** The rule of what a visitor may see holds for every source, inside an AND so no OR overwrites it. */
  it.each(['ALL', 'CATEGORY', 'SELECTION', 'NEWEST', 'ON_SALE'] as const)('keeps %s on the shelf', (source) => {
    const query = showcaseQuery(
      STORE,
      showcase({ source, sourceCategoryId: CATEGORY, items: [{ id: 'a', productId: P1 }] as never }),
      PRICE,
    );

    expect(query!.where).toMatchObject({ storeId: STORE, AND: [ON_THE_SHELF_WHERE] });
  });

  it('draws a category and its children, and nothing when the category is gone', () => {
    const query = showcaseQuery(STORE, showcase({ source: 'CATEGORY', sourceCategoryId: CATEGORY }), PRICE);

    expect(query!.where.category).toEqual({
      isActive: true,
      OR: [{ id: CATEGORY }, { parentId: CATEGORY, parent: { isActive: true } }],
    });
    expect(showcaseQuery(STORE, showcase({ source: 'CATEGORY' }), PRICE)).toBeNull();
  });

  it('asks for the picked ids, and nothing for an empty pick', () => {
    const query = showcaseQuery(
      STORE,
      showcase({ source: 'SELECTION', items: [{ id: 'a', productId: P2 }, { id: 'b', productId: P1 }] as never }),
      PRICE,
    );

    expect(query!.where.id).toEqual({ in: [P2, P1] });
    expect(showcaseQuery(STORE, showcase({ source: 'SELECTION' }), PRICE)).toBeNull();
  });

  it('puts the newest first, with a unique tie-breaker', () => {
    expect(showcaseQuery(STORE, showcase({ source: 'NEWEST' }), PRICE)!.orderBy).toEqual([
      { createdAt: 'desc' },
      { id: 'desc' },
    ]);
  });

  it('keeps the shopkeeper’s order stable with a unique tie-breaker', () => {
    expect(showcaseQuery(STORE, showcase(), PRICE)!.orderBy).toEqual([{ position: 'asc' }, { name: 'asc' }, { id: 'asc' }]);
  });

  it('draws what is on sale by comparing the two prices', () => {
    expect(showcaseQuery(STORE, showcase({ source: 'ON_SALE' }), PRICE)!.where.compareAtPriceCents).toEqual({ gt: PRICE });
  });

  it('takes the limit, twenty-four when none is set, and never more than forty-eight', () => {
    expect(showcaseQuery(STORE, showcase({ limit: 6 }), PRICE)!.take).toBe(6);
    expect(showcaseQuery(STORE, showcase(), PRICE)!.take).toBe(24);
    expect(showcaseQuery(STORE, showcase({ limit: 500 }), PRICE)!.take).toBe(48);
  });
});

describe('shelfOf — the cards, in the order the showcase wants', () => {
  it('keeps a pick in the shopkeeper’s order, dropping one that left the shelf, cut at the limit', () => {
    const picked = showcase({
      source: 'SELECTION',
      limit: 2,
      items: [
        { id: 'a', productId: P3 },
        { id: 'b', productId: GONE },
        { id: 'c', productId: P1 },
        { id: 'd', productId: P2 },
      ] as never,
    });

    expect(shelfOf(picked, [row(P1), row(P2), row(P3)]).map((card) => card.id)).toEqual([P3, P1]);
  });

  // A row a later deploy narrowed, or a newer one wrote mid-rollout: one empty showcase, not a 500.
  it.each([[[null]], [[{ id: 'a' }]], [[{ id: 'a', productId: 'nope' }]], ['not a list']])(
    'reads a pick that no longer parses as nothing picked: %j',
    (items) => {
      const broken = showcase({ source: 'SELECTION', items: items as never });

      expect(selectionOf(broken)).toEqual([]);
      expect(showcaseQuery(STORE, broken, PRICE)).toBeNull();
    },
  );

  it('serves a card with its first picture and its category', () => {
    expect(shelfOf(showcase(), [row('p1')])).toEqual([
      { id: 'p1', slug: 'p1', name: 'p1', priceCents: 100, compareAtPriceCents: null, imageUrl: '/p1.jpg', categorySlug: 'blusas' },
    ]);
  });
});
