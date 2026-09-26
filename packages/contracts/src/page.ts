/* ── a landing page: sections that hold components ────────────────────────── */

import type { PublicProductCard } from "./catalog.js";
import type {
  CallToActionButton,
  FaqItem,
  ImageTextMedia,
  PublicCallToActionButton,
  PublicFeaturedProduct,
  PublicImageTextMedia,
} from "./page-items.js";

/**
 * What a component is.
 *
 * A closed list, and it closes before the first row is written. Adding a seventh kind is a type
 * here, a shape in the zod union, a component with a story and a test, and a panel of fields — the
 * build breaks at every point that is missing, which is the whole reason this is a union and not a
 * string.
 *
 * There is no `HERO`, and its absence is the point of this shape. A cover used to be a kind,
 * meaning "this banner is the one at the top" — a position turned into a type. A cover is a
 * full-width section that happens to come first, holding a banner. The design that **removes** a
 * special case rather than adding one is the one to take; the same sign retired `belowProducts`.
 */
export type ComponentKind =
  /**
   * The strip above the header — free delivery, opening hours, a season.
   *
   * Chrome, and the one component that is not drawn where its section sits: it is above the
   * masthead on every page, so "before the header" is not a position any arrangement can hold. It
   * is a row like the others because writing it, hiding it and filling it in are what a row is for.
   */
  | "ANNOUNCEMENT"
  /** A picture, or several, which makes it a carousel. It may point somewhere. */
  | "BANNER"
  /** A heading and the line under it. A sign, not a card. */
  | "HEADING"
  /** A paragraph. Its own kind and not a mode of the heading: a form with a mode is two forms. */
  | "TEXT"
  /** The band of promises: an icon, a title and a line, per row. */
  | "BENEFITS"
  /** The shop's categories, as a grid of cards. */
  | "CATEGORIES"
  /**
   * A showcase of what the shop sells: all of it, a category, a hand-picked list, the newest or what
   * is on sale. As many as the shopkeeper wants, and the last one cannot be deleted.
   */
  | "PRODUCTS"
  /**
   * A form a visitor fills in, and the ways to reach the owner beside it. What it asks is its
   * `items`; what arrives through it is a lead. A site's kind: a shop takes orders, not contact.
   */
  | "CONTACT"
  /** Questions and their answers, drawn as an accordion whose answers are in the page even closed. */
  | "FAQ"
  /** The page's last word: a title, a line of text and one button that leads somewhere. */
  | "CALL_TO_ACTION"
  /** A picture beside words — a title, a paragraph and, if it leads somewhere, a button. */
  | "IMAGE_TEXT"
  /**
   * One product of the catalogue, large: its photo, its price and stock read when the page is, and
   * the way to buy it. Its `items` hold the pick, a `ShowcaseProduct`, as a hand-picked showcase's do.
   */
  | "FEATURED_PRODUCT";

/**
 * How wide a section sits on the page.
 *
 * It belongs to the section and not to what is inside it, which is the whole reason a cover no
 * longer needs a kind of its own: a full-bleed band is a section that bleeds, whatever it holds.
 */
export type SectionWidth = "FULL" | "CONTAINED";

/**
 * How much of its band a component takes: the whole of it, a half, a third or two thirds.
 *
 * The band's own width is `SectionWidth`; this is the block's slice of it. A shape rather than a
 * column count: a free integer would let someone pick seven and get a row of stamps.
 *
 * It replaced `layout` (`FULL | HALVES | THIRDS`), which meant a banner's width, the grid of its
 * slides and, past its second slide, nothing at all.
 */
export type ComponentSpan = "FULL" | "HALF" | "THIRD" | "TWO_THIRDS";

/**
 * A component's layout: the same content, another look. Each kind draws its own, and the API refuses
 * one that is not its kind's; switching keeps every field, so switching back loses nothing.
 *
 * - A banner: `BACKDROP` (its first picture, the words over it), `SPLIT` (the words beside the
 *   picture), `CAROUSEL` (the pictures in turn) or `GRID` (the pictures side by side).
 * - A showcase: `RAIL` (one row that scrolls) or `GRID` (rows).
 * - The categories: `RAIL` or `GRID` of cards with photos, or `CHIPS` (their names, as pills).
 * - The benefits: `INLINE` (icon beside the words, in a tinted band) or `CARDS`.
 * - The strip: `STATIC` (still) or `MARQUEE` (scrolling).
 * - A FAQ: `ACCORDION`, its only one — named so a second is a value, not a migration of the rows.
 * - A call to action: `BAND` (a strip of the shop's colour, edge to edge) or `CARD` (a tinted card
 *   inside the page's margins).
 * - An image with text: `IMAGE_LEFT` or `IMAGE_RIGHT`, stacked on a phone with the picture first.
 * - A featured product: `IMAGE_LEFT` (the photo beside the words) or `IMAGE_LARGE` (the photo wide,
 *   the words under it).
 *
 * Null on every other kind — and on a benefits band or a strip saved before they had a choice, which
 * draw as they always did.
 */
