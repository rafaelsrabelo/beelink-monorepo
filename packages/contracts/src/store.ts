import type { PublicPageLink } from "./store-pages.js";
import type { PublicSection } from "./page.js";
import type { StorefrontRouteWords } from "./catalog.js";
import type { PageTemplateId } from "./page.js";

/**
 * How a shop sells — not what it sells. The storefront's wording follows it, and from phase 2 so
 * does the catalogue. A shop's vertical (supplements, fashion, groceries) is `StoreCategory`, a
 * seeded row: adding one there is a line of SQL, adding one here is a database migration. So a
 * value only belongs in this union when it changes the way the shop window behaves.
 *
 * One value today. The product sells online, end to end; the second mode that earns a value here
 * will be one that does not — a window that prices and hands the order to WhatsApp, say.
 */
/**
 * What a `Store` is for.
 *
 * `INSTITUTIONAL` is a site that presents, convinces and takes contact instead of selling: no
 * products, no orders, no categories — and leads where a shop has customers. It is a type of the
 * same row and not an entity of its own, because everything a site needs underneath (an owner, a
 * slug, colours with derived ink, sections of components, uploads, design mode) is what a shop
 * already has; a second entity would have to repeat every piece.
 */
export type StoreType = "ECOMMERCE" | "INSTITUTIONAL";

/**
 * The storefront template. It replaces the legacy `store_layouts` lookup table, whose three rows
 * nothing joined on and whose slugs the panel compared against string literals anyway.
 */
export type StoreLayoutType = "DEFAULT" | "BANNER";

/**
 * What the shop takes at the door. A label carried to the shopkeeper's WhatsApp, not a gateway —
 * this product settles no money. Orders reuse this union from phase 5.
 */
export type PaymentMethod = "MONEY" | "PIX" | "CREDIT_CARD" | "DEBIT_CARD";

/**
 * The shop's brand colours, each `#RRGGBB`. They are data, never tokens: the storefront sets them
 * as CSS custom properties on its root, so no component holds a literal colour.
 */
export interface StoreColors {
  /** The page. Every word written on it is derived from it — see `lib/contrast.ts`. */
  background: string;
  /** The brand: the buttons, the price badges, the arrows. Chosen, never derived. */
  primary: string;
  header: string;
  /**
   * The foot. It used to borrow the header's colour, and a shop that wanted a dark foot under a
   * coloured top had no way to say so.
   */
  footer: string;
}

/** Every handle the storefront links to. Absent means the link is not rendered. */
export interface StoreSocialNetworks {
  /** Digits only, country code included, no `+` or punctuation — `wa.me/<this>` is built from it. */
  whatsapp: string | null;
  /** A handle with no leading `@` and no URL. */
  instagram: string | null;
  /** A handle with no leading `@`. */
  tiktok: string | null;
  /** A full profile URL — Spotify has no handle the web can expand. */
  spotify: string | null;
  /** A handle with no leading `@`. */
  youtube: string | null;
}

/**
 * Where the shop is. It never reaches a visitor: it exists so the panel can show it back and so the
 * API can geocode it once, and the delivery radius of phase 4 measures from the coordinates.
 */
export interface StoreAddress {
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  /** The two-letter UF, upper case. */
  state: string | null;
  /** CEP as eight digits, no mask — the mask belongs to the field that accepts it. */
  zipCode: string | null;
}

/**
 * Presentation-only switches for the storefront. Every key is optional because rows carried over
 * from the legacy blob are partial; the web owns one defaults module that fills the gaps. The API
 * validates each key that is present and refuses one that is not declared here — which the legacy
 * blob, validated by nothing, could not do.
 *
 * The values stay lower case, unlike the unions above: these are JSON, not a database enum, and
 * keeping them verbatim makes the legacy import a key rename and nothing more.
 */
export interface StoreLayoutSettings {
  showBanner?: boolean;
  bannerType?: "single" | "carousel";
  /** Read only when `bannerType` is `"carousel"`; the single banner is `Store.bannerImageUrl`. */
  bannerImages?: string[];
  bannerHeight?: "small" | "medium" | "large" | "full";
  bannerRounded?: boolean;
  bannerPadding?: boolean;
  showStoreDescription?: boolean;
  showSocialLinks?: boolean;
  showContactInfo?: boolean;
  productsPerRow?: 2 | 3 | 4;
  cardLayout?: "grid" | "horizontal";
  showProductBadges?: boolean;
  showProductDescription?: boolean;
  showProductPrice?: boolean;
  showProductRating?: boolean;
  showProductStock?: boolean;
  showQuickAdd?: boolean;
  showFloatingCart?: boolean;
  cartPosition?: "bottom-right" | "bottom-left";
  categoryDisplay?: "tabs" | "filters" | "none";
  showCategoryIcons?: boolean;
}

