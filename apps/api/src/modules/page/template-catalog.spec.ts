// Types
import type { PageKind, StoreType } from '@harness-monorepo/contracts';
import type { TemplateSubject } from './template-catalog.js';

// App
import { componentItemsFor } from './component-items.schema.js';
import { DISPLAYS_OF_KIND } from './page.constants.js';
import { promisesOf } from './page-seed.js';
import { PAGE_TEMPLATES, shopSubject, TEMPLATE_IDS, templateOf, templatesFor } from './template-catalog.js';

const PRODUCT = { id: '0199e000-0000-7000-8000-000000000001', name: 'Whey Baunilha 900 g', description: 'Proteína isolada.', imageUrl: 'https://cdn.example/whey.png' };
const CATEGORY = { id: '0199d000-0000-7000-8000-000000000001', name: 'Proteínas', description: 'Para depois do treino', imageUrl: null };

function subject(over: Partial<TemplateSubject> = {}): TemplateSubject {
  return { title: 'Minha página', product: PRODUCT, category: CATEGORY, promises: promisesOf(['PIX', 'MONEY']), saleEndsAt: '2026-09-30T02:00:00.000Z', ...over };
}

/** Every shop a model may meet, down to the one with nothing: no product, no picture, no category, no promise. */
const SUBJECTS: [string, TemplateSubject][] = [
  ['everything', subject()],
  ['no picture', subject({ product: { ...PRODUCT, imageUrl: null } })],
  ['no category', subject({ category: null })],
  ['nothing to promise', subject({ promises: [] })],
  ['no product at all', subject({ product: null, category: null, promises: [] })],
];

const PAGE_KINDS: PageKind[] = ['HOME', 'LANDING'];
const STORE_TYPES: StoreType[] = ['ECOMMERCE', 'INSTITUTIONAL'];

/** The slugs `prisma/seed/store-categories.sql` writes: a suggestion for any other is one no shop can match. */
const CATEGORY_SLUGS = [
  'alimentacao', 'padaria', 'doces-e-bolos', 'bebidas', 'mercado', 'moda', 'beleza', 'casa-e-decoracao',
  'eletronicos', 'petshop', 'suplementos', 'saude', 'servicos', 'outros',
];

describe('the catalogue', () => {
  it('names each model once', () => {
    expect(new Set(TEMPLATE_IDS).size).toBe(TEMPLATE_IDS.length);
    expect(PAGE_TEMPLATES.map((template) => template.id)).toEqual(TEMPLATE_IDS);
    expect(TEMPLATE_IDS).toEqual(['servicos-b2b', 'lancamento', 'promocao-relampago', 'colecao', 'em-branco']);
  });

  it.each(PAGE_TEMPLATES)('$id says where it applies, and suggests itself only to categories that exist', (template) => {
    expect(template.pageKinds.length).toBeGreaterThan(0);
    expect(template.storeTypes.length).toBeGreaterThan(0);
    expect(new Set(template.recommendedFor).size).toBe(template.recommendedFor.length);
    for (const slug of template.recommendedFor) expect(CATEGORY_SLUGS).toContain(slug);
  });

  it('keeps each model where it was before the catalogue said so', () => {
    expect(templateOf('servicos-b2b')).toMatchObject({ pageKinds: ['HOME'], storeTypes: ['INSTITUTIONAL'], needs: [] });
    for (const id of ['lancamento', 'promocao-relampago', 'colecao'] as const) {
      expect(templateOf(id)).toMatchObject({ pageKinds: ['LANDING'], storeTypes: ['ECOMMERCE'], needs: ['PRODUCT'] });
    }
    expect(templateOf('em-branco')).toMatchObject({ pageKinds: ['LANDING'], storeTypes: ['ECOMMERCE', 'INSTITUTIONAL'], needs: [] });
  });

  // What the API would refuse from the panel, it must not write itself: every block a model arranges
  // passes the same items schema and layout table a write from the editor goes through.
  it.each(PAGE_TEMPLATES.flatMap((template) => SUBJECTS.map(([name, of]) => [template.id, name, template, of] as const)))(
    '%s with %s arranges only what the editor would accept',
    (_id, _name, template, of) => {
      const bands = template.bands(of);

      expect(bands.length).toBeGreaterThan(0);
      bands.forEach((band, index) => {
        expect(band.section.position).toBe(index);
        expect(band.components.length).toBeGreaterThan(0);
        band.components.forEach((component, at) => {
          expect(component.position).toBe(at);
          expect(componentItemsFor(component.kind).safeParse(component.items).success).toBe(true);
          if (component.display) expect(DISPLAYS_OF_KIND[component.kind]).toContain(component.display);
        });
      });
    },
  );

  it.each(PAGE_TEMPLATES.filter((template) => template.pageKinds.includes('LANDING')))(
    '$id, which a landing may be arranged with, never arranges the strip: it is the home’s',
    (template) => {
      for (const [, of] of SUBJECTS) {
        expect(template.bands(of).flatMap((band) => band.components.map((component) => component.kind))).not.toContain('ANNOUNCEMENT');
      }
    },
  );

  it('points a product model at the product or the category it was given, and at no other id', () => {
    for (const template of PAGE_TEMPLATES.filter((entry) => entry.needs.includes('PRODUCT'))) {
      const written = JSON.stringify(template.bands(subject()));
      const ids = written.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g) ?? [];

      expect(ids.length).toBeGreaterThan(0);
      for (const id of ids) expect([PRODUCT.id, CATEGORY.id]).toContain(id);
    }
  });
});

