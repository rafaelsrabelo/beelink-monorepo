/* ── the items of the section kinds a sales page added ──────────────────────── */

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
