// React
import type { ReactNode } from "react"

// Types
import type { BenefitRow, PublicProductCategory, PublicSection } from "@harness-monorepo/contracts"

// UI
import { BenefitIcon } from "@harness-monorepo/ui/blocks/design/benefit-icons"
import type { LinkComponent } from "@harness-monorepo/ui/blocks/auth/auth-link"
import { StorefrontBand } from "@harness-monorepo/ui/blocks/storefront/storefront-band"
import { StorefrontBenefits } from "@harness-monorepo/ui/blocks/storefront/storefront-benefits"
import { StorefrontCategoryGrid } from "@harness-monorepo/ui/blocks/storefront/storefront-category-grid"
import { StorefrontHero } from "@harness-monorepo/ui/blocks/storefront/storefront-hero"
import { StorefrontHeading } from "@harness-monorepo/ui/blocks/storefront/storefront-heading"
import { StorefrontProductRail } from "@harness-monorepo/ui/blocks/storefront/storefront-product-rail"
import { StorefrontShowcase } from "@harness-monorepo/ui/blocks/storefront/storefront-showcase"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import type { HomeBand } from "@/lib/storefront-data"
import type { StorefrontRoutes } from "@/lib/storefront-routes"

export interface StorefrontSectionsProps {
  /**
   * Optional, and that is not defensive habit — it is a cache.
   *
   * `shopAt` serves this page from a tagged, revalidating cache, so the day the wire shape changes
   * a shop keeps serving the old one until its window closes or something invalidates the tag.
   * Measured: after the rename from `banners` to `sections`, one shop threw "sections is not
   * iterable" on its landing page while its neighbour rendered. On an anonymous page a crawler
   * reads, a band that is briefly missing is a far smaller wrong than a 500.
   */
  sections?: readonly PublicSection[]
  /** The product rails, already loaded. A PRODUCTS block draws these and nothing else. */
  bands: readonly HomeBand[]
  /** Every category the shop has. A CATEGORIES block draws these; nothing else reads them. */
  categories: readonly PublicProductCategory[]
  routes: StorefrontRoutes
  showPrice: boolean
  showBadge: boolean
  linkComponent?: LinkComponent
  /**
   * Wraps each drawn block. Design mode uses it to put a grip on one; the shop passes nothing.
   *
   * A render prop and not a `draggable` flag, for the reason `StorefrontShowcase` states: these
   * blocks are the shop window, and the editor's chrome reaches them as a prop or not at all.
   */
  renderBlock?: (section: PublicSection, block: ReactNode) => ReactNode
  messages: UiMessages
}

/**
 * The kinds that come in runs, and what a run of each means.
 *
 * Consecutive posters become one row of the showcase, which is what decides their columns — three
 * `THIRDS` handed over one at a time would be three full-width rows, and "um terço" would mean
 * nothing. Consecutive heroes become one carousel, which is the whole of how a carousel is made:
 * there is no switch, only a count.
 */
function runOf(section: PublicSection): "BANNER" | "HERO" | null {
  return section.kind === "BANNER" || section.kind === "HERO" ? section.kind : null
}

/**
 * The landing page, drawn from the blocks the shopkeeper arranged.
 *
 * One function, used by the shop window and by design mode's preview — which is the whole reason
 * the preview can be trusted. Two renderers would drift the day someone fixed a spacing bug in
 * one of them, and the owner would be arranging a page that does not exist.
 *
 * Hidden blocks never reach here: the API filters them out of `PublicStore.sections`, and design
 * mode filters its draft the same way, so neither has to remember.
 */