export type ComponentDisplay =
  | "CAROUSEL"
  | "GRID"
  | "RAIL"
  | "BACKDROP"
  | "SPLIT"
  | "CHIPS"
  | "INLINE"
  | "CARDS"
  | "STATIC"
  | "MARQUEE"
  | "ACCORDION"
  | "BAND"
  | "CARD"
  | "IMAGE_LEFT"
  | "IMAGE_RIGHT"
  | "IMAGE_LARGE";

/**
 * Where a component shows: everywhere, only on a computer, or only on a phone — the shop window's
 * `md` width, 768px, is the line between the two. Hiding it everywhere is `isActive`, not this.
 *
 * A component's and not a band's: a band shows wherever one of its components does, so there is
 * one place to say it and no band and block to disagree.
 */
export type DeviceVisibility = "ALL" | "DESKTOP" | "PHONE";

/**
 * Which products a showcase draws: all of them, one category (and its subcategories), a hand-picked
 * list, the newest, or the ones on sale.
 *
 * There is no best sellers. Nothing records a sale yet, and a source named for sales would draw some
 * other order under that name. It is one value added the day orders exist.
 */
export type ProductSource = "ALL" | "CATEGORY" | "SELECTION" | "NEWEST" | "ON_SALE";

/**
 * Where a component's words sit. Read on `HEADING` and `TEXT`.
 *
 * Null is "as this kind always drew it" — a heading centred, a paragraph at the left — and not a
 * fourth alignment. A column default would have had to pick one of the two and be wrong for the
 * other kind; null lets the renderer keep each block's own habit until the shopkeeper says
 * otherwise, and the day they do, the value is theirs.
 */
export type TextAlign = "LEFT" | "CENTER" | "RIGHT";

/**
 * Where a component sends the visitor.
 *
 * This is the piece the first attempt lacked, and the reason it was removed. The old
 * `store_showcases` kept its destination as a free-text `href`, so a banner pointing at
 * `/lessari/blusas` became a dead link the day that category was renamed, and nothing said so.
 * Commit `5639c47` deleted the table and wrote down what went with it — "banner apontando para um
 * produto específico ou para fora da loja" — and this type is that sentence being paid back.
 *
 * `CATEGORY` and `PRODUCT` carry a foreign key, never an address. The address is built where it is
 * rendered, from the slug the row has now, so renaming the thing a component points at moves the
 * component with it. `EXTERNAL` is the only one that stores a string, because there is nothing in
 * this database to point at — another website, or a `wa.me` link.
 *
 * `NONE` is a poster that says something and goes nowhere. The shop window draws it without an
 * arrow and without making it clickable: a card that looks interactive and is not is worse than a
 * card that never offered.
 */
export type ComponentTarget = "CATEGORY" | "PRODUCT" | "EXTERNAL" | "NONE";

/**
 * One picture of a banner.
 *
 * A slide and not a component of its own, because a carousel is one thing on the page and a
 * shopkeeper who makes one should not have to create two and hope they stay adjacent — which is
 * exactly how the shape before this was reported.
 *
 * **The target is stored as an id, never as an address.** The objection to slides was that one
 * could only hold an `href`, so a slide pointing at `/lessari/blusas` would die the day that
 * category was renamed. An id resolved at read time has none of that.
 *
 * What it gives up is the foreign key's cascade, and the trade is in this shape's favour: a
 * deleted category used to take the whole banner with it, and a dangling id here resolves to null
 * so the slide simply stops being a link. The picture stays on the page.
 */
export interface BannerSlide {
  id: string;
  imageUrl: string;
  /** Written over the picture. Often absent: a banner is usually a photograph with words in it. */
  title?: string | null;
  subtitle?: string | null;
  target: ComponentTarget;
  /** Set when `target` is `CATEGORY`. The row's id, resolved to an address on the way out. */
  categoryId?: string | null;
  productId?: string | null;
  /** `http`/`https` only. */
  externalUrl?: string | null;
}