describe('shopSubject', () => {
  it('is a page with no product picked: the shop’s promises, and a sale ending three days on', () => {
    expect(shopSubject('Asfalto Norte', ['PIX'], new Date('2026-10-06T12:00:00.000Z'))).toEqual({
      title: 'Asfalto Norte',
      product: null,
      category: null,
      promises: promisesOf(['PIX']),
      saleEndsAt: '2026-10-09T12:00:00.000Z',
    });
  });
});

describe('templatesFor', () => {
  it.each(PAGE_KINDS.flatMap((page) => STORE_TYPES.map((store) => [page, store] as const)))(
    'offers a %s in a %s store exactly the models that say they apply there',
    (page, store) => {
      const offered = templatesFor(page, store, null);

      expect(offered.map((template) => template.id).sort()).toEqual(
        PAGE_TEMPLATES.filter((template) => template.pageKinds.includes(page) && template.storeTypes.includes(store)).map((template) => template.id).sort(),
      );
      for (const template of offered) {
        expect(template.pageKinds).toContain(page);
        expect(template.storeTypes).toContain(store);
      }
    },
  );

  it('offers a site its own model on the home and a blank page on a landing', () => {
    expect(templatesFor('HOME', 'INSTITUTIONAL', null).map((template) => template.id)).toEqual(['servicos-b2b']);
    expect(templatesFor('LANDING', 'INSTITUTIONAL', null).map((template) => template.id)).toEqual(['em-branco']);
  });

  it('offers a shop’s landing the four it always could, and its home none yet', () => {
    expect(templatesFor('LANDING', 'ECOMMERCE', null).map((template) => template.id)).toEqual(['lancamento', 'promocao-relampago', 'colecao', 'em-branco']);
    expect(templatesFor('HOME', 'ECOMMERCE', null)).toEqual([]);
  });

  it('puts the ones suggested for the shop’s category first, and hides none', () => {
    const offered = templatesFor('LANDING', 'ECOMMERCE', 'moda');

    expect(offered.map((template) => [template.id, template.recommended])).toEqual([
      ['colecao', true],
      ['lancamento', false],
      ['promocao-relampago', false],
      ['em-branco', false],
    ]);
  });

  it('suggests nothing to a shop with no category, or with one no model names, in the catalogue’s order', () => {
    for (const slug of [null, 'outros']) {
      const offered = templatesFor('LANDING', 'ECOMMERCE', slug);

      expect(offered.map((template) => template.id)).toEqual(['lancamento', 'promocao-relampago', 'colecao', 'em-branco']);
      expect(offered.every((template) => !template.recommended)).toBe(true);
    }
  });

  it('says what each asks the shopkeeper for', () => {
    const needs = Object.fromEntries(templatesFor('LANDING', 'ECOMMERCE', null).map((template) => [template.id, template.needs]));

    expect(needs).toEqual({ lancamento: ['PRODUCT'], 'promocao-relampago': ['PRODUCT'], colecao: ['PRODUCT'], 'em-branco': [] });
  });
});
