// Types
import type { StorefrontRouteWords, StorefrontSort } from "@harness-monorepo/contracts"

/**
 * The key a search term travels under on the shop's own URL.
 *
 * `q` and not the shop's word for it: `routeWords` spells the **path**, which is what a person
 * reads and what a printed card carries, and a query key is neither. `?q=` is also what search
 * boxes across the web use, so a link built by hand or pasted from elsewhere tends to work.
 */
export const SEARCH_KEY = "q"

/**
 * The page, on the shop's own URL.
 *
 * Portuguese, because the API's own query keys are (`categoria`, `busca`, `pagina`), and one
 * spelling on both sides is what keeps the mapping between them readable at a glance. It is **not**
 * a route word: switching a shop to EN moves `/produtos` to `/products` and leaves this alone. That
 * is a gap, and it is written here rather than left to be discovered.
 */
export const PAGE_KEY = "pagina"

/** The sign-in page's three faces, in the address: nothing is `entrar`. */
export type SignInMode = "entrar" | "criar" | "senha"
export const MODE_KEY = "modo"
/** Where a shopper goes once signed in: a path inside the shop, checked before it is followed. */
export const BACK_KEY = "voltar"

export function signInModeOf(raw: string | string[] | undefined): SignInMode {
  return raw === "criar" || raw === "senha" ? raw : "entrar"
}

/**
 * A return path the shop may follow: its own, and nothing else. Anything that is not a path under
 * `/<slug>` — another shop, another site, `//evil.example` — is the shop's front door instead, so
 * a link someone crafted cannot send a shopper off the shop after they sign in.
 */
export function safeBackOf(slug: string, raw: string | string[] | undefined | null): string {
  // A route's segment arrives decoded: `%2Fevil.example` is `/evil.example`, whose home would be
  // `//evil.example` — another site. A slug that is not one has no home to keep to.
  if (!/^[a-z0-9-]+$/.test(slug)) return "/"

  const home = `/${slug}`
  const value = typeof raw === "string" ? raw : ""

  return value === home || (value.startsWith(`${home}/`) && !value.includes("//") && !value.includes("\\")) ? value : home
}

/** Everything a URL needs to know about a shop, and nothing else — a page passes its store. */
export interface StorefrontShop {
  slug: string
  routeWords: StorefrontRouteWords
}

/**
 * What the second segment of a storefront URL turned out to mean.
 *
 * `category` is the fallback and not a case the words select, which is the whole shape of the
 * scheme: `/<shop>/<segment>` is a category **unless** the segment is a word the router already
 * means something by. The API refuses those words as category slugs (`RESERVED_PATH_SEGMENTS`), so
 * the two halves agree instead of relying on each other.
 */
export type StorefrontSection =
  | { kind: "catalog" }
  | { kind: "categories" }
  | { kind: "search" }
  | { kind: "cart" }
  | { kind: "signIn" }
  | { kind: "account" }
  | { kind: "category"; slug: string }

/**
 * What narrows and orders a shelf, as the address carries it and the API reads it — the same
 * Portuguese keys on both sides (`ordenar`, `precoMin`, `precoMax`, `desconto`, `opcao`), so the
 * mapping between them is readable at a glance. Prices are whole reais.
 */
export interface ListingFilters {
  sort?: StorefrontSort
  priceMin?: number
  priceMax?: number
  discount?: boolean
  /** On sale by at least this much, in whole percent; implies `discount`. */
  discountMinPercent?: number
  /** `Nome:Valor`, repeatable. Values of one option widen, different options narrow. */
  options?: readonly string[]
}

export interface CatalogueQuery extends ListingFilters {
  page?: number
  category?: string
  search?: string
}

const SORTS: readonly StorefrontSort[] = ["relevancia", "menor-preco", "maior-preco", "novidades", "maior-desconto"]

