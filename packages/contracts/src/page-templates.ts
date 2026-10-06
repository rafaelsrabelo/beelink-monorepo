import type { PageTemplateId } from "./page.js";
import type { StoreType } from "./store.js";
import type { LandingTemplateId, PageKind } from "./store-pages.js";

/**
 * Every model in the catalogue, whatever page it arranges.
 *
 * The two older vocabularies stay as they are, because two payloads are still typed by them: a site
 * is created with a `PageTemplateId`, a landing with a `LandingTemplateId`. A model added to the
 * catalogue alone — one a page is rearranged with, and no payload creates anything from — joins here.
 */
export type TemplateId = PageTemplateId | LandingTemplateId;

/** What a model is built around, which the shop has to name before the model can be arranged. */
export type TemplateNeed = "PRODUCT" | "CATEGORY";

/**
 * A model as the gallery lists it: where it applies and what it asks for. Its bands are not here —
 * they are built from the shop's own products and words, on the preview and on applying.
 *
 * Its name and description are the client's, in its locales, keyed by `id`.
 */
export interface PageTemplateSummary {
  id: TemplateId;
  /** The kinds of page it arranges. The list a shop is answered is already narrowed to the page asked for. */
  pageKinds: PageKind[];
  /** The kinds of store it suits. Already narrowed to this shop's, like `pageKinds`. */
  storeTypes: StoreType[];
  /** Whether it is suggested for this shop's category. It orders the list; it hides nothing. */
  recommended: boolean;
  /** Empty when the model is arranged from the shop alone. */
  needs: TemplateNeed[];
}

/**
 * A model applied to a page that already exists: it replaces the page's draft, bands and blocks, and
 * publishes nothing. Answered with the `PageDraft` it left, one revision on.
 */
export interface ApplyTemplatePayload {
  template: TemplateId;
  /** The product the model is built around, when it asks for one (`needs`). Ignored by a model that does not. */
  productId?: string | null;
  /** The category the model is built around, when it asks for one. Ignored by a model that does not. */
  categoryId?: string | null;
}
