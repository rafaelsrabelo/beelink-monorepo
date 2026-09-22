/* ── the blocks a landing page is made of ─────────────────────────────────── */

/**
 * What a block is.
 *
 * A closed list, and it closes before the first row is written. Adding a sixth kind is a type here,
 * a shape in the zod union, a component with a story and a test, a row in the registry and a panel
 * of settings — and the build breaks at every point that is missing, which is the whole reason the
 * list is a union and not a string.
 *
 * It exists because everything a shopkeeper asked to arrange turned out to be the same sentence:
 * a block, in an order, with settings. Before this there were three ways to order a landing page —
 * `StoreBanner.position`, `Store.layoutType`, and a `layoutSettings` blob with no order at all —
 * and a shopkeeper who wanted a poster under the products had to be given a boolean.
 */
export type SectionKind =
  /** The cover at the top. One image, or several, which makes it a carousel. */
  | "COVER"
  /** A poster in the body of the page — full width, two across or three across. */
  | "BANNER"
  /** A heading and a line under it. Nothing else: it is a sign, not a card. */
  | "TEXT"
  /** The band of promises: an icon, a title and a line, per row. */
  | "BENEFITS"
  /**
   * The product rails. Exactly one per shop and it cannot be deleted — a landing page without
   * what the shop sells is not an arrangement anyone wants. It is a row like the others so that
   * it has a position, which is what lets a poster sit under it.
   */
  | "PRODUCTS";

/**
 * How wide a block sits on the landing page.
 *
 * A shape rather than a column count: full width is the poster at the top, two-across is a banner
 * with room for artwork, three-across is a card with room for a name and a line. A free integer
 * would let someone pick seven and get a row of stamps.
 *
 * It lived on `catalog.ts` while a category was the only thing that could be a poster. It is a
 * block's vocabulary now, and a category no longer has an opinion about the home.
 */
export type ShowcaseLayout = "FULL" | "HALVES" | "THIRDS";

/**
 * Edge to edge, or inside the page's measure.
 *
 * Only the cover has the choice, and only because it is the one block that ever bled to the edges:
 * every other band on the shop window already sits inside `BAND`. A shopkeeper asked for "full
 * como é hoje ou mais centralizado", and this is those two words.
 */
export type SectionWidth = "FULL" | "CONTAINED";

/**
 * Where a block sends the visitor.
 *
 * This is the piece the first attempt lacked, and the reason it was removed. The old
 * `store_showcases` kept its destination as a free-text `href`, so a banner pointing at
 * `/lessari/blusas` became a dead link the day that category was renamed, and nothing said so.
 * Commit `5639c47` deleted the table and wrote down what went with it — "banner apontando para um
 * produto específico ou para fora da loja" — and this type is that sentence being paid back.
 *
 * `CATEGORY` and `PRODUCT` carry a foreign key, never an address. The address is built where it is
 * rendered, from the slug the row has now, so renaming the thing a block points at moves the block
 * with it. `EXTERNAL` is the only one that stores a string, because there is nothing in this
 * database to point at — another website, or a `wa.me` link.
 *
 * `NONE` is a poster that says something and goes nowhere: a season, a promise about delivery, a
 * picture. The shop window draws it without an arrow and without making it clickable, because a
 * card that looks interactive and is not is worse than a card that never offered.
 */
export type SectionTarget = "CATEGORY" | "PRODUCT" | "EXTERNAL" | "NONE";

/**
 * One slide of a cover.
 *
 * A cover with one of these is a picture; with several it is a carousel. There is no `carousel`
 * switch to disagree with the number of slides — the shape a block takes is read off what it
 * holds, which is one fewer thing that can be wrong. `layoutSettings.bannerType` used to be that
 * switch and nothing ever read it.
 */
export interface CoverSlide {
  id: string;
  imageUrl: string;
  /** Read instead of the picture. Empty is a decorative slide, which most covers are. */
  alt?: string | null;
  /** Where the slide goes. Null is a picture that is not a link. */
  href?: string | null;
}

