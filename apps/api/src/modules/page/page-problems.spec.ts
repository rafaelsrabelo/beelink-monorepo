// Types
import type { ComponentShape, SectionShape } from './page-document.js';

// App
import { NO_LOOKUPS } from './page-public.mapper.js';
import { problemsOf } from './page-problems.js';

const PRODUCT = '0199e000-0000-7000-8000-000000000001';
const CATEGORY = '0199d000-0000-7000-8000-000000000001';

function block(id: string, kind: ComponentShape['kind'], items: unknown[] = [], isActive = true): ComponentShape {
  return {
    id, kind, title: null, subtitle: null, body: null, span: 'FULL', display: null, source: kind === 'PRODUCTS' ? 'ALL' : null,
    sourceCategoryId: null, limit: null, columns: null, align: null, visibleOn: 'ALL', items, isActive,
  };
}

function band(id: string, components: ComponentShape[], isActive = true): SectionShape {
  return { id, name: null, width: 'CONTAINED', background: null, isActive, components };
}

const slide = (id: string, over: object) => ({ id, imageUrl: 'https://cdn.example/a.png', target: 'NONE', ...over });

describe('problemsOf', () => {
  it('names a banner with no picture, a slide to a product or category gone, and an empty showcase', () => {
    const sections = [
      band('b1', [
        block('c1', 'BANNER'),
        block('c2', 'BANNER', [slide('s1', { target: 'PRODUCT', productId: PRODUCT }), slide('s2', { target: 'CATEGORY', categoryId: CATEGORY })]),
        block('c3', 'PRODUCTS'),
      ]),
    ];

    expect(problemsOf(sections, NO_LOOKUPS)).toEqual([
      { kind: 'BANNER_WITHOUT_IMAGE', sectionId: 'b1', componentId: 'c1', itemId: null },
      { kind: 'LINK_TO_MISSING_PRODUCT', sectionId: 'b1', componentId: 'c2', itemId: 's1' },
      { kind: 'LINK_TO_MISSING_CATEGORY', sectionId: 'b1', componentId: 'c2', itemId: 's2' },
      { kind: 'SHOWCASE_EMPTY', sectionId: 'b1', componentId: 'c3', itemId: null },
    ]);
  });

  it('finds nothing where the links resolve and the shelf has products', () => {
    const sections = [band('b1', [block('c2', 'BANNER', [slide('s1', { target: 'PRODUCT', productId: PRODUCT })]), block('c3', 'PRODUCTS')])];
    const slugs = { categories: new Map(), products: new Map([[PRODUCT, 'whey']]) };
    const shelves = new Map([['c3', { products: [{ id: PRODUCT }], category: null }]]) as never;

    expect(problemsOf(sections, { slugs, shelves })).toEqual([]);
  });

  it('names a call to action whose button leads to a product gone', () => {
    const button = { id: 'btn', label: 'Comprar', target: 'PRODUCT', productId: PRODUCT };
    const sections = [band('b1', [block('c1', 'CALL_TO_ACTION', [button])])];

    expect(problemsOf(sections, NO_LOOKUPS)).toEqual([{ kind: 'LINK_TO_MISSING_PRODUCT', sectionId: 'b1', componentId: 'c1', itemId: 'btn' }]);
  });

  it('names an image with text whose button leads to a product gone, by its picture', () => {
    const media = { id: 'm', imageUrl: 'https://cdn.example/a.png', button: { label: 'Ver', target: 'PRODUCT', productId: PRODUCT } };
    const sections = [band('b1', [block('c1', 'IMAGE_TEXT', [media])])];

    expect(problemsOf(sections, NO_LOOKUPS)).toEqual([{ kind: 'LINK_TO_MISSING_PRODUCT', sectionId: 'b1', componentId: 'c1', itemId: 'm' }]);
  });

  it('looks only at what shows: a hidden band or block is served to nobody', () => {
    const sections = [band('b1', [block('c1', 'BANNER')], false), band('b2', [block('c2', 'PRODUCTS', [], false)])];

    expect(problemsOf(sections, NO_LOOKUPS)).toEqual([]);
  });
});
