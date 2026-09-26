// Types
import type { SeededBand, SeededItem } from './page-seed.js';

// App
import { COMPONENT_SUBTITLE_MAX_LENGTH, COMPONENT_TITLE_MAX_LENGTH } from './page.constants.js';

/*
  The pieces the landing templates are built from: a cover, a product on its own, the shop's
  promises, a band. Apart from the templates so each one reads as the page it opens with.
*/

/** One block as a template seeds it. */
export type Component = SeededBand['components'][number];

/** Cut to the column's length by code point, so a long product name is not a refused write. */
export function clip(text: string, max: number): string {
  const points = [...text];
  return points.length > max ? points.slice(0, max).join('').trimEnd() : text;
}

/**
 * The cover: the picture with its words over it or beside it, pointing at what the page is about.
 * Without a picture it is the words alone — a banner with no slide draws nothing.
 */
export function cover(
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
export function spotlight(productId: string, title: string): Component {
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
export function promises(rows: SeededItem[], display: 'INLINE' | 'CARDS', position: number): SeededBand {
  return {
    section: { width: 'FULL', position, isActive: rows.length > 0 },
    components: [{ kind: 'BENEFITS', display, items: rows, position: 0, isActive: true }],
  };
}

export function band(position: number, width: 'FULL' | 'CONTAINED', components: Component[]): SeededBand {
  return { section: { width, position, isActive: true }, components };
}