/** The platform's own taxonomy of shops. Seeded by the platform; a shopkeeper picks one, never edits one. */
export interface StoreCategory {
  id: string;
  /** Stable across environments: the seed and the legacy import match on this, never on the id. */
  slug: string;
  name: string;
  description: string | null;
  /** A lucide icon name the web resolves — never a URL. */
  icon: string | null;
  /** `#RRGGBB`. Brand data like a shop's own colours, and equally not a token. */
  color: string | null;
}

/**
 * A palette the panel applies in one click — the six the legacy shop-settings screen offered,
 * carried over unchanged so a shop that picked one still matches it.
 *
 * It is platform data like a store category, never a design token: every value is a shop's own
 * brand colour, and the panel writes the four it resolves to onto the shop itself. That is why the
 * list is served by the API — a palette shipped as source would be twenty-four colour literals
 * inside the two trees the styling rule forbids them in.
 */
export interface StoreColorPreset {
  /**
   * Stable across environments and lower-case kebab, like a category slug: the panel marks the
   * preset whose four colours the form currently holds, so the key has to survive a redeploy.
   */
  id: string;
  /** Rendered as stored, like a category's name — data the API owns, not interface copy. */
  name: string;
  colors: StoreColors;
}

/**
 * What an anonymous visitor is served for `/<slug>`: everything the storefront renders and nothing
 * more. The owner, the registered address, the geocoded coordinates and the timestamps are absent
 * deliberately — the storefront renders none of them, the coordinates exist only so the API can
 * measure a delivery radius server-side, and a shop run from a home has a private address. This is
 * the shape the cached, indexable read path answers, so anything added here is added to every page
 * in Google's index.
 */
export interface PublicStore {
  id: string;
  slug: string;
  /**
   * The words this shop's own URLs are built from. It travels in the public shape because it is
   * what lets the storefront build every link it renders — `/<slug>/<routeWords.products>/<slug>`
   * — without a single component holding the literal `"produtos"`. That is the whole point of
   * `RouteVocabulary`: one column decides every address at once, where literals scattered through
   * components would move only where somebody remembered to move them.
   */
  routeWords: StorefrontRouteWords;
  name: string;
  /**
   * Plain text, at most **2000 characters** — the single stated bound. The API enforces it and
   * every form follows it; three places disagreeing (500 in one schema, 2000 in another, unbounded
   * in the legacy column) is what stopped a carried-over shop with a long description from saving.
   * The column is unbounded `text`, so the number is a product decision rather than a migration,
   * and lowering it would make a description a shop has already saved impossible to save again.
   */
  description: string | null;
  type: StoreType;
  logoUrl: string | null;
  /** The single banner, shown when `layoutType` is `"BANNER"`. */
  bannerImageUrl: string | null;
  layoutType: StoreLayoutType;
  colors: StoreColors;
  socialNetworks: StoreSocialNetworks;
  layoutSettings: StoreLayoutSettings;
  /** Never empty: the checkout has nothing to offer a customer otherwise. */
  paymentMethods: PaymentMethod[];
  /**
   * The bands the landing page is made of, in the shopkeeper's order, already resolved.
   *
   * They ride here and not on `StorefrontCatalog` because the home fetches the shop first and
   * unconditionally, so this costs no round trip — and because the catalogue is paged and
   * filtered: bands on it would be re-serialised into every `?pagina=` and `?categoria=` answer
   * Google indexes, including the one-product call the home makes purely for the category list.
   *
   * The cost, stated rather than hidden: they travel to the product, category and cart pages too,
   * which do not draw them. That is one field against a second serial fetch on the page most
   * visitors ever see.
   */
  sections: PublicSection[];
  /**
   * The published landings the shop links from its menu and footer. Absent on an answer cached
   * before pages existed, which linked none.
   */
  pages?: PublicPageLink[];
}

/** The shop as its owner edits it in the panel: the public shape plus what only the owner may see. */
export interface Store extends PublicStore {
  ownerId: string;
  /**
   * After how many days without a valid order a customer is inactive: 7 to 365, 60 unless the
   * shopkeeper changed it. Owner-only — how a shop sorts its customers is nobody else's business.
   */
  inactiveAfterDays: number;
  address: StoreAddress;
  /** Decimal degrees. Null until the address is complete enough for the API to geocode it. */
  latitude: number | null;
  longitude: number | null;
  category: StoreCategory | null;
  /** ISO-8601. */
  createdAt: string;
  /** ISO-8601. */
  updatedAt: string;
}

