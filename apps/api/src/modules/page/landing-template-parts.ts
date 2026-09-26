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
 * The product itself, large: its photo, its price and stock read when the page is, and the way to buy
 * it — which a banner does not draw. It used to be a showcase of one; a featured product says the
 * same thing at the size the page is about.
 */
export function spotlight(productId: string, words: { title: string; subtitle?: string }): Component {
  return {
    kind: 'FEATURED_PRODUCT',
    title: words.title,
    subtitle: words.subtitle ?? null,
    display: 'IMAGE_LEFT',
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

/** "PIX, Dinheiro e Cartão de crédito": a list as a sentence says it. */
function listed(words: readonly string[]): string {
  return words.length > 1 ? `${words.slice(0, -1).join(', ')} e ${words.at(-1)}` : (words[0] ?? '');
}

/**
 * The questions a first buyer asks, with answers written as a start for the shopkeeper to finish —
 * except payment, which the shop's own methods already answer.
 */
export function faq(rows: SeededItem[], position: number): SeededBand {
  const methods = rows.flatMap((row) => ('icon' in row ? [row.title.toLowerCase() === 'pix' ? 'PIX' : row.title.toLowerCase()] : []));

  return band(position, 'CONTAINED', [
    {
      kind: 'FAQ',
      title: 'Perguntas frequentes',
      display: 'ACCORDION',
      items: [
        { id: 'entrega', question: 'Quanto tempo leva a entrega?', answer: 'Conte o prazo e a forma de entrega para a região do cliente.' },
        { id: 'troca', question: 'Posso trocar ou devolver?', answer: 'Explique como funciona a troca: em quantos dias e em que condições.' },
        {
          id: 'pagamento',
          question: 'Quais são as formas de pagamento?',
          answer: methods.length ? `Aceitamos ${listed(methods)}.` : 'Conte quais formas de pagamento a loja aceita.',
        },
      ],
      position: 0,
      isActive: true,
    },
  ]);
}

/**
 * The page's last word: the product asked for once more, on a strip of the shop's colour, with the
 * button that leads to it. Full width, which is where a strip reaches the edges.
 */
export function callToAction(productId: string, words: { title: string; body: string; label: string }, position: number): SeededBand {
  return band(position, 'FULL', [
    {
      kind: 'CALL_TO_ACTION',
      title: words.title,
      body: words.body,
      display: 'BAND',
      items: [{ id: 'botao', label: words.label, target: 'PRODUCT', productId }],
      position: 0,
      isActive: true,
    },
  ]);
}

export function band(position: number, width: 'FULL' | 'CONTAINED', components: Component[]): SeededBand {
  return { section: { width, position, isActive: true }, components };
}
