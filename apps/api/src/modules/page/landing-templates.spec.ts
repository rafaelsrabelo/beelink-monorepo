// Types
import type { ComponentKind, LandingTemplateId } from '@harness-monorepo/contracts';
import type { LandingSubject } from './landing-templates.js';

// App
import { componentItemsFor } from './component-items.schema.js';
import { coverImageOf, LANDING_TEMPLATE_IDS, landingBands } from './landing-templates.js';
import { DISPLAYS_OF_KIND } from './page.constants.js';
import { promisesOf } from './page-seed.js';

const PRODUCT = { id: '0199e000-0000-7000-8000-000000000001', name: 'Whey Baunilha 900 g', description: 'Proteína isolada.', imageUrl: 'https://cdn.example/whey.png' };
const CATEGORY = { id: '0199d000-0000-7000-8000-000000000001', name: 'Proteínas', description: 'Para depois do treino', imageUrl: null };

function subject(over: Partial<LandingSubject> = {}): LandingSubject {
  return { title: 'Minha página', product: PRODUCT, category: CATEGORY, promises: promisesOf(['PIX', 'MONEY']), ...over };
}

/** Every variation a template meets: with and without a picture, a category, and something to promise. */
const SUBJECTS: [string, LandingSubject][] = [
  ['everything', subject()],
  ['no picture', subject({ product: { ...PRODUCT, imageUrl: null } })],
  ['no category', subject({ category: null })],
  ['nothing to promise', subject({ promises: [] })],
  ['no description', subject({ product: { ...PRODUCT, description: null } })],
];

function kindsOf(id: LandingTemplateId, of: LandingSubject): ComponentKind[] {
  return landingBands(id, of).flatMap((band) => band.components.map((component) => component.kind));
}

describe('landingBands', () => {
  // What the API would refuse from the panel, it must not write itself: every seeded block passes the
  // same items schema and layout table a write from the editor goes through.
  it.each(LANDING_TEMPLATE_IDS.flatMap((id) => SUBJECTS.map(([name, of]) => [id, name, of] as const)))(
    '%s with %s writes only what the editor would accept',
    (id, _name, of) => {
      const bands = landingBands(id, of);

      expect(bands.length).toBeGreaterThan(0);
      bands.forEach((band, index) => {
        expect(band.section.position).toBe(index);
        band.components.forEach((component, at) => {
          expect(component.position).toBe(at);
          expect(componentItemsFor(component.kind).safeParse(component.items).success).toBe(true);
          if (component.display) expect(DISPLAYS_OF_KIND[component.kind]).toContain(component.display);
        });
      });
    },
  );

  it('never seeds the strip, which is the home’s', () => {
    for (const id of LANDING_TEMPLATE_IDS) expect(kindsOf(id, subject())).not.toContain('ANNOUNCEMENT');
  });

  it('opens a launch on the product’s picture, pointing at the product, with the product on a shelf below', () => {
    const [cover, , spotlight] = landingBands('lancamento', subject());

    expect(cover!.components[0]).toMatchObject({
      kind: 'BANNER',
      display: 'SPLIT',
      items: [{ imageUrl: PRODUCT.imageUrl, title: PRODUCT.name, target: 'PRODUCT', productId: PRODUCT.id }],
    });
    expect(spotlight!.components[0]).toMatchObject({
      kind: 'PRODUCTS',
      title: 'Compre agora',
      source: 'SELECTION',
      items: [{ productId: PRODUCT.id }],
    });
  });

  it('ends a launch with the questions a first buyer asks, paying answered from the shop\'s own methods', () => {
    const bands = landingBands('lancamento', subject());
    const faq = bands.at(-1)!.components[0]!;

    expect(faq).toMatchObject({ kind: 'FAQ', display: 'ACCORDION', title: 'Perguntas frequentes' });
    expect(faq.items).toContainEqual({ id: 'pagamento', question: 'Quais são as formas de pagamento?', answer: 'Aceitamos PIX e dinheiro.' });
    const unpaid = landingBands('lancamento', subject({ promises: [] })).at(-1)!.components[0]!;
    expect(unpaid.items).toContainEqual(expect.objectContaining({ id: 'pagamento', answer: 'Conte quais formas de pagamento a loja aceita.' }));
  });

  it('opens on the words alone when there is no picture: a banner with no slide draws nothing', () => {
    const [cover] = landingBands('promocao-relampago', subject({ product: { ...PRODUCT, imageUrl: null } }));

    expect(cover!.components[0]).toMatchObject({ kind: 'HEADING', title: `${PRODUCT.name} em oferta` });
  });

  it('shows the whole category on a collection, and the product alone when it has none', () => {
    const withCategory = landingBands('colecao', subject()).flatMap((band) => band.components);
    const without = landingBands('colecao', subject({ category: null })).flatMap((band) => band.components);

    expect(withCategory).toContainEqual(expect.objectContaining({ kind: 'PRODUCTS', source: 'CATEGORY', sourceCategoryId: CATEGORY.id }));
    expect(withCategory[0]).toMatchObject({ kind: 'BANNER', items: [{ target: 'CATEGORY', categoryId: CATEGORY.id, imageUrl: PRODUCT.imageUrl }] });
    expect(without).toContainEqual(expect.objectContaining({ kind: 'PRODUCTS', source: 'SELECTION' }));
    expect(without).not.toContainEqual(expect.objectContaining({ source: 'CATEGORY' }));
  });

  it('hides the promises band rather than leaving it out when the shop promises nothing', () => {
    const bands = landingBands('lancamento', subject({ promises: [] }));
    const promises = bands.find((band) => band.components[0]!.kind === 'BENEFITS');

    expect(promises!.section.isActive).toBe(false);
  });

  it('opens a blank page with its own title, and nothing to fill', () => {
    expect(landingBands('em-branco', subject())).toEqual([
      expect.objectContaining({ components: [expect.objectContaining({ kind: 'HEADING', title: 'Minha página' })] }),
    ]);
  });

  it('cuts a product name the title column cannot hold', () => {
    const [cover] = landingBands('promocao-relampago', subject({ product: { ...PRODUCT, name: 'x'.repeat(160) } }));

    expect([...(cover!.components[0]!.items[0] as { title: string }).title].length).toBeLessThanOrEqual(120);
  });
});

describe('coverImageOf', () => {
  it('is the picture the cover draws: the category’s on a collection, the product’s otherwise, none when blank', () => {
    const category = { ...CATEGORY, imageUrl: 'https://cdn.example/proteinas.png' };

    expect(coverImageOf('colecao', subject({ category }))).toBe(category.imageUrl);
    expect(coverImageOf('lancamento', subject({ category }))).toBe(PRODUCT.imageUrl);
    expect(coverImageOf('em-branco', subject())).toBeNull();
  });
});
