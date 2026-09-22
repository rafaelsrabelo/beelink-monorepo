// React
import type { ReactNode } from "react"

// Types
import type { BenefitRow, CoverSlide, PublicProductCard, PublicSection } from "@harness-monorepo/contracts"

// UI
import { BenefitIcon } from "@harness-monorepo/ui/blocks/design/benefit-icons"
import type { LinkComponent } from "@harness-monorepo/ui/blocks/auth/auth-link"
import { StorefrontBand } from "@harness-monorepo/ui/blocks/storefront/storefront-band"
import { StorefrontBenefits } from "@harness-monorepo/ui/blocks/storefront/storefront-benefits"
import { StorefrontCover } from "@harness-monorepo/ui/blocks/storefront/storefront-cover"
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

/** Consecutive posters of the same shape become one row, which is what the showcase groups on. */
function isPoster(section: PublicSection): boolean {
  return section.kind === "BANNER"
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
    if (last && isPoster(section) && isPoster(last[0]!)) last.push(section)
    else groups.push([section])
  }

  return (
    <>
      {groups.map((group) => {
        const first = group[0]!

        if (isPoster(first)) {
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
          first.kind === "COVER" ? (
            <StorefrontCover
              slides={first.items as CoverSlide[]}
              width={first.width}
              {...link}
              messages={messages}
            />
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
