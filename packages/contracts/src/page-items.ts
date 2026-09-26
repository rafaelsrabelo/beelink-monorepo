/* ── the items of the section kinds a sales page added ──────────────────────── */

import type { PublicProductCard } from "./catalog.js";
import type { ComponentTarget } from "./page.js";

/**
 * One question of a FAQ and its answer. The answer is plain text whose line breaks the shop keeps.
 * The order of the list is the order on the page, which the owner changes in the panel.
 */
export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

/**
 * A button that leads somewhere: its words, and a destination held as an id, as a slide's is — the
 * address is built on the way out from the slug the target has now. A button that leads nowhere is
 * not stored: "nowhere" is no button.
 */
export interface ComponentLink {
  /** What the button says. */
  label: string;
  target: Exclude<ComponentTarget, "NONE">;
  categoryId?: string | null;
  productId?: string | null;
  /** `http`/`https` only. */
  externalUrl?: string | null;
}

/** A call to action's one button. At most one per block. */
export interface CallToActionButton extends ComponentLink {
  id: string;
}

/** A button as a visitor is served it: the address already built, the ids left behind. */
export interface PublicComponentLink {
  label: string;
  /** Null when what it pointed at is gone: the block then draws no button. */
  href: string | null;
  external: boolean;
}

export interface PublicCallToActionButton extends PublicComponentLink {
  id: string;
}

/**
 * An image with text's picture, and the button beside the words, if it has one. One item because the
 * block holds one of each; the words are the block's own title and text.
 */
export interface ImageTextMedia {
  id: string;
  /** `""` never: a block with no picture holds no media and draws its words alone. */
  imageUrl: string;
  /** What the picture shows, for a screen reader. Absent is decorative. */
  alt?: string | null;
  button?: ComponentLink | null;
}

export interface PublicImageTextMedia {
  id: string;
  imageUrl: string;
  alt: string | null;
  /** Null when there is none, or when what it pointed at is gone. */
  button: PublicComponentLink | null;
}

/**
 * A featured product as a visitor is served it: the card, resolved when the page is read, so a price
 * or a photo changed since Publicar shows at once. It is drawn while it is sold out, marked so, and
 * not drawn at all once it is deleted, a draft or archived — the block then holds no item.
 */
export interface PublicFeaturedProduct extends PublicProductCard {
  soldOut: boolean;
}
