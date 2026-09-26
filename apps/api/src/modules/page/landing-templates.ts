// Types
import type { LandingTemplateId } from '@harness-monorepo/contracts';
import type { SeededBand, SeededItem } from './page-seed.js';

// App
import { band, callToAction, clip, cover, faq, promises, spotlight, type Component } from './landing-template-parts.js';
import { COMPONENT_BODY_MAX_LENGTH, COMPONENT_TITLE_MAX_LENGTH } from './page.constants.js';

/** Every arrangement a landing may open with. The dialog offers exactly these, by this list. */
export const LANDING_TEMPLATE_IDS = [
  'lancamento',
  'promocao-relampago',
  'colecao',
  'em-branco',
] as const satisfies readonly LandingTemplateId[];

/** The templates built around a product. "em-branco" is a heading and nothing to fill it from. */
export const PRODUCT_TEMPLATE_IDS = ['lancamento', 'promocao-relampago', 'colecao'] as const satisfies readonly LandingTemplateId[];

/** The one a site may open with: the others sell a product, and a site sells none. */
export const SITE_TEMPLATE_IDS = ['em-branco'] as const satisfies readonly LandingTemplateId[];

/** What a template fills its bands from, read from the shop before anything is written. */
export interface LandingSubject {
  /** The page's own title, which "em-branco" opens with. */
  title: string;
  product: { id: string; name: string; description: string | null; imageUrl: string | null } | null;
  /** The product's category, which "colecao" is about. */
  category: { id: string; name: string; description: string | null; imageUrl: string | null } | null;
  /** The shop's promises, from its payment methods: a benefits band's rows. */
  promises: SeededItem[];
}

function launch(product: NonNullable<LandingSubject['product']>, rows: SeededItem[]): SeededBand[] {
  const description = product.description?.trim()
    ? clip(product.description.trim(), COMPONENT_BODY_MAX_LENGTH)
    : 'Conte o que torna este produto especial: para quem é, o que resolve e por que vale a pena.';

  return [
    band(0, 'FULL', [
      cover(product.imageUrl, { title: product.name, subtitle: 'Chegou. Conheça a novidade' }, { productId: product.id }, 'SPLIT'),
    ]),
    band(1, 'CONTAINED', [
      { kind: 'HEADING', title: 'Por que você vai gostar', items: [], position: 0, isActive: true },
      { kind: 'TEXT', body: description, align: 'CENTER', items: [], position: 1, isActive: true },
    ]),
    band(2, 'CONTAINED', [spotlight(product.id, 'Compre agora')]),
    promises(rows, 'CARDS', 3),
    band(4, 'CONTAINED', [
      { kind: 'PRODUCTS', title: 'Mais novidades', display: 'RAIL', source: 'NEWEST', limit: 8, items: [], position: 0, isActive: true },
    ]),
    faq(rows, 5),
    callToAction(product.id, { title: 'Garanta o seu', body: 'Aproveite enquanto tem no estoque.', label: 'Comprar agora' }, 6),
  ];
}

function flashSale(product: NonNullable<LandingSubject['product']>, rows: SeededItem[]): SeededBand[] {
  return [
    band(0, 'FULL', [
      cover(product.imageUrl, { title: `${product.name} em oferta`, subtitle: 'Só por pouco tempo' }, { productId: product.id }, 'BACKDROP'),
    ]),
    band(1, 'CONTAINED', [spotlight(product.id, 'Oferta relâmpago · Estoque limitado')]),
    band(2, 'CONTAINED', [
      { kind: 'PRODUCTS', title: 'Mais ofertas', display: 'RAIL', source: 'ON_SALE', limit: 12, items: [], position: 0, isActive: true },
    ]),
    promises(rows, 'INLINE', 3),
    callToAction(product.id, { title: 'A oferta acaba logo', body: 'Garanta o seu antes que acabe.', label: 'Aproveitar a oferta' }, 4),
  ];
}

/**
 * The product's category, whole. A product with no category has no collection to show: the page is
 * built around the product instead, with the shop's newest beside it.
 */
function collection(
  product: NonNullable<LandingSubject['product']>,
  category: LandingSubject['category'],
  rows: SeededItem[],
): SeededBand[] {
  const intro: Component = {
    kind: 'TEXT',
    body: 'Apresente a coleção: o que ela reúne e para quem foi pensada.',
    align: 'CENTER',
    items: [],
    position: 0,
    isActive: true,
  };

  if (!category) {
    return [
      band(0, 'FULL', [cover(product.imageUrl, { title: product.name, subtitle: null }, { productId: product.id }, 'BACKDROP')]),
      band(1, 'CONTAINED', [intro]),
      band(2, 'CONTAINED', [spotlight(product.id, 'Compre agora')]),
      band(3, 'CONTAINED', [
        { kind: 'PRODUCTS', title: 'Novidades', display: 'RAIL', source: 'NEWEST', limit: 8, items: [], position: 0, isActive: true },
      ]),
      promises(rows, 'INLINE', 4),
    ];
  }

  return [
    band(0, 'FULL', [
      cover(
        category.imageUrl ?? product.imageUrl,
        { title: category.name, subtitle: category.description },
        { categoryId: category.id },
        'BACKDROP',
      ),
    ]),
    band(1, 'CONTAINED', [intro]),
    band(2, 'CONTAINED', [
      {
        kind: 'PRODUCTS',
        display: 'GRID',
        source: 'CATEGORY',
        sourceCategoryId: category.id,
        limit: 24,
        items: [],
        position: 0,
        isActive: true,
      },
    ]),
    promises(rows, 'INLINE', 3),
  ];
}

/**
 * The bands a new landing opens with.
 *
 * A template is data applied once, like a site's: the bands are the shopkeeper's to change the moment
 * they exist. Every word is pt-BR for the reason `defaultPage` gives. A product template reached
 * without a product is the service's refusal, not a page of blanks: it is checked before this runs,
 * and "em-branco" is what answers here in its place.
 *
 * No strip: it is the shop's, drawn from the home on every page.
 */
export function landingBands(id: LandingTemplateId, subject: LandingSubject): SeededBand[] {
  const { product } = subject;

  if (id === 'em-branco' || !product) {
    return [band(0, 'CONTAINED', [{ kind: 'HEADING', title: clip(subject.title, COMPONENT_TITLE_MAX_LENGTH), items: [], position: 0, isActive: true }])];
  }

  if (id === 'lancamento') return launch(product, subject.promises);
  if (id === 'promocao-relampago') return flashSale(product, subject.promises);
  return collection(product, subject.category, subject.promises);
}

/** The picture a shared link shows: the one the cover draws. */
export function coverImageOf(id: LandingTemplateId, subject: LandingSubject): string | null {
  if (id === 'em-branco' || !subject.product) return null;
  if (id === 'colecao' && subject.category) return subject.category.imageUrl ?? subject.product.imageUrl;
  return subject.product.imageUrl;
}