/** The address's version of the filters: what the API will read, or nothing for what it would refuse. */
function filterEntries(filters: ListingFilters): Record<string, string | number | readonly string[] | undefined> {
  return {
    ordenar: filters.sort === "relevancia" ? undefined : filters.sort,
    precoMin: filters.priceMin,
    precoMax: filters.priceMax,
    desconto: filters.discountMinPercent ? String(filters.discountMinPercent) : filters.discount ? "1" : undefined,
    opcao: filters.options,
  }
}

/**
 * Drops the empty and the first page, so `/lessari/produtos` never renders as `?pagina=1`. A list
 * is appended entry by entry: `opcao` repeats, and `set` would keep only the last one.
 */
function withQuery(path: string, entries: Record<string, string | number | readonly string[] | undefined>): string {
  const query = new URLSearchParams()

  for (const [key, value] of Object.entries(entries)) {
    if (value === undefined || value === "") continue
    if (Array.isArray(value)) {
      for (const each of value as readonly string[]) if (each) query.append(key, each)
      continue
    }
    if (key === PAGE_KEY && Number(value) <= 1) continue
    query.set(key, String(value))
  }

  return query.size ? `${path}?${query.toString()}` : path
}

/** A whole number of reais from what someone typed or pasted, or nothing. Never a 400 from the API. */
function reaisOf(raw: string | string[] | undefined, round: (value: number) => number): number | undefined {
  const value = Number(paramOf(raw)?.replace(",", "."))
  return Number.isFinite(value) && value >= 0 ? round(value) : undefined
}

/** `desconto=1` is any discount; a whole number above one is the least cut, in percent. */
function discountOf(raw: string | undefined): Pick<ListingFilters, "discount" | "discountMinPercent"> {
  const value = Number(raw)
  if (!Number.isInteger(value) || value < 1) return {}
  return value === 1 ? { discount: true } : { discount: true, discountMinPercent: value }
}

/**
 * The filters an address carries, read the way the API would read them, so nothing reaches it
 * that it refuses: a sort it does not know is the shop's own order, a price is a whole number of
 * reais (the floor of a minimum, the ceiling of a maximum, the two swapped when someone crossed
 * them), and an option without a colon is dropped.
 */
export function listingFiltersOf(query: Record<string, string | string[] | undefined>): ListingFilters {
  const sort = paramOf(query.ordenar)
  let priceMin = reaisOf(query.precoMin, Math.floor)
  let priceMax = reaisOf(query.precoMax, Math.ceil)
  if (priceMin !== undefined && priceMax !== undefined && priceMin > priceMax) [priceMin, priceMax] = [priceMax, priceMin]
  const options = [query.opcao ?? []].flat().map((entry) => entry.trim()).filter((entry) => entry.includes(":"))

  return {
    // The shop's own order is the absence of a sort, on the address as in the API.
    ...(sort && sort !== "relevancia" && (SORTS as readonly string[]).includes(sort) ? { sort: sort as StorefrontSort } : {}),
    ...(priceMin !== undefined ? { priceMin } : {}),
    ...(priceMax !== undefined ? { priceMax } : {}),
    ...discountOf(paramOf(query.desconto)),
    ...(options.length ? { options } : {}),
  }
}

/** The same filters with one option value on or off: what a checkbox in the filter column links to. */
export function toggledOption(filters: ListingFilters, option: string): ListingFilters {
  const current = filters.options ?? []
  const options = current.includes(option) ? current.filter((entry) => entry !== option) : [...current, option]
  return { ...filters, ...(options.length ? { options } : { options: undefined }) }
}

/**
 * Every address the shop window renders, built from the shop's own words.
 *
 * This file is the only place in `apps/web` that may spell a storefront segment. That is what
 * `Store.routeVocabulary` buys: one column decides every link at once, where literals scattered
 * through components move only where somebody remembers to move them — and the day a shop switches
 * to EN, a forgotten `"produtos"` is a dead link on a page nobody opened while testing.
 */
