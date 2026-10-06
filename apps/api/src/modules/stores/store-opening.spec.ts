// Types
import type { PaymentMethod } from '@harness-monorepo/contracts';

// App
import { HOME_TEMPLATE_IDS, EMPTY_SHOP } from '../page/home-templates.js';
import { defaultPage } from '../page/page-seed.js';
import { templatePage } from '../page/page-templates.js';
import { shopSubject, templateOf } from '../page/template-catalog.js';
import { OPENING_TEMPLATE_IDS, openingPageOf, openingTemplateOf } from './store-opening.js';

const METHODS: PaymentMethod[] = ['MONEY', 'PIX'];
const kindsOf = (bands: ReturnType<typeof openingPageOf>) => bands.map((band) => band.components.map((component) => component.kind));

describe('what a store may be opened with', () => {
  it('takes every model of a home, a site’s and a shop’s, and none of a landing', () => {
    expect(OPENING_TEMPLATE_IDS).toEqual(['servicos-b2b', ...HOME_TEMPLATE_IDS]);
  });
});

describe('the model a store opens with', () => {
  it('is none for a shop that names none: its default page', () => {
    expect(openingTemplateOf('ECOMMERCE', undefined)).toBeNull();
  });

  it('is the shop’s home model when it names one', () => {
    for (const id of HOME_TEMPLATE_IDS) expect(openingTemplateOf('ECOMMERCE', id)?.id).toBe(id);
  });

  it('is a site’s first model, named or not', () => {
    expect(openingTemplateOf('INSTITUTIONAL', undefined)?.id).toBe('servicos-b2b');
    expect(openingTemplateOf('INSTITUTIONAL', 'servicos-b2b')?.id).toBe('servicos-b2b');
  });

  // Not refused: the store opens as it would have with none.
  it('ignores a model that is not for the store’s type', () => {
    expect(openingTemplateOf('ECOMMERCE', 'servicos-b2b')).toBeNull();
    expect(openingTemplateOf('INSTITUTIONAL', 'ofertas')?.id).toBe('servicos-b2b');
  });
});

describe('the page a store opens with', () => {
  it('is exactly the default page for a shop that names no model', () => {
    expect(openingPageOf({ name: 'Lessari', type: 'ECOMMERCE' }, METHODS)).toEqual(defaultPage(METHODS));
    expect(openingPageOf({ name: 'Lessari', type: 'ECOMMERCE', template: undefined }, [])).toEqual(defaultPage([]));
  });

  it('is the default page too for a shop sent a site’s model, as it always was', () => {
    expect(openingPageOf({ name: 'Lessari', type: 'ECOMMERCE', template: 'servicos-b2b' }, METHODS)).toEqual(defaultPage(METHODS));
  });

  it('is exactly the site’s model for a site, named or not, and whatever else it was sent', () => {
    const site = templatePage('servicos-b2b');

    expect(openingPageOf({ name: 'Asfalto Norte', type: 'INSTITUTIONAL' }, METHODS)).toEqual(site);
    expect(openingPageOf({ name: 'Asfalto Norte', type: 'INSTITUTIONAL', template: 'servicos-b2b' }, METHODS)).toEqual(site);
    expect(openingPageOf({ name: 'Asfalto Norte', type: 'INSTITUTIONAL', template: 'por-categorias' }, METHODS)).toEqual(site);
  });

  it.each(HOME_TEMPLATE_IDS)('is the bands %s leaves on a shop with nothing on its shelf, under the shop’s name', (id) => {
    const bands = openingPageOf({ name: 'Lessari', type: 'ECOMMERCE', template: id }, METHODS);

    expect(bands).toEqual(templateOf(id).bands(shopSubject('Lessari', METHODS, new Date(0), { ...EMPTY_SHOP, name: 'Lessari' })));
    // What a shop's home cannot be without, and nothing a shop with no product could not fill.
    const kinds = kindsOf(bands).flat();
    expect(kinds.filter((kind) => kind === 'PRODUCTS')).toHaveLength(1);
    expect(kinds).not.toContain('CATEGORIES');
    expect(kinds).not.toContain('BANNER');
    expect(kinds).not.toContain('ANNOUNCEMENT');
    expect(bands.map((band) => band.section.position)).toEqual(bands.map((_, index) => index));
    expect(bands.every((band) => band.section.isActive)).toBe(true);
    // A model that opens with words opens with the shop's name; the lean one opens on the shelf.
    const headings = bands.flatMap((band) => band.components).filter((component) => component.kind === 'HEADING');
    expect(headings.map((heading) => heading.title)).toEqual(id === 'catalogo-enxuto' ? [] : ['Lessari']);
  });

  it('leaves the promises out of a model when the shop promises nothing, rather than an empty band', () => {
    const bands = openingPageOf({ name: 'Lessari', type: 'ECOMMERCE', template: 'vitrine-com-capa' }, []);

    expect(kindsOf(bands).flat()).not.toContain('BENEFITS');
  });
});
