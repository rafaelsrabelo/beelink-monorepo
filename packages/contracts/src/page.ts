/* ── a landing page: sections that hold components ────────────────────────── */

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
  /** What the shop sells. One per shop, and it cannot be deleted. */
  | "PRODUCTS"
  /**
   * A form a visitor fills in, and the ways to reach the owner beside it. What it asks is its
   * `items`; what arrives through it is a lead. A site's kind: a shop takes orders, not contact.
   */
  | "CONTACT";

/**
 * How wide a section sits on the page.
 *
 * It belongs to the section and not to what is inside it, which is the whole reason a cover no
 * longer needs a kind of its own: a full-bleed band is a section that bleeds, whatever it holds.
 */
export type SectionWidth = "FULL" | "CONTAINED";

/**
 * How wide a banner sits inside its section, in the words the wire used before `span`.
 *
 * Kept while the panel and the shop window still read it: the API derives it from `span` and
 * translates it back on a write. It says less than `span` does — there is no two-thirds in it.
 */
export type ShowcaseLayout = "FULL" | "HALVES" | "THIRDS";

/**
 * How much of its band a component takes: the whole of it, a half, a third or two thirds.
 *
 * The band's own width is `SectionWidth`; this is the block's slice of it. A shape rather than a
 * column count, for the reason `ShowcaseLayout` gave: a free integer lets someone pick seven.
 */
export type ComponentSpan = "FULL" | "HALF" | "THIRD" | "TWO_THIRDS";

/**
 * How a component with several pictures lays them out: one at a time, or side by side. Read on
 * `BANNER`, and null on every other kind. A choice, where it used to be the slide count deciding.
 */
export type ComponentDisplay = "CAROUSEL" | "GRID";

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
 * What a component holds beyond its own fields.
 *
 * It is content, and that is what separates it from `layoutSettings`. A key nobody reads in that
 * blob is invisible — sixteen of its twenty-one survived that way. An `items` nobody reads is a
 * blank band on the shop's front page, reported the same day.
 */
export type ComponentItem = BannerSlide | BenefitRow | AnnouncementLink | ContactField;
export type PublicComponentItem = PublicBannerSlide | BenefitRow | PublicAnnouncementLink | ContactField;

/** A component as a visitor is served it: already resolved, so the storefront joins nothing. */
export interface PublicComponent {
  id: string;
  kind: ComponentKind;
  title: string | null;
  subtitle: string | null;
  /** The paragraph, on a `TEXT`. Null on every other kind. */
  body: string | null;
  /** @deprecated Derived from `span`, and kept until nothing reads it. Read `span`. */
  layout: ShowcaseLayout;
  /** Its slice of the band, on every kind. */
  span: ComponentSpan;
  /** Read on `BANNER`. Null on every other kind. */
  display: ComponentDisplay | null;
  /** A banner's slides, the benefits band's rows, the strip's one link or a form's fields. Empty otherwise. */
  items: PublicComponentItem[];
  /** How many across a grid draws. Read on `CATEGORIES` and `PRODUCTS`. */
  columns: number | null;
  align: TextAlign | null;
}

/** A component as its owner edits it. Slugs on the wire; the uuids stay in the database. */
export interface StoreComponent {
  id: string;
  sectionId: string;
  kind: ComponentKind;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  /** @deprecated Derived from `span`, and kept until nothing reads it. Read `span`. */
  layout: ShowcaseLayout;
  span: ComponentSpan;
  display: ComponentDisplay | null;
  items: ComponentItem[];
  columns: number | null;
  align: TextAlign | null;
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
  /** The one component it is created around. A section with nothing in it draws nothing. */
  component: CreateComponentPayload;
}

export type UpdateSectionPayload = Partial<Omit<CreateSectionPayload, "component">>;

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
  /** @deprecated Send `span`. Translated to it when `span` is absent; ignored when both are sent. */
  layout?: ShowcaseLayout;
  span?: ComponentSpan;
  /** A banner's choice. Refused on a kind that does not read it, and refused as null on one that does. */
  display?: ComponentDisplay | null;
  items?: ComponentItem[];
  columns?: number | null;
  align?: TextAlign | null;
  isActive?: boolean;
}

export type UpdateComponentPayload = Partial<CreateComponentPayload>;

/** The `errorCode` values the page module answers. The apps own the sentences. */
export type PageErrorCode =
  | "SECTION_NOT_FOUND"
  | "COMPONENT_NOT_FOUND"
  /** The order sent is not every row of this shop exactly once. */
  | "REORDER_MISMATCH"
  /**
   * A kind that cannot exist twice, or cannot be deleted at all. There is exactly one `PRODUCTS`
   * component per shop: two runs of products is not an arrangement, it is a bug the shopkeeper
   * meets on the live page, with no row left to put the shelves back.
   */
  | "COMPONENT_KIND_SINGLETON"
  /** The component's content does not fit what its kind holds — a slide with no picture, say. */
  | "COMPONENT_ITEMS_INVALID"
  /** A `span` that is not one of the four slices. */
  | "COMPONENT_SPAN_INVALID"
  /** A `display` that is not one of the two, or one sent to a kind that does not read it. */
  | "COMPONENT_DISPLAY_INVALID"
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
   * A delete would take a component the shop cannot be without — the product list — whether it
   * names the component or the section holding it. Hiding is the answer there.
   *
   * Added after a shop lost its shelves exactly this way: the component's own row drew no bin,
   * and the section's bin took the component with it. The UI is not the lock; this is.
   */
  | "COMPONENT_REQUIRED";

/**
 * The arrangements a site may open with.
 *
 * A closed list, like every vocabulary on this wire: a template is data the API holds, and the
 * form offers exactly the ones the API can seed. The first is the structure of the briefing a
 * transport company's landing page was planned from — services sold to businesses.
 */
export type PageTemplateId = "servicos-b2b";