export function StorefrontSections({
  sections = [],
  bands,
  categories,
  routes,
  showPrice,
  showBadge,
  linkComponent,
  renderBlock,
  messages,
}: StorefrontSectionsProps) {
  const link = linkComponent ? { linkComponent } : {}

  /**
   * Runs of consecutive posters, kept together.
   *
   * The showcase decides a row's columns from the shapes in it, so three `THIRDS` in a row are one
   * row of three. Handing it one poster at a time would give three rows of one, each as wide as
   * the page — which is not what "um terço" means.
   */
  const groups: PublicSection[][] = []
  for (const section of sections) {
    const last = groups.at(-1)
    const run = runOf(section)

    if (last && run && run === runOf(last[0]!)) last.push(section)
    else groups.push([section])
  }

  return (
    <>
      {groups.map((group) => {
        const first = group[0]!

        if (runOf(first) === "BANNER") {
          const items = group.map((section) => ({
            id: section.id,
            title: section.title ?? "",
            subtitle: section.subtitle,
            imageUrl: section.imageUrl ?? "",
            href: section.href,
            external: section.external,
            layout: section.layout,
          }))

          return (
            <StorefrontBand key={first.id}>
              <StorefrontShowcase
                items={items}
                {...link}
                {...(renderBlock
                  ? {
                      renderItem: (item: { id: string }, card: ReactNode) => {
                        const section = group.find((candidate) => candidate.id === item.id)
                        return section ? renderBlock(section, card) : card
                      },
                    }
                  : {})}
              />
            </StorefrontBand>
          )
        }

        const body =
          first.kind === "HERO" ? (
            // One is a cover, more than one is a carousel — the group is the answer.
            <StorefrontHero
              items={group.map((section) => ({
                id: section.id,
                imageUrl: section.imageUrl ?? "",
                title: section.title,
                subtitle: section.subtitle,
                href: section.href,
                external: section.external,
              }))}
              width={first.width}
              {...link}
              messages={messages}
            />
          ) : first.kind === "CATEGORIES" ? (
            <StorefrontBand className="flex flex-col gap-4">
              {first.title ? <StorefrontHeading title={first.title} subtitle={first.subtitle} /> : null}
              <StorefrontCategoryGrid
                categories={categories.map((category) => ({
                  id: category.id,
                  slug: category.slug,
                  name: category.name,
                  imageUrl: category.imageUrl,
                  description: category.description,
                  productCount: category.productCount,
                }))}
                href={routes.category}
                catalogHref={routes.catalog()}
                locale="pt-BR"
                {...link}
                messages={messages}
              />
            </StorefrontBand>
          ) : first.kind === "BENEFITS" ? (
            <StorefrontBenefits
              items={(first.items as BenefitRow[]).map((row) => ({
                id: row.id,
                title: row.title,
                detail: row.detail,
                // The name is turned back into a glyph here and not in the block: a design system
                // that knew "qr-code" means PIX would be a design system that knows what PIX is.
                icon: <BenefitIcon name={row.icon} />,
              }))}
            />
          ) : first.kind === "TEXT" ? (
            <StorefrontBand>
              <StorefrontHeading title={first.title} subtitle={first.subtitle} />
            </StorefrontBand>
          ) : (
            <StorefrontBand className="flex flex-col gap-8">
              {bands.map((band) => (
                <StorefrontProductRail
                  key={band.kind === "all" ? "all" : band.category.id}
                  products={band.products}
                  productHref={routes.product}
                  // The shopkeeper's own word for their shelf, falling back to the platform's. A
                  // category band keeps the category's name: renaming that is renaming the
                  // category, everywhere it appears.
                  title={
                    band.kind === "all"
                      ? (first.title ?? messages.storefront.catalogTitle)
                      : band.category.name
                  }
                  {...(band.kind === "category" && band.category.description
                    ? { label: band.category.description }
                    : {})}
                  seeAllHref={
                    band.kind === "all" ? routes.catalog() : routes.category(band.category.slug)
                  }
                  locale="pt-BR"
                  showPrice={showPrice}
                  showBadge={showBadge}
                  {...link}
                  messages={messages}
                />
              ))}
            </StorefrontBand>
          )

        return <div key={first.id}>{renderBlock ? renderBlock(first, body) : body}</div>
      })}
    </>
  )
}