/** WhatsApp is required on the way in; the read shape allows null for shops carried over without one. */
export interface StoreSocialNetworksPayload {
  /** Required on a shop — an order has nowhere to go without it — and the API says so. A site may have none. */
  whatsapp?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
  spotify?: string | null;
  youtube?: string | null;
}

/** Any subset; what is sent replaces what is stored, and the API re-geocodes when it changes. */
export interface StoreAddressPayload {
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
}

export interface CreateStorePayload {
  name: string;
  /**
   * Lower case, `a-z`, `0-9` and single hyphens, 3 to 40 characters, already normalised by the
   * caller. It is unique across the platform and cannot be changed afterwards, so the API refuses
   * one that is taken and one that would shadow a route of the app itself, such as `admin`.
   */
  slug: string;
  type: StoreType;
  /**
   * The arrangement a site opens with. Read only when `type` is `INSTITUTIONAL`; a shop opens with
   * its own page. Absent picks the first template.
   */
  template?: PageTemplateId;
  /** At most 2000 characters — the bound is stated once, on `PublicStore.description`. */
  description?: string | null;
  logoUrl?: string | null;
  categoryId?: string | null;
  /** Omitted means the platform's default theme, not an empty object. */
  colors?: StoreColors;
  socialNetworks: StoreSocialNetworksPayload;
  address?: StoreAddressPayload;
}

/**
 * A full replacement of what the panel edits — PUT, not PATCH: the form posts every field, so an
 * omitted optional key clears it rather than leaving it. `slug` is absent because it cannot change,
 * and `latitude`/`longitude` are absent because the API geocodes the address itself; the legacy
 * panel asked the browser to call Nominatim and sent whatever came back.
 */
export interface UpdateStorePayload {
  name: string;
  type: StoreType;
  /** At most 2000 characters — the bound is stated once, on `PublicStore.description`. */
  description?: string | null;
  logoUrl?: string | null;
  bannerImageUrl?: string | null;
  categoryId?: string | null;
  layoutType: StoreLayoutType;
  colors: StoreColors;
  socialNetworks: StoreSocialNetworksPayload;
  address?: StoreAddressPayload;
  layoutSettings?: StoreLayoutSettings;
  /** At least one: a checkout with no payment method cannot complete an order. */
  paymentMethods: PaymentMethod[];
  /** 7 to 365. Absent keeps what is stored, so a client that does not know it cannot reset it. */
  inactiveAfterDays?: number;
}

/** The `errorCode` values the store endpoints answer, beyond the HTTP-status fallbacks (`BAD_REQUEST`, …). */
export type StoreErrorCode =
  | "STORE_NOT_FOUND"
  | "STORE_SLUG_TAKEN"
  | "STORE_SLUG_RESERVED"
  | "STORE_FORBIDDEN"
  | "STORE_CATEGORY_NOT_FOUND"
  /** A shop was sent without a WhatsApp. A site may go without; a shop cannot take an order. */
  | "STORE_WHATSAPP_REQUIRED";

/**
 * One option in the address box, as both apps have to agree it is.
 *
 * Everything but `label` is what the panel writes into the form when the shopkeeper picks it, and
 * every field can come back empty: a search provider answers with what it knows, and a suggestion
 * that names a street but no postcode is still a useful suggestion. The field merges rather than
 * assigns, exactly as the postcode lookup does.
 */
export interface AddressSuggestion {
  /** Stable for the life of one answer, for React keys and nothing else. */
  id: string;
  /** The whole address on one line, as the list shows it. */
  label: string;
  /** The street alone. The number is its own field, because the form has its own field for it. */
  street: string;
  /**
   * The house number the search matched, which is a starting point and not an answer: a shopkeeper
   * searching their street gets whichever number the provider knows, and theirs may be the one
   * next door. The form fills it and lets them correct it without editing the street.
   */
  number: string;
  neighborhood: string;
  city: string;
  /** The two-letter UF, upper case. */
  state: string;
  /** Digits only, no mask — the same normalisation the payload mapper applies. */
  zipCode: string;
  /**
   * Where the search says this is. Kept because the shop's coordinates are what delivery distance
   * is measured from, and a point that arrives with the address costs nothing to keep — where
   * geocoding the same address again later costs a call and may answer differently.
   */
  latitude: number;
  longitude: number;
}
