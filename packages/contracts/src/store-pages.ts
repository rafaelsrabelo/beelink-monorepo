import type { PublicSection } from "./page.js";

/** A shop's home, at `/<shop>`, or a landing page, at `/<shop>/lp/<address>`. */
export type PageKind = "HOME" | "LANDING";

/** Whether a landing is served. The home is always published; archiving is how a landing is taken down. */
export type PageStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

/** The sections a new landing opens with, filled from the product the shopkeeper picked. */
export type LandingTemplateId = "lancamento" | "promocao-relampago" | "colecao" | "em-branco";

/** What a search result and a shared link say about a page. Null falls back to the page's title and the shop's. */
export interface PageSeo {
  title: string | null;
  description: string | null;
  imageUrl: string | null;
}

/** A page as its owner manages it. */
export interface StorePage {
  id: string;
  kind: PageKind;
  /** Null on the home, which lives at the shop's own address. */
  slug: string | null;
  title: string;
  /** Whether the shop's header, footer and strip frame it. */
  usesChrome: boolean;
  /** Whether the shop's menu and footer link to it, while it is published. */
  inMenu: boolean;
  status: PageStatus;
  seo: PageSeo;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A published landing the shop links from its menu and footer. */
export interface PublicPageLink {
  slug: string;
  title: string;
}

/** A published landing as a visitor is served it. */
export interface PublicLanding {
  slug: string;
  title: string;
  usesChrome: boolean;
  seo: PageSeo;
  sections: PublicSection[];
}

/** A page as its owner previews it, whatever its status: its bands as a visitor would be served them. */
export interface PagePreview {
  page: StorePage;
  sections: PublicSection[];
}

export interface CreateLandingPayload {
  title: string;
  /** Normalised by the API; derived from the title when absent. */
  slug?: string;
  template: LandingTemplateId;
  /** The product the template is built around. Every template but "em-branco" needs one. */
  productId?: string | null;
  inMenu?: boolean;
  usesChrome?: boolean;
}

/** A patch of a landing. A key left out is a column left alone; null clears an SEO field. The home is not patched here. */
export interface UpdatePagePayload {
  title?: string;
  slug?: string;
  inMenu?: boolean;
  usesChrome?: boolean;
  status?: PageStatus;
  seo?: Partial<PageSeo>;
}

/** Whether an address is free for a new landing, as the API would normalise it. */
export interface PageSlugAvailability {
  slug: string;
  available: boolean;
  reason: "TAKEN" | "INVALID" | null;
}