/** A slide as a visitor is served it: the address already built, the ids left behind. */
export interface PublicBannerSlide {
  id: string;
  imageUrl: string;
  title: string | null;
  subtitle: string | null;
  /** Null when it goes nowhere, or when what it pointed at is gone. */
  href: string | null;
  external: boolean;
}

/**
 * One promise in the band of benefits.
 *
 * `icon` is a name from a closed table, never a URL and never a component — the same rule
 * `StoreCategory.icon` already states. A name the table does not know draws the default rather
 * than breaking the page, because a shop's landing page must survive a deploy that removed an icon.
 */
export interface BenefitRow {
  id: string;
  icon: string;
  title: string;
  detail?: string | null;
}

/**
 * Where the announcement strip leads, if anywhere. At most one per strip.
 *
 * The same destination a slide carries, minus the picture and the words — those are the strip's
 * own `title` and `subtitle`. Stored as an id for the same reason a slide's is: the address is
 * built on the way out from the slug the target has now, so a renamed category moves the strip
 * with it.
 */
export interface AnnouncementLink {
  id: string;
  target: ComponentTarget;
  categoryId?: string | null;
  productId?: string | null;
  externalUrl?: string | null;
}

/** The strip's destination as a visitor is served it: the address already built. */
export interface PublicAnnouncementLink {
  id: string;
  href: string | null;
  external: boolean;
}

/**
 * What one field of a contact form asks for.
 *
 * A closed set, and closed on purpose: six types cover "empresa, produto, volume, origem, destino,
 * data desejada" without this becoming a form builder. The visitor's name is not a field — it is
 * always asked, first, and it is the column every screen shows.
 */
export type ContactFieldType = "TEXT" | "EMAIL" | "PHONE" | "TEXTAREA" | "SELECT" | "DATE";

/**
 * One field of a contact form, as its owner declared it.
 *
 * The form must hold at least one required `EMAIL` or `PHONE` field — the API refuses one that
 * does not — because a lead with no way to answer it is not a lead. A visitor's answers are
 * checked against these fields, by `id`, and an answer to a field the form does not have is refused.
 */
export interface ContactField {
  id: string;
  label: string;
  type: ContactFieldType;
  required: boolean;
  /** The choices, on a `SELECT`. Absent on every other type. */
  options?: string[] | null;
}

/**
 * One product a `SELECTION` showcase draws, in the place the shopkeeper put it. An id and not a copy:
 * the price and the picture are read when the page is, and a product deleted since simply drops out.
 */
export interface ShowcaseProduct {
  id: string;
  productId: string;
}

/**
 * What a component holds beyond its own fields.
 *
 * It is content, and that is what separates it from `layoutSettings`. A key nobody reads in that
 * blob is invisible — sixteen of its twenty-one survived that way. An `items` nobody reads is a
 * blank band on the shop's front page, reported the same day.
 */
export type ComponentItem =
  | BannerSlide
  | BenefitRow
  | AnnouncementLink
  | ContactField
  | ShowcaseProduct
  | FaqItem
  | CallToActionButton
  | ImageTextMedia;
/**
 * What a visitor is served in a component's `items`: a banner's slides with their addresses built, a
 * showcase's products as cards, and every other kind's items as the shopkeeper wrote them.
 */
export type PublicComponentItem =
  | PublicBannerSlide
  | BenefitRow
  | PublicAnnouncementLink
  | ContactField
  | PublicProductCard
  | FaqItem
  | PublicCallToActionButton
  | PublicImageTextMedia
  | PublicFeaturedProduct;

/** A component as a visitor is served it: already resolved, so the storefront joins nothing. */
export interface PublicComponent {
  id: string;
  kind: ComponentKind;
  title: string | null;
  subtitle: string | null;
  /** The paragraph, on a `TEXT`; the text of a call to action and of an image with text. Null otherwise. */
  body: string | null;
  /** Its slice of the band, on every kind. */
  span: ComponentSpan;
  /** The layout, from the kind's own (`ComponentDisplay`); null where the kind has none, or had none when saved. */
  display: ComponentDisplay | null;
  /** A showcase's source, for the page to say where "ver tudo" leads. Null on every other kind. */
  source: ProductSource | null;
  /**
   * The category a `CATEGORY` showcase draws: the slug its page lives at, and the name and line the
   * shelf is headed by. Null otherwise.
   */
  sourceCategory: { slug: string; name: string; description: string | null } | null;
  /**
   * A banner's slides, the benefits band's rows, the strip's one link, a form's fields, a FAQ's
   * questions, a call to action's button or an image with text's picture, their addresses built — or
   * the cards read when the page is: a featured product's one, a showcase's products chosen by its
   * source, cut at its limit and on the shelf. Empty otherwise.
   */
  items: PublicComponentItem[];
  /** How many across a grid draws. Read on `CATEGORIES` and `PRODUCTS`. */
  columns: number | null;
  align: TextAlign | null;
  /** Absent on a page cached before it existed, which shows everywhere. */
  visibleOn?: DeviceVisibility;
}