/**
 * One promise in the band under the cover.
 *
 * `icon` is a name from a closed table, never a URL and never a component — the same rule
 * `StoreCategory.icon` already states. A name the table does not know draws the default rather
 * than breaking the page, because a shop's landing page must survive a deploy that removed an
 * icon.
 */
export interface BenefitRow {
  id: string;
  icon: string;
  title: string;
  detail?: string | null;
}

/**
 * What a block holds beyond its title.
 *
 * It is content, and that is what separates it from `layoutSettings`. A key nobody reads in that
 * blob is invisible — sixteen of its twenty-one survived that way. An `items` nobody reads is a
 * blank band on the shop's front page, reported the same day.
 */
export type SectionItem = CoverSlide | BenefitRow;

/**
 * A block as a visitor is served it: already resolved, so the storefront never joins anything.
 *
 * `href` is the finished address — built by the API from the target's current slug for an internal
 * block, or the stored URL for an external one. `external` is what decides whether it opens in a
 * new tab, and it is on the wire rather than inferred from the string: a storefront that decided
 * by looking for `http` would open its own shop in a new tab the day the API returns absolute URLs.
 */
export interface PublicSection {
  id: string;
  kind: SectionKind;
  /** Null on a block that draws no heading, and on a `PRODUCTS` row using the shop's own words. */
  title: string | null;
  subtitle: string | null;
  /** Null on `TEXT`, `BENEFITS` and `PRODUCTS`, which draw no picture of their own. */
  imageUrl: string | null;
  layout: ShowcaseLayout;
  width: SectionWidth;
  /** Null when the block goes nowhere. The window then draws a poster rather than a link. */
  href: string | null;
  external: boolean;
  /** The cover's slides, or the band's rows. Empty on every other kind. */
  items: SectionItem[];
}

/**
 * A block as its owner edits it.
 *
 * The target travels as a **slug**, not the row's uuid, for the reason the catalogue mapper
 * states: the wire speaks in slugs, because that is what a URL carries and what a person
 * recognises. The uuid stays in the database.
 */
export interface Section {
  id: string;
  kind: SectionKind;
  title: string | null;
  subtitle: string | null;
  imageUrl: string | null;
  layout: ShowcaseLayout;
  width: SectionWidth;
  target: SectionTarget;
  /** Set when `target` is `CATEGORY`. Null otherwise. */
  categorySlug: string | null;
  /** Set when `target` is `PRODUCT`. Null otherwise. */
  productSlug: string | null;
  /** Set when `target` is `EXTERNAL`. Null otherwise. `http`/`https` only. */
  externalUrl: string | null;
  items: SectionItem[];
  /** Manual ordering, shared with the storefront. Ties break on the title. */
  position: number;
  /** A hidden block keeps everything; it is not a delete. */
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
export interface CreateSectionPayload {
  kind: SectionKind;
  title?: string | null;
  subtitle?: string | null;
  imageUrl?: string | null;
  layout?: ShowcaseLayout;
  width?: SectionWidth;
  target?: SectionTarget;
  categorySlug?: string | null;
  productSlug?: string | null;
  externalUrl?: string | null;
  items?: SectionItem[];
  isActive?: boolean;
}

export type UpdateSectionPayload = Partial<CreateSectionPayload>;

/** The `errorCode` values the sections module answers. The apps own the sentences. */
export type SectionErrorCode =
  | "SECTION_NOT_FOUND"
  /** The target named carries no destination, or names one the shop does not have. */
  | "SECTION_TARGET_INVALID"
  | "SECTION_REORDER_MISMATCH"
  /**
   * A kind that cannot exist twice, or cannot be deleted at all. There is exactly one `PRODUCTS`
   * row per shop and exactly one `COVER`: two runs of products is not an arrangement, it is a bug
   * the shopkeeper would have to notice on the live page.
   */
  | "SECTION_KIND_SINGLETON";
