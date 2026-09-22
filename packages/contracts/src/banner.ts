/* ── banners ──────────────────────────────────────────────────────────────── */

/**
 * How wide a poster sits on the landing page.
 *
 * A shape rather than a column count: full width is the poster at the top, two-across is a banner
 * with room for artwork, three-across is a card with room for a name and a line. A free integer
 * would let someone pick seven and get a row of stamps.
 *
 * It lived on `catalog.ts` while a category was the only thing that could be a poster. It is a
 * banner's vocabulary now, and a category no longer has an opinion about the home.
 */
export type ShowcaseLayout = "FULL" | "HALVES" | "THIRDS";

/**
 * Where a banner sends the visitor.
 *
 * This is the piece the first attempt at banners did not have, and the reason it was removed.
 * `store_showcases` stored the destination as a free-text `href`, so a banner pointing at
 * `/lessari/blusas` became a dead link the day that category was renamed, and nothing in the panel
 * said so. Commit `5639c47` deleted the table and wrote down what went with it — "banner apontando
 * para um produto específico ou para fora da loja" — and that sentence is what this type pays back.
 *
 * `CATEGORY` and `PRODUCT` carry a foreign key, never an address. The address is built where it is
 * rendered, from the slug the row has now, so renaming the thing a banner points at moves the
 * banner with it. `EXTERNAL` is the only one that stores a string, because there is nothing in this
 * database to point at — another website, or a `wa.me` link.
 */
export type BannerTarget = "CATEGORY" | "PRODUCT" | "EXTERNAL";

/**
 * A banner as a visitor is served it: already resolved, so the storefront never joins anything.
 *
 * `href` is the finished address — built by the API from the target's current slug for an internal
 * banner, or the stored URL for an external one. `external` is what decides whether it opens in a
 * new tab, and it is on the wire rather than inferred from the string: a storefront that decided by
 * looking for `http` would open its own shop in a new tab the day the API returns absolute URLs.
 */
export interface PublicBanner {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  /** Full width, two across, three across — the same three shapes a category poster had. */
  layout: ShowcaseLayout;
  href: string;
  external: boolean;
}

/**
 * A banner as its owner edits it.
 *
 * The target travels as a **slug**, not the row's uuid, for the reason the catalogue mapper states:
 * the wire speaks in slugs, because that is what a URL carries and what a person recognises. The
 * uuid stays in the database.
 */
export interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  layout: ShowcaseLayout;
  target: BannerTarget;
  /** Set when `target` is `CATEGORY`. Null otherwise. */
  categorySlug: string | null;
  /** Set when `target` is `PRODUCT`. Null otherwise. */
  productSlug: string | null;
  /** Set when `target` is `EXTERNAL`. Null otherwise. `http`/`https` only. */
  externalUrl: string | null;
  /** Manual ordering, shared with the storefront. Ties break on the title. */
  position: number;
  /** A hidden banner keeps everything; it is not a delete. */
  isActive: boolean;
  /** ISO-8601. */
  createdAt: string;
  /** ISO-8601. */
  updatedAt: string;
}

/**
 * What a write sends.
 *
 * The three target fields are separate rather than a union because a form holds all three at once —
 * a shopkeeper who picks a category, changes their mind and picks a product should not lose what
 * they typed. The API keeps exactly the one `target` names and clears the other two, so the row can
 * never disagree with itself.
 */
export interface CreateBannerPayload {
  title: string;
  subtitle?: string | null;
  imageUrl: string;
  layout: ShowcaseLayout;
  target: BannerTarget;
  categorySlug?: string | null;
  productSlug?: string | null;
  externalUrl?: string | null;
  isActive?: boolean;
}

export type UpdateBannerPayload = Partial<CreateBannerPayload>;

/** The `errorCode` values the banners module answers. The apps own the sentences. */
export type BannerErrorCode =
  | "BANNER_NOT_FOUND"
  /** The target named carries no destination, or names one the shop does not have. */
  | "BANNER_TARGET_INVALID"
  | "BANNER_REORDER_MISMATCH";