export function storefrontRoutes(shop: StorefrontShop) {
  const { slug, routeWords } = shop
  const home = `/${slug}`

  return {
    home,

    /**
     * The whole catalogue, in a grid. The home shows a selection and links here. Every filter is
     * carried along; a new filter starts on the first page, which is why the page is the caller's
     * and never remembered here.
     */
    catalog: ({ page, category, search, ...filters }: CatalogueQuery = {}) =>
      withQuery(`${home}/${routeWords.products}`, {
        [PAGE_KEY]: page,
        categoria: category,
        [SEARCH_KEY]: search,
        ...filterEntries(filters),
      }),

    /** The index of every category. A single category has no word in front of it. */
    categories: () => `${home}/${routeWords.categories}`,

    /** One category, at the flat second segment: `/lessari/blusas`. */
    category: (categorySlug: string, { page, ...filters }: ListingFilters & { page?: number } = {}) =>
      withQuery(`${home}/${categorySlug}`, { [PAGE_KEY]: page, ...filterEntries(filters) }),

    /**
     * Where the header's search box posts. The term is the caller's; an empty one is dropped. A
     * category narrows the search — the header's "Buscar em" — and travels as `categoria`.
     */
    search: (term?: string, { page, category, ...filters }: ListingFilters & { page?: number; category?: string } = {}) =>
      withQuery(`${home}/${routeWords.search}`, {
        [SEARCH_KEY]: term,
        categoria: category,
        [PAGE_KEY]: page,
        ...filterEntries(filters),
      }),

    /** The basket, which the header's icon points at from the first day. */
    cart: () => `${home}/${routeWords.cart}`,

    /**
     * Where a shopper signs in — or, by `mode`, signs up (`criar`) or asks for a new password
     * (`senha`). `back` is where they return to afterwards, a path inside this shop.
     */
    signIn: ({ mode, back }: { mode?: SignInMode; back?: string } = {}) =>
      withQuery(`${home}/${routeWords.signIn}`, { [MODE_KEY]: mode === "entrar" ? undefined : mode, [BACK_KEY]: back }),

    /** The shopper's own page at this shop: their name, phone and address as the shop keeps them. */
    account: () => `${home}/${routeWords.account}`,

    /** One product. It never nests under a category: a product in two would have two addresses. */
    product: (productSlug: string) => `${home}/${routeWords.products}/${productSlug}`,
  }
}

export type StorefrontRoutes = ReturnType<typeof storefrontRoutes>

/**
 * What a second segment means to this shop.
 *
 * The order is the contract. A route word wins over a category of the same name, which is why the
 * API refuses those slugs on the way in — the check here would otherwise be the only thing standing
 * between a shopkeeper and a category they can save but never open.
 *
 * It does not resolve another vocabulary's words. The web is handed this shop's `routeWords` and no
 * table of the rest, so `/lessari/products` on a PT_BR shop falls through to `category` and 404s at
 * the lookup. That costs nothing today — no panel screen can change a shop's vocabulary, so no shop
 * has an old word for a link to hold — and the day one can, the redirect the schema promises needs
 * the alias table to travel with `routeWords`. This comment is where that starts.
 */
export function sectionOf(segment: string, routeWords: StorefrontRouteWords): StorefrontSection {
  if (segment === routeWords.products) return { kind: "catalog" }
  if (segment === routeWords.categories) return { kind: "categories" }
  if (segment === routeWords.search) return { kind: "search" }
  if (segment === routeWords.cart) return { kind: "cart" }
  if (segment === routeWords.signIn) return { kind: "signIn" }
  if (segment === routeWords.account) return { kind: "account" }

  return { kind: "category", slug: segment }
}

/**
 * The page asked for, as a number a query can be built from.
 *
 * Anything that is not a whole number above zero is the first page rather than an error: this is the
 * indexed read path, and a crawler following a hand-edited `?pagina=abc` should land on the shop.
 */
export function pageOf(raw: string | string[] | undefined): number {
  const value = typeof raw === "string" ? Number.parseInt(raw, 10) : Number.NaN

  return Number.isInteger(value) && value > 0 ? value : 1
}

/** A query parameter as a page reads it: a single string, or nothing at all. */
export function paramOf(raw: string | string[] | undefined): string | undefined {
  const value = typeof raw === "string" ? raw.trim() : ""

  return value === "" ? undefined : value
}
