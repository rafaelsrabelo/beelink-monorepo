// Next
import { notFound } from "next/navigation"
import type { Metadata } from "next"

// Types
import type { PublicProductCategory, PublicStore, StorefrontCatalog } from "@harness-monorepo/contracts"

// UI
import { StorefrontCatalog as StorefrontCatalogGrid } from "@harness-monorepo/ui/blocks/storefront/storefront-catalog"
import { StorefrontCategoryGrid } from "@harness-monorepo/ui/blocks/storefront/storefront-category-grid"
import { StorefrontPagination } from "@harness-monorepo/ui/blocks/storefront/storefront-pagination"
import { StorefrontSearch } from "@harness-monorepo/ui/blocks/storefront/storefront-search"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { StorefrontFrame } from "@/components/storefront/storefront-frame"
import { getMessages } from "@/lib/locale"
import { catalogueAt, pageCountOf, shopAt } from "@/lib/storefront-data"
import {
  PAGE_KEY,
  SEARCH_KEY,
  pageOf,
  paramOf,
  sectionOf,
  storefrontRoutes,
  type StorefrontSection as Section,
} from "@/lib/storefront-routes"

/**
 * The second segment of a shop's URL, whatever it turned out to mean.
 *
 * One dynamic segment and not four static folders, because the words are the shopkeeper's: a
 * PT_BR shop answers at `/lessari/produtos` and an EN one at `/lessari/products`, and Next's router
 * takes its folder names from the repository rather than from a column. So the segment arrives raw
 * and `sectionOf` decides — a route word first, a category only if it is none of them.
 *
 * That order is the contract, and the API keeps its half: it refuses `produtos` and `categorias` as
 * category slugs, so a shopkeeper cannot save a category this page would never be able to open.
 */

interface Loaded {
  store: PublicStore
  section: Section
  catalogue: StorefrontCatalog
  category: PublicProductCategory | null
  messages: UiMessages
  page: number
  term: string | undefined
}

type Query = Record<string, string | string[] | undefined>

/**
 * Everything the page needs, in one pass, so `generateMetadata` and the body agree about what the
 * segment meant — two resolutions of the same URL are two chances to disagree.
 */
async function load(slug: string, segment: string, query: Query): Promise<Loaded | null> {
  const store = await shopAt(slug)

  if (!store) return null

  const section = sectionOf(segment, store.routeWords)
  const page = pageOf(query[PAGE_KEY])
  const term = paramOf(query[SEARCH_KEY])

  const [{ ui }, catalogue] = await Promise.all([
    getMessages(),
    catalogueAt(slug, {
      page,
      ...(section.kind === "category" ? { category: section.slug } : {}),
      ...(section.kind === "search" ? { search: term } : {}),
      // Neither the index of categories nor the basket renders a product, and the catalogue
      // endpoint answers both halves together. Asking for the smallest page is what keeps that one
      // round trip from also carrying two dozen products nothing on the page will show.
      ...(section.kind === "categories" || section.kind === "cart" ? { pageSize: 1 } : {}),
    }),
  ])

  // A category is real only if the shop has it. The catalogue answers with every category the shop
  // has, so the check costs nothing extra — and without it `/lessari/qualquer-coisa` would render
  // as an empty category rather than as the page that does not exist.
  const category =
    section.kind === "category"
      ? (catalogue.categories.find((entry) => entry.slug === section.slug) ?? null)
      : null

  if (section.kind === "category" && !category) return null

  return { store, section, catalogue, category, messages: ui, page, term }
}

/** The page's own title, which is also its `h1`. */
function headingOf({ section, category, messages }: Loaded): string {
  const text = messages.storefront

  switch (section.kind) {
    case "catalog":
      return text.catalogTitle
    case "categories":
      return text.categoriesTitle
    case "search":
      return text.searchHeading
    case "cart":
      return text.cart
    case "category":
      return category?.name ?? text.catalogTitle
  }
}

