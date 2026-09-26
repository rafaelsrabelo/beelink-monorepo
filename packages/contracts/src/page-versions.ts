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