/** A component as its owner edits it. Slugs on the wire; the uuids stay in the database. */
export interface StoreComponent {
  id: string;
  sectionId: string;
  kind: ComponentKind;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  span: ComponentSpan;
  display: ComponentDisplay | null;
  /** A showcase's products. Null on every other kind. */
  source: ProductSource | null;
  /** The category a `CATEGORY` showcase draws. Null for every other source, and on other kinds. */
  sourceCategoryId: string | null;
  /** How many products a showcase draws, at most. Null is the default, 24. */
  limit: number | null;
  items: ComponentItem[];
  columns: number | null;
  align: TextAlign | null;
  visibleOn: DeviceVisibility;
  /** Its place inside its section. The section's own place is the section's. */
  position: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * A band of the page, as a visitor is served it.
 *
 * `background` is the shopkeeper's choice for this band; null means the page's own. Whatever is
 * written on it is derived from it by the same rule the rest of the shop window uses, so a dark
 * band in a pale shop is readable without anyone choosing a text colour.
 */
export interface PublicSection {
  id: string;
  /**
   * What the band is called on the page, if its owner named it. On a site, the named bands are the
   * header's menu — each an anchor — so a name is a decision to be reachable from the top.
   */
  name: string | null;
  width: SectionWidth;
  background: string | null;
  components: PublicComponent[];
}

/** A band of the page, as its owner arranges it. */
export interface Section {
  id: string;
  name: string | null;
  width: SectionWidth;
  background: string | null;
  position: number;
  isActive: boolean;
  components: StoreComponent[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateSectionPayload {
  name?: string | null;
  width?: SectionWidth;
  background?: string | null;
  isActive?: boolean;
  /**
   * Where the band lands: its place among the page's bands, 0 first. Absent, or past the end, it
   * lands last. The bands after it move down one.
   */
  position?: number;
  /** The one component it is created around. A section with nothing in it draws nothing. */
  component: CreateComponentPayload;
}

export type UpdateSectionPayload = Partial<Omit<CreateSectionPayload, "component" | "position">>;

/**
 * What a write sends for a component.
 *
 * The three target fields are separate rather than a union because a form holds all three at once —
 * a shopkeeper who picks a category, changes their mind and picks a product should not lose what
 * they typed. The API keeps exactly the one `target` names and clears the other two.
 */
export interface CreateComponentPayload {
  kind: ComponentKind;
  title?: string | null;
  subtitle?: string | null;
  body?: string | null;
  span?: ComponentSpan;
  /** The layout, from the kind's own (`ComponentDisplay`). Refused on a kind with none, and null refused on a kind with some. */
  display?: ComponentDisplay | null;
  /** A showcase's. `CATEGORY` needs `sourceCategoryId`; `SELECTION` needs `items`. */
  source?: ProductSource;
  sourceCategoryId?: string | null;
  /** 1 to 48; null is the default. */
  limit?: number | null;
  items?: ComponentItem[];
  columns?: number | null;
  align?: TextAlign | null;
  visibleOn?: DeviceVisibility;
  isActive?: boolean;
}

export type UpdateComponentPayload = Partial<CreateComponentPayload>;

/** A component added into a band that exists, and where it lands among the band's own. */
export interface AddComponentPayload extends CreateComponentPayload {
  /** Its place in the band, 0 first. Absent, or past the end, it lands last. */
  position?: number;
}

/**
 * A component moved into another band that exists — how two blocks stacked in two bands end up side
 * by side in one row, without being made again. Blocks share a row only inside one band's grid.
 *
 * Its own route and not a `sectionId` on the PATCH: a move changes two bands at once (where it
 * lands, and what closes up behind it), and the band it leaves is deleted when it leaves it empty —
 * a band never exists empty.
 */
export interface MoveComponentPayload {
  /** The band it goes to. The same band it is in reorders it there. */
  sectionId: string;
  /** Its place in that band, 0 first. Absent, or past the end, it lands last. */
  position?: number;
  /** The slice it takes there, so the row it joins can have room for it in the same write. */
  span?: ComponentSpan;
}

/** The `errorCode` values the page module answers. The apps own the sentences. */
export type PageErrorCode =
  | "SECTION_NOT_FOUND"
  /** A band created with no component, or with something that is not one. A band holds one from birth. */
  | "SECTION_COMPONENT_REQUIRED"
  | "COMPONENT_NOT_FOUND"
  /** The order sent is not every row of this shop exactly once. */
  | "REORDER_MISMATCH"
  /**
   * A kind that cannot exist twice — the strip above the header, since there is one masthead.
   *
   * `PRODUCTS` used to be one too, when every showcase drew the same shelves. A showcase has a
   * source of its own now, so two of them are two different shelves.
   */
  | "COMPONENT_KIND_SINGLETON"
  /** The component's content does not fit what its kind holds — a slide with no picture, say. */
  | "COMPONENT_ITEMS_INVALID"
  /** A `span` that is not one of the four slices. */
  | "COMPONENT_SPAN_INVALID"
  /** A `display` that is not one of the two, or one sent to a kind that does not read it. */
  | "COMPONENT_DISPLAY_INVALID"
  /** A `visibleOn` that is not one of the three, or one sent to the strip, which shows everywhere. */
  | "COMPONENT_VISIBILITY_INVALID"
  /** A kind the home holds and a landing does not: the strip, which is the shop's on every page. */
  | "COMPONENT_KIND_HOME_ONLY"
  /** A page that is not this shop's, or not there; a landing not published, to a visitor. */
  | "PAGE_NOT_FOUND"
  /** An address another page of this shop already has. */
  | "PAGE_SLUG_TAKEN"
  /** An address with nothing left after normalising, or longer than sixty characters. */
  | "PAGE_SLUG_INVALID"
  /** The home is the shop's own address and is always published: it is not patched as a page. */
  | "PAGE_HOME_FIXED"
  /** A template this kind of shop cannot use: a site has no catalogue to launch a product from. */
  | "PAGE_TEMPLATE_UNAVAILABLE"
  /** A template built around a product, sent without one. */
  | "PAGE_PRODUCT_REQUIRED"
  /** A product that is not this shop's. */
  | "PAGE_PRODUCT_INVALID"
  /** Another tab wrote to this page's draft since this one read it: reload before writing. */
  | "PAGE_DRAFT_STALE"
  /** An `x-page-revision` that is not a whole number. */
  | "PAGE_REVISION_INVALID"
  /** A version that is not this page's. */
  | "PAGE_VERSION_NOT_FOUND"
  /** A `source` that is not one of the five, or a showcase's field sent to a kind that is not one. */
  | "SHOWCASE_SOURCE_INVALID"
  /** A `CATEGORY` showcase with no category, or with one that is not this shop's. */
  | "SHOWCASE_CATEGORY_INVALID"
  /** A `SELECTION` showcase with no product, or with one that is not this shop's. */
  | "SHOWCASE_PRODUCTS_INVALID"
  /** A `limit` outside 1 to 48. */
  | "SHOWCASE_LIMIT_INVALID"
  /** A featured product that is another shop's. */
  | "FEATURED_PRODUCT_INVALID"
  /** A `position` to add at that is not a whole number from 0. */
  | "POSITION_INVALID"
  /**
   * A patch tried to change a component's kind.
   *
   * It used to be allowed, for one case: a banner moving between the top of the page and its body.
   * That was a position expressed as a type, and where a thing sits is its section's business now —
   * so the one reason to change a kind no longer exists, and every other change of kind is a
   * different shape with different fields.
   */
  | "COMPONENT_KIND_IMMUTABLE"
  /**
   * A delete would take the shop's last showcase of products, whether it names the component or the
   * section holding it. Hiding is the answer there; a duplicate can go.
   *
   * Added after a shop lost its shelves exactly this way: the component's own row drew no bin,
   * and the section's bin took the component with it. The UI is not the lock; this is.
   */
  | "COMPONENT_REQUIRED"
  /**
   * A move of the strip above the header, or into its band: the strip's band is its colour, drawn
   * above the masthead, and not a row anything can sit beside.
   */
  | "COMPONENT_NOT_MOVABLE";

/**
 * The arrangements a site may open with.
 *
 * A closed list, like every vocabulary on this wire: a template is data the API holds, and the
 * form offers exactly the ones the API can seed. The first is the structure of the briefing a
 * transport company's landing page was planned from — services sold to businesses.
 */
export type PageTemplateId = "servicos-b2b";
