// Types
import type { ComponentShape, SectionShape } from './page-document.js';
import type { SeededBand } from './page-seed.js';

// App
import { componentItemsFor } from './component-items.schema.js';
import { EMPTY_SHOP } from './home-templates.js';
import { arrangedDocument } from './page-template-arrange.js';
import { DISPLAYS_OF_KIND } from './page.constants.js';
import { promisesOf } from './page-seed.js';
import { PAGE_TEMPLATES, templateOf } from './template-catalog.js';

function block(id: string, kind: ComponentShape['kind'], over: Partial<ComponentShape> = {}): ComponentShape {
  return {
    id,
    kind,
    title: null,
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
    isActive: true,
    ...over,
  };
}

function bandOf(id: string, components: ComponentShape[], over: Partial<SectionShape> = {}): SectionShape {
  return { id, name: null, width: 'CONTAINED', background: null, isActive: true, components, ...over };
}

function seeded(position: number, kinds: ComponentShape['kind'][]): SeededBand {
  return {
    section: { width: 'CONTAINED', position, isActive: true },
    components: kinds.map((kind, at) => ({ kind, title: `${kind} ${position}`, items: [], position: at, isActive: true })),
  };
}

/** Ids a test can read: n1, n2, n3… in the order they are asked for. */
function counter() {
  let next = 0;
  return () => `n${(next += 1)}`;
}

const SITE_HOME = { pageKind: 'HOME', storeType: 'INSTITUTIONAL' } as const;
const SHOP_HOME = { pageKind: 'HOME', storeType: 'ECOMMERCE' } as const;
const SHOP_LANDING = { pageKind: 'LANDING', storeType: 'ECOMMERCE' } as const;

const kindsOf = (sections: readonly SectionShape[]) => sections.map((section) => section.components.map((component) => component.kind));

