// Libs
import { describe, expect, it } from 'vitest';

// Types
import type { ProductFieldRefs } from '../../generated/prisma/models/Product.js';

// App
import { appliedOf, likeLiteral, listingWhere, orderByOf, parseOptionFilters, type ListingFilters } from './catalog-filters.js';
import { ON_THE_SHELF_WHERE } from './catalog.visibility.js';

const PRICE = { name: 'priceCents' } as unknown as ProductFieldRefs['priceCents'];
const none: ListingFilters = { discount: false, options: [], sort: 'relevancia' };

describe('the storefront listing filters', () => {
  it('matches a search literally: % and _ are text, not wildcards', () => {
    expect(likeLiteral('100% algodao')).toBe('100\\% algodao');
    expect(likeLiteral('_a\\b')).toBe('\\_a\\\\b');
    expect(likeLiteral('croche')).toBe('croche');
  });

  it('groups option filters by name without regard to case, and drops malformed ones', () => {
    expect(parseOptionFilters(['Tamanho:P', 'tamanho: m ', 'Cor:Areia', ':x', 'semvalor', 'Tamanho:p', 'Proporção:1:2'])).toEqual([
      { name: 'Tamanho', values: ['P', 'm'] },
      { name: 'Cor', values: ['Areia'] },
      { name: 'Proporção', values: ['1:2'] },
    ]);
    expect(parseOptionFilters(undefined)).toEqual([]);
  });

  it('always keeps the shelf rule, as its own condition', () => {
    const where = listingWhere('s1', none, PRICE);

    expect(where).toEqual({ storeId: 's1', AND: [ON_THE_SHELF_WHERE] });
  });

  it('narrows by every filter, a parent category holding its children', () => {
    const where = listingWhere(
      's1',
      { category: 'blusas', search: 'Crochê', searchKey: 'croche', priceMinCents: 5000, priceMaxCents: 20000, discount: true, options: [], sort: 'relevancia' },
      PRICE,
    );

    expect(where.AND).toEqual([
      ON_THE_SHELF_WHERE,
      { category: { isActive: true, OR: [{ slug: 'blusas' }, { parent: { slug: 'blusas', isActive: true } }] } },
      { searchText: { contains: 'croche' } },
      { priceCents: { gte: 5000 } },
      { priceCents: { lte: 20000 } },
      { compareAtPriceCents: { gt: PRICE } },
    ]);
  });

  it('asks one combination to hold every option, and leaves a facet’s own filter out of its count', () => {
    const filters: ListingFilters = {
      ...none,
      options: [
        { name: 'Tamanho', values: ['P', 'M'] },
        { name: 'Cor', values: ['Areia'] },
      ],
    };

    const all = JSON.stringify(listingWhere('s1', filters, PRICE));
    const withoutSize = JSON.stringify(listingWhere('s1', filters, PRICE, 'option:tamanho'));

    expect(all).toContain('"Tamanho"');
    expect(all).toContain('"Areia"');
    expect(withoutSize).not.toContain('"Tamanho"');
    expect(withoutSize).toContain('"Areia"');
  });

  it('leaves the category out of the category facet, and the price out of the price facet', () => {
    const filters: ListingFilters = { ...none, category: 'blusas', priceMinCents: 100 };

    expect(JSON.stringify(listingWhere('s1', filters, PRICE, 'category'))).not.toContain('blusas');
    expect(JSON.stringify(listingWhere('s1', filters, PRICE, 'price'))).not.toContain('gte');
  });

  it('drops a search that has nothing left to match, from the shelf and from what is applied', () => {
    const filters: ListingFilters = { ...none, search: '´' };

    expect(JSON.stringify(listingWhere('s1', filters, PRICE))).not.toContain('searchText');
    expect(appliedOf(filters, [], { categories: [], discount: { count: 0, selected: false, ranges: [] }, price: null, options: [] })).toEqual([]);
  });

  it('narrows to a least cut through the column the database keeps, and orders by it', () => {
    const where = listingWhere('s1', { ...none, discount: true, discountMinPercent: 20 }, PRICE);
    expect(where.AND).toContainEqual({ discountPercent: { gte: 20 } });
    // "Any discount" stays the comparison of the two prices.
    expect(listingWhere('s1', { ...none, discount: true }, PRICE).AND).toContainEqual({ compareAtPriceCents: { gt: PRICE } });

    expect(orderByOf('maior-desconto')).toEqual([{ discountPercent: 'desc' }, { position: 'asc' }, { id: 'asc' }]);
    expect(appliedOf({ ...none, discount: true, discountMinPercent: 20 }, [], { categories: [], discount: { count: 0, selected: true, ranges: [] }, price: null, options: [] })).toEqual([
      { key: 'desconto', value: '20', label: '20' },
    ]);
  });

  it('orders by the shopkeeper by default, and always ends on the id', () => {
    expect(orderByOf('relevancia').at(-1)).toEqual({ id: 'asc' });
    expect(orderByOf('menor-preco')[0]).toEqual({ priceCents: 'asc' });
    expect(orderByOf('novidades')[0]).toEqual({ createdAt: 'desc' });
  });

  it('lists the filters in force, named as the shop names them', () => {
    const applied = appliedOf(
      { ...none, category: 'blusas', search: 'Crochê', searchKey: 'croche', priceMaxCents: 20000, discount: true, options: [{ name: 'tamanho', values: ['p'] }] },
      [{ id: 'c1', slug: 'blusas', name: 'Blusas', description: null, imageUrl: null, parentSlug: null, productCount: 1 }],
      {
        categories: [],
        discount: { count: 0, selected: true, ranges: [] },
        price: null,
        options: [{ name: 'Tamanho', values: [{ value: 'P', label: 'P', count: 1, available: true, selected: true, colorHex: null }] }],
      },
    );

    expect(applied).toEqual([
      { key: 'categoria', value: 'blusas', label: 'Blusas' },
      { key: 'busca', value: 'Crochê', label: 'Crochê' },
      { key: 'precoMax', value: '200', label: '200' },
      { key: 'desconto', value: '1', label: '1' },
      { key: 'opcao', value: 'Tamanho:P', label: 'Tamanho: P' },
    ]);
  });
});
