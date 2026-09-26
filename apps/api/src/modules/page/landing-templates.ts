// Types
import type { LandingTemplateId } from '@harness-monorepo/contracts';
import type { SeededBand, SeededItem } from './page-seed.js';

// App
import { COMPONENT_BODY_MAX_LENGTH, COMPONENT_SUBTITLE_MAX_LENGTH, COMPONENT_TITLE_MAX_LENGTH } from './page.constants.js';

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

type Component = SeededBand['components'][number];

/** Cut to the column's length by code point, so a long product name is not a refused write. */
function clip(text: string, max: number): string {
  const points = [...text];
  return points.length > max ? points.slice(0, max).join('').trimEnd() : text;
}

/**
 * The cover: the picture with its words over it or beside it, pointing at what the page is about.
 * Without a picture it is the words alone — a banner with no slide draws nothing.
 */
function cover(
  imageUrl: string | null,
  words: { title: string; subtitle: string | null },
  target: { productId: string } | { categoryId: string },
  display: 'BACKDROP' | 'SPLIT',
): Component {
  const title = clip(words.title, COMPONENT_TITLE_MAX_LENGTH);
  const subtitle = words.subtitle ? clip(words.subtitle, COMPONENT_SUBTITLE_MAX_LENGTH) : null;

  if (!imageUrl) return { kind: 'HEADING', title, subtitle, items: [], position: 0, isActive: true };

  const slide = {
    id: 'capa',
    imageUrl,
    title,
    ...(subtitle ? { subtitle } : {}),
    ...('productId' in target ? { target: 'PRODUCT' as const, productId: target.productId } : { target: 'CATEGORY' as const, categoryId: target.categoryId }),
  };

  return { kind: 'BANNER', display, items: [slide], position: 0, isActive: true };
}

/**
 * The product itself, on a shelf of one: its price and its button, which a banner does not draw.
 * Titled, because an untitled pick is drawn as "Destaques" — a word for a shelf of several.
 */
function spotlight(productId: string, title: string): Component {
  return {
    kind: 'PRODUCTS',
    title,
    display: 'GRID',
    source: 'SELECTION',
    items: [{ id: 'destaque', productId }],
    position: 0,
    isActive: true,
  };
}

/** The shop's promises, hidden rather than left out when it makes none — the shopkeeper fills them in where they are. */
function promises(rows: SeededItem[], display: 'INLINE' | 'CARDS', position: number): SeededBand {
  return {
    section: { width: 'FULL', position, isActive: rows.length > 0 },
    components: [{ kind: 'BENEFITS', display, items: rows, position: 0, isActive: true }],
  };
}

function band(position: number, width: 'FULL' | 'CONTAINED', components: Component[]): SeededBand {
  return { section: { width, position, isActive: true }, components };
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