describe('a model arranged as the draft it would leave', () => {
  it('replaces every band of the draft with the model’s, in the model’s order, under ids of their own', () => {
    const draft = [bandOf('old-1', [block('old-c1', 'HEADING')]), bandOf('old-2', [block('old-c2', 'TEXT')])];

    const document = arrangedDocument([seeded(1, ['FAQ']), seeded(0, ['HEADING', 'TEXT'])], { ...SHOP_LANDING, draft }, counter());

    expect(kindsOf(document.sections)).toEqual([['HEADING', 'TEXT'], ['FAQ']]);
    expect(document.sections.map((section) => section.id)).toEqual(['n1', 'n4']);
    expect(document.sections.flatMap((section) => section.components.map((component) => component.id))).toEqual(['n2', 'n3', 'n5']);
  });

  it('writes a block’s columns as the database would default them', () => {
    const [section] = arrangedDocument([seeded(0, ['HEADING'])], { ...SHOP_LANDING, draft: [] }, counter()).sections;

    expect(section).toMatchObject({ name: null, background: null, width: 'CONTAINED', isActive: true });
    expect(section!.components[0]).toEqual(block('n2', 'HEADING', { title: 'HEADING 0' }));
  });

  describe('the strip above the header', () => {
    const strip = block('strip', 'ANNOUNCEMENT', { title: 'Frete grátis', display: 'MARQUEE', isActive: false });

    it('keeps the home’s strip as it is, in its own band, first', () => {
      const draft = [bandOf('b1', [block('c1', 'HEADING')]), bandOf('strip-band', [strip], { width: 'FULL', background: '#112233' })];

      const document = arrangedDocument([seeded(0, ['HEADING'])], { ...SITE_HOME, draft }, counter());

      expect(document.sections[0]).toEqual(bandOf('strip-band', [strip], { width: 'FULL', background: '#112233' }));
      expect(kindsOf(document.sections)).toEqual([['ANNOUNCEMENT'], ['HEADING']]);
    });

    it('drops the model’s own strip when the home has one, and whatever sat beside the home’s', () => {
      const draft = [bandOf('strip-band', [strip, block('stray', 'TEXT')]), bandOf('second', [block('strip-2', 'ANNOUNCEMENT')])];

      const document = arrangedDocument([seeded(0, ['ANNOUNCEMENT']), seeded(1, ['HEADING'])], { ...SITE_HOME, draft }, counter());

      const strips = document.sections.flatMap((section) => section.components).filter((component) => component.kind === 'ANNOUNCEMENT');
      expect(strips.map((component) => component.id)).toEqual(['strip']);
      expect(kindsOf(document.sections)).toEqual([['ANNOUNCEMENT'], ['HEADING']]);
    });

    it('lets a model bring the strip to a home that has none, and only one', () => {
      const document = arrangedDocument([seeded(0, ['ANNOUNCEMENT']), seeded(1, ['ANNOUNCEMENT', 'HEADING'])], { ...SITE_HOME, draft: [] }, counter());

      expect(kindsOf(document.sections)).toEqual([['ANNOUNCEMENT'], ['HEADING']]);
    });

    it('holds none on a landing, whatever the model brings', () => {
      const document = arrangedDocument([seeded(0, ['ANNOUNCEMENT']), seeded(1, ['HEADING'])], { ...SHOP_LANDING, draft: [] }, counter());

      expect(kindsOf(document.sections)).toEqual([['HEADING']]);
    });
  });

  describe('the showcase a shop’s home cannot be without', () => {
    it('adds the opening shelves last when the model brought none', () => {
      const document = arrangedDocument([seeded(0, ['HEADING'])], { ...SHOP_HOME, draft: [bandOf('b1', [block('c1', 'PRODUCTS')])] }, counter());

      expect(kindsOf(document.sections)).toEqual([['HEADING'], ['PRODUCTS']]);
      expect(document.sections[1]!.components[0]).toMatchObject({ display: 'RAIL', source: 'ALL', isActive: true });
      expect(document.sections[1]!.isActive).toBe(true);
    });

    it('adds nothing when the model has its own', () => {
      const document = arrangedDocument([seeded(0, ['HEADING']), seeded(1, ['PRODUCTS'])], { ...SHOP_HOME, draft: [] }, counter());

      expect(kindsOf(document.sections)).toEqual([['HEADING'], ['PRODUCTS']]);
    });

    it('adds none to a site, which sells nothing, nor to a landing', () => {
      expect(kindsOf(arrangedDocument([seeded(0, ['HEADING'])], { ...SITE_HOME, draft: [] }, counter()).sections)).toEqual([['HEADING']]);
      expect(kindsOf(arrangedDocument([seeded(0, ['HEADING'])], { ...SHOP_LANDING, draft: [] }, counter()).sections)).toEqual([['HEADING']]);
    });
  });

  describe('the contact form the leads point at', () => {
    const draft = [bandOf('b1', [block('form-1', 'CONTACT'), block('c2', 'TEXT')]), bandOf('b2', [block('form-2', 'CONTACT')])];

    it('gives the model’s form the id of the one the draft had, so its leads still point at a form', () => {
      const document = arrangedDocument(templateOf('servicos-b2b').bands({ title: '', product: null, category: null, promises: [], saleEndsAt: '', shop: EMPTY_SHOP }), { ...SITE_HOME, draft });

      const forms = document.sections.flatMap((section) => section.components).filter((component) => component.kind === 'CONTACT');
      expect(forms.map((component) => component.id)).toEqual(['form-1']);
      // The model's fields, not the old form's: the row is kept, what it asks is replaced.
      expect(forms[0]!.items).toHaveLength(4);
    });

    it('pairs forms in order, and gives a form with no predecessor an id of its own', () => {
      const document = arrangedDocument([seeded(0, ['CONTACT']), seeded(1, ['CONTACT']), seeded(2, ['CONTACT'])], { ...SITE_HOME, draft }, counter());

      expect(document.sections.map((section) => section.components[0]!.id)).toEqual(['form-1', 'form-2', 'n4']);
    });

    it('reuses no id of the draft when the model brings no form', () => {
      const document = arrangedDocument([seeded(0, ['HEADING'])], { ...SITE_HOME, draft }, counter());

      const ids = [...document.sections.map((section) => section.id), ...document.sections.flatMap((section) => section.components.map((component) => component.id))];
      expect(ids).toEqual(['n1', 'n2']);
    });
  });

  // Applying must leave what the editor's own writes would accept, on every page a model may meet.
  it.each(PAGE_TEMPLATES.flatMap((template) => template.pageKinds.flatMap((pageKind) => template.storeTypes.map((storeType) => [template.id, pageKind, storeType, template] as const))))(
    '%s on a %s of a %s store leaves a page the rules accept, even from a shop with nothing',
    (_id, pageKind, storeType, template) => {
      const bare = { title: 'Minha página', product: null, category: null, promises: promisesOf([]), saleEndsAt: '2026-09-30T02:00:00.000Z', shop: EMPTY_SHOP };
      const document = arrangedDocument(template.bands(bare), { pageKind, storeType, draft: [] });
      const components = document.sections.flatMap((section) => section.components);

      expect(document.sections.length).toBeGreaterThan(0);
      for (const section of document.sections) expect(section.components.length).toBeGreaterThan(0);
      for (const component of components) {
        expect(componentItemsFor(component.kind).safeParse(component.items).success).toBe(true);
        if (component.display !== null) expect(DISPLAYS_OF_KIND[component.kind]).toContain(component.display);
      }
      expect(new Set(components.map((component) => component.id)).size).toBe(components.length);
      expect(components.filter((component) => component.kind === 'ANNOUNCEMENT').length).toBeLessThanOrEqual(pageKind === 'HOME' ? 1 : 0);
      if (pageKind === 'HOME' && storeType === 'ECOMMERCE') expect(components.some((component) => component.kind === 'PRODUCTS')).toBe(true);
    },
  );
});
