import type { Section } from "./page.js";
import type { StorePage } from "./store-pages.js";

/** Who published a version. Null once the account is gone: the version outlives it. */
export interface PageVersionAuthor {
  id: string;
  name: string;
}

/** A page as it was published once, as the history lists it. */
export interface PageVersionSummary {
  id: string;
  /** 1, 2, 3… per page. */
  number: number;
  note: string | null;
  author: PageVersionAuthor | null;
  createdAt: string;
  /** Whether this is the version the shop serves now: the newest, while the page is published. */
  live: boolean;
}

/**
 * A page as its owner edits it: the draft — every band and block, hidden ones included — and whether
 * it differs from what the shop serves.
 */
export interface PageDraft {
  page: StorePage;
  /**
   * One more on every accepted write to the draft. A write sends the revision it read as
   * `x-page-revision` and is refused (409, PAGE_DRAFT_STALE) when another write landed since; an
   * accepted one leaves the page at the sent revision plus one.
   */
  revision: number;
  /** Whether Publicar would change what a visitor is served. */
  hasUnpublishedChanges: boolean;
  /** The version the shop serves now, or null before the first publish. */
  published: PageVersionSummary | null;
  sections: Section[];
}

export interface PublishPagePayload {
  /** A line for the history: "Black Friday, preços novos". */
  note?: string | null;
}

export interface PublishPageResult {
  page: StorePage;
  version: PageVersionSummary;
}

/** The header a draft write names the revision it read in. */
export type PageRevisionHeader = "x-page-revision";

/** What Publicar would serve that the owner may not mean to. None of them stops a publish. */
export type PageProblemKind =
  | "LINK_TO_MISSING_PRODUCT"
  | "LINK_TO_MISSING_CATEGORY"
  | "SHOWCASE_EMPTY"
  | "BANNER_WITHOUT_IMAGE"
  /** A featured product with none chosen, or one deleted, a draft or archived: the block draws nothing. */
  | "FEATURED_PRODUCT_UNAVAILABLE"
  /** A countdown with no end, or one already past: the shop does not draw it. */
  | "COUNTDOWN_ENDED";

/** One problem, by where it is: the screen names the block and the band and writes the sentence. */
export interface PageProblem {
  kind: PageProblemKind;
  sectionId: string;
  componentId: string;
  /** The slide or link at fault, when the block holds several. */
  itemId: string | null;
}