/** The line under the title: how many, or what was searched for and found nothing. */
function subtitleOf({ section, catalogue, messages, term }: Loaded, locale: string): string | undefined {
  const text = messages.storefront
  const count = new Intl.NumberFormat(locale).format(catalogue.total)

  if (section.kind === "categories" || section.kind === "cart") return undefined

  if (section.kind === "search") {
    if (!term) return undefined
    if (!catalogue.total) return format(text.searchEmpty, { term })

    const template = catalogue.total === 1 ? text.searchResultsOne : text.searchResults

    return format(template, { count, term })
  }

  return catalogue.total === 1 ? text.productCountOne : format(text.productCount, { count })
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/[slug]/[section]">): Promise<Metadata> {
  const { slug, section } = await params
  const loaded = await load(slug, section, await searchParams)

  if (!loaded) return {}

  const heading = headingOf(loaded)
  const routes = storefrontRoutes(loaded.store)

  // The canonical is the unpaged, untermed address of this section. A shop's twelfth page of
  // products and its search for "croche" are the same shelf reached two ways, and pointing them all
  // at one address is what stops Google from treating each as a page of its own thin content.
  const canonical =
    loaded.section.kind === "category" && loaded.category
      ? routes.category(loaded.category.slug)
      : loaded.section.kind === "categories"
        ? routes.categories()
        : loaded.section.kind === "search"
          ? routes.search()
          : loaded.section.kind === "cart"
            ? routes.cart()
            : routes.catalog()

  return {
    title: `${heading} · ${loaded.store.name}`,
    description: loaded.store.description ?? undefined,
    alternates: { canonical },
    // A paged or searched shelf is not a landing page; it is the same shelf, reached differently.
    robots:
      loaded.page > 1 || loaded.term || loaded.section.kind === "cart"
        ? { index: false, follow: true }
        : undefined,
  }
}

export default async function StorefrontSectionPage({
  params,
  searchParams,
}: PageProps<"/[slug]/[section]">) {
  const { slug, section } = await params
  const loaded = await load(slug, section, await searchParams)

  if (!loaded) notFound()

  const { store, catalogue, category, messages: ui, page, term } = loaded
  const routes = storefrontRoutes(store)
  const layout = store.layoutSettings
  const locale = "pt-BR"

  const heading = headingOf(loaded)
  const subtitle = subtitleOf(loaded, locale)
  const pageCount = pageCountOf(catalogue.total, catalogue.pageSize)

  // Where this shelf's pager sends you. Each section pages on its own address, so the number in the
  // URL always belongs to the list that is on the screen.
  const pageHref = (next: number) => {
    if (loaded.section.kind === "category" && category) return routes.category(category.slug, { page: next })
    if (loaded.section.kind === "search") return routes.search(term, { page: next })

    return routes.catalog({ page: next })
  }

  return (
    <StorefrontFrame
      store={store}
      categories={catalogue.categories}
      activeCategory={category?.slug ?? null}
      searchValue={term}
      showHighlights={loaded.section.kind !== "cart"}
      year={new Date().getFullYear()}
      messages={ui}
    >
      {/*
        The page's own `h1`, written here rather than taken from StorefrontSection: that block is a
        band *of* a page and refuses level 1 on purpose, so a page that is nothing but one shelf has
        to say what it is itself. Without this the catalogue, the categories and the search would
        each be a page with no heading at all — the shop's name in band 5 belongs to the home.
      */}
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{heading}</h1>
        {subtitle ? <p className="text-sm opacity-70">{subtitle}</p> : null}
      </header>

      {loaded.section.kind === "cart" ? (
        /*
          The basket has an address before it has a line in it, which is the point: the header
          carries its icon on every page, and an icon that goes nowhere teaches a visitor that the
          rest of the shop is a mock-up too. Until something can add to it, this is an empty state
          and a way back to the shelf — not a placeholder pretending to be a checkout.
        */
        <section className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="font-medium">{ui.storefront.cartEmpty}</p>
          <p className="text-sm opacity-70">{ui.storefront.cartEmptyHint}</p>
          {/* A plain anchor, like every other link in the shop window: `typedRoutes` types
              `next/link` against the routes it generated, and these addresses are built at runtime
              from the shopkeeper's own words — there is no literal for it to have seen. */}
          <a
            href={routes.catalog()}
            className="mt-2 rounded-xl px-4 py-2 text-sm font-medium"
            style={{ backgroundColor: "var(--shop-primary)", color: "var(--shop-background)" }}
          >
            {ui.storefront.catalogTitle}
          </a>
        </section>
      ) : loaded.section.kind === "categories" ? (
        <StorefrontCategoryGrid
          categories={catalogue.categories}
          href={routes.category}
          catalogHref={routes.catalog()}
          locale={locale}
          messages={ui}
        />
      ) : (
        <div className="flex flex-col gap-6">
            {/*
              The search page carries the field again, and this is the one place it may take the
              caret: someone who landed here came to type. The header's copy never does.
            */}
            {loaded.section.kind === "search" ? (
              <StorefrontSearch action={routes.search()} value={term} autoFocus messages={ui} />
            ) : null}

            <StorefrontCatalogGrid
              products={catalogue.products}
              productHref={routes.product}
              clearHref={loaded.section.kind === "catalog" ? undefined : routes.catalog()}
              locale={locale}
              productsPerRow={layout.productsPerRow ?? 3}
              showPrice={layout.showProductPrice ?? true}
              showBadge={layout.showProductBadges ?? true}
              messages={ui}
            >
              <StorefrontPagination page={page} pageCount={pageCount} href={pageHref} messages={ui} />
            </StorefrontCatalogGrid>
        </div>
      )}
    </StorefrontFrame>
  )
}
