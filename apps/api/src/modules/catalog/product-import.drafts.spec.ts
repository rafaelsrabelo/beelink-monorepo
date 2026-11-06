// Types
import type { Extraction } from './product-import.drafts.js';

// App
import { PRODUCT_IMPORT_MAX } from './product-import.constants.js';
import { draftsFrom } from './product-import.drafts.js';

type Raw = Extraction['products'][number];

function raw(overrides: Partial<Raw> = {}): Raw {
  return { name: 'Dindin de morango', description: null, priceCents: 400, categoryName: 'Dindins', option: null, ...overrides };
}

describe('draftsFrom — what the reader answered, as the catalogue can hold it', () => {
  it('keeps a plain product as it was read', () => {
    expect(draftsFrom([raw()])).toEqual([
      { name: 'Dindin de morango', description: null, priceCents: 400, categoryName: 'Dindins', option: null },
    ]);
  });

  it('drops a line that is no product: too short, or nothing but decoration', () => {
    expect(draftsFrom([raw({ name: 'X' }), raw({ name: '★ ★ ★' }), raw({ name: '   ' })])).toEqual([]);
  });

  it('folds whitespace in names and keeps line breaks in a description', () => {
    const [draft] = draftsFrom([raw({ name: '  Dindin \n de  coco ', description: 'Ingredientes:\n\n\n\nleite,  coco' })]);

    expect(draft?.name).toBe('Dindin de coco');
    expect(draft?.description).toBe('Ingredientes:\n\nleite, coco');
  });

  it('refuses a price that is not one, and rounds a fractional cent', () => {
    const drafts = draftsFrom([raw({ priceCents: -100 }), raw({ priceCents: 499.6 }), raw({ priceCents: Number.NaN })]);

    expect(drafts.map((draft) => draft.priceCents)).toEqual([null, 500, null]);
  });

  it('drops an option with a single value, and a repeated value differing only in case', () => {
    const [single, repeated] = draftsFrom([
      raw({ option: { name: 'Sabor', values: [{ name: 'Morango', priceCents: null }] } }),
      raw({
        option: {
          name: 'Sabor',
          values: [
            { name: 'Morango', priceCents: null },
            { name: 'morango ', priceCents: null },
            { name: 'Coco', priceCents: null },
          ],
        },
      }),
    ]);

    expect(single?.option).toBeNull();
    expect(repeated?.option?.values.map((value) => value.name)).toEqual(['Morango', 'Coco']);
  });

  it('prices a product sold only by size at its cheapest size, and drops a value price equal to it', () => {
    const [draft] = draftsFrom([
      raw({
        priceCents: null,
        option: {
          name: 'Tamanho',
          values: [
            { name: '300 ml', priceCents: 1200 },
            { name: '500 ml', priceCents: 1800 },
          ],
        },
      }),
    ]);

    expect(draft?.priceCents).toBe(1200);
    expect(draft?.option?.values).toEqual([
      { name: '300 ml', priceCents: null },
      { name: '500 ml', priceCents: 1800 },
    ]);
  });

  it('stops at what one import takes', () => {
    const many = Array.from({ length: PRODUCT_IMPORT_MAX + 5 }, (_unused, index) => raw({ name: `Produto ${index}` }));

    expect(draftsFrom(many)).toHaveLength(PRODUCT_IMPORT_MAX);
  });
});
