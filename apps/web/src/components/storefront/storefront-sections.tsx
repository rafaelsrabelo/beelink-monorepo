// React
import type { ReactNode } from "react"

// Types
import type {
  BenefitRow,
  PublicBannerSlide,
  PublicComponent,
  PublicProductCategory,
  PublicSection,
} from "@harness-monorepo/contracts"

// UI
import { BenefitIcon } from "@harness-monorepo/ui/blocks/design/benefit-icons"
import type { LinkComponent } from "@harness-monorepo/ui/blocks/auth/auth-link"
import { StorefrontBenefits } from "@harness-monorepo/ui/blocks/storefront/storefront-benefits"
import { StorefrontCategoryGrid } from "@harness-monorepo/ui/blocks/storefront/storefront-category-grid"
import { StorefrontHero } from "@harness-monorepo/ui/blocks/storefront/storefront-hero"
import { StorefrontHeading } from "@harness-monorepo/ui/blocks/storefront/storefront-heading"
import { StorefrontProductRail } from "@harness-monorepo/ui/blocks/storefront/storefront-product-rail"
import { StorefrontSectionBand } from "@harness-monorepo/ui/blocks/storefront/storefront-section-band"
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
  /** The shop's own colour, so a band with a dark background can keep it readable. */
  primary: string
  /** The product rails, already loaded. A PRODUCTS component draws these and nothing else. */
  bands: readonly HomeBand[]
  /** Every category the shop has. A CATEGORIES component draws these; nothing else reads them. */
  categories: readonly PublicProductCategory[]
  routes: StorefrontRoutes
  showPrice: boolean
  showBadge: boolean
  linkComponent?: LinkComponent
  /**
   * Wraps each drawn component. Design mode uses it to put a grip on one; the shop passes nothing.
   *
   * A render prop and not a `draggable` flag, for the reason `StorefrontShowcase` states: these
   * blocks are the shop window, and the editor's chrome reaches them as a prop or not at all.
   */
  renderBlock?: (component: PublicComponent, block: ReactNode) => ReactNode
  /**
   * Wraps each drawn band. Design mode uses it to make a band draggable where it stands, which
   * is a different gesture from editing what is inside it — so it is a different hook.
   */
  renderSection?: (section: PublicSection, band: ReactNode) => ReactNode
  messages: UiMessages
}

/** A poster: one picture, drawn in a row with its neighbours. Two or more make it a carousel. */
function isPoster(component: PublicComponent): boolean {
  return component.kind === "BANNER" && component.items.length === 1
}

/**
 * The components of one band, with the posters that sit together kept together.
 *
 * A run of posters is one showcase row, and the row is what decides their columns: three `THIRDS`
 * handed over one at a time would be three full-width rows, and "um terço" would mean nothing.
 *
 * The run cannot cross a band any more, which is the level earning its keep — it used to be found
 * across the whole page, so a heading dropped between two posters silently split their row and
 * nothing said why.
 */
function runsOf(section: PublicSection): PublicComponent[][] {
  const runs: PublicComponent[][] = []

  for (const component of section.components) {
    const last = runs.at(-1)

    if (last && isPoster(component) && isPoster(last[0]!)) last.push(component)
    else runs.push([component])
  }

  return runs
}

/**
 * The landing page, drawn from the bands the shopkeeper arranged.
 *
 * One function, used by the shop window and by design mode's preview — which is the whole reason
 * the preview can be trusted. Two renderers would drift the day someone fixed a spacing bug in
 * one of them, and the owner would be arranging a page that does not exist.
 *
 * Hidden bands and hidden components never reach here: the API drops them out of
 * `PublicStore.sections`, and design mode filters its draft the same way, so neither has to
 * remember.
 */
export function StorefrontSections({
  sections = [],
  primary,
  bands,
  categories,
  routes,
  showPrice,
  showBadge,
  linkComponent,
  renderBlock,
  renderSection,
  messages,
}: StorefrontSectionsProps) {
  const link = linkComponent ? { linkComponent } : {}

  function draw(component: PublicComponent): ReactNode {
    if (component.kind === "BANNER") {
      // One picture is a poster; several are a carousel. The count is the whole of that decision —
      // making a carousel used to mean creating two banners and hoping they stayed adjacent.
      return (
        <StorefrontHero
          items={(component.items as PublicBannerSlide[]).map((slide) => ({
            id: slide.id,
            imageUrl: slide.imageUrl,
            title: slide.title,
            subtitle: slide.subtitle,
            href: slide.href,
            external: slide.external,
          }))}
          // The band owns the measure now, so a hero never adds its own: doing both would inset a
          // cover inside a band that is already inset.
          width="FULL"
          {...link}
          messages={messages}
        />
      )
    }

    if (component.kind === "CATEGORIES") {
      return (
        <div className="flex flex-col gap-4">
          {component.title ? (
            <StorefrontHeading title={component.title} subtitle={component.subtitle} />
          ) : null}
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
            {...(component.columns ? { columns: component.columns } : {})}
            {...link}
            messages={messages}
          />
        </div>
      )
    }

    if (component.kind === "BENEFITS") {
      return (
        <StorefrontBenefits
          items={(component.items as BenefitRow[]).map((row) => ({
            id: row.id,
            title: row.title,
            detail: row.detail,
            // The name is turned back into a glyph here and not in the block: a design system that
            // knew "qr-code" means PIX would be a design system that knows what PIX is.
            icon: <BenefitIcon name={row.icon} />,
          }))}
        />
      )
    }

    if (component.kind === "HEADING") {
      return <StorefrontHeading title={component.title} subtitle={component.subtitle} />
    }

    if (component.kind === "TEXT") {
      // `whitespace-pre-line`, because a shopkeeper's paragraph breaks are the only formatting this
      // field has. Rendering it as one run would silently join what they typed as two.
      return <p className="max-w-[70ch] text-base whitespace-pre-line opacity-90">{component.body}</p>
    }

    return (
      <div className="flex flex-col gap-8">
        {bands.map((band) => (
          <StorefrontProductRail
            key={band.kind === "all" ? "all" : band.category.id}
            products={band.products}
            productHref={routes.product}
            // The shopkeeper's own word for their shelf, falling back to the platform's. A category
            // band keeps the category's name: renaming that is renaming the category, everywhere it
            // appears.
            title={
              band.kind === "all"
                ? (component.title ?? messages.storefront.catalogTitle)
                : band.category.name
            }
            {...(band.kind === "category" && band.category.description
              ? { label: band.category.description }
              : {})}
            seeAllHref={band.kind === "all" ? routes.catalog() : routes.category(band.category.slug)}
            locale="pt-BR"
            showPrice={showPrice}
            showBadge={showBadge}
            {...link}
            messages={messages}
          />
        ))}
      </div>
    )
  }

  return (
    <>
      {sections
        // The strip is drawn above the header by the window, so it is not one of the bands in the
        // order — see `announcementOf`. Leaving it here would draw it twice.
        .filter((section) => !section.components.every((component) => component.kind === "ANNOUNCEMENT"))
        .map((section) => {
          const band = (
          <StorefrontSectionBand
            key={section.id}
            background={section.background}
            primary={primary}
            width={section.width}
          >
            {runsOf(section)
              .filter((run) => run[0]!.kind !== "ANNOUNCEMENT")
              .map((run) => {
                const first = run[0]!

                if (isPoster(first)) {
                  const items = run.map((component) => {
                    const slide = component.items[0] as PublicBannerSlide

                    return {
                      id: component.id,
                      title: slide.title ?? "",
                      subtitle: slide.subtitle,
                      imageUrl: slide.imageUrl,
                      href: slide.href,
                      external: slide.external,
                      layout: component.layout,
                    }
                  })

                  return (
                    <StorefrontShowcase
                      key={run.map((component) => component.id).join("+")}
                      items={items}
                      {...link}
                      {...(renderBlock
                        ? {
                            renderItem: (item: { id: string }, card: ReactNode) => {
                              const component = run.find((candidate) => candidate.id === item.id)
                              return component ? renderBlock(component, card) : card
                            },
                          }
                        : {})}
                    />
                  )
                }

                const body = draw(first)

                return <div key={first.id}>{renderBlock ? renderBlock(first, body) : body}</div>
              })}
          </StorefrontSectionBand>
          )

          return renderSection ? (
            <div key={section.id}>{renderSection(section, band)}</div>
          ) : (
            band
          )
        })}
    </>
  )
}

/**
 * The strip above the header, if the shop has one.
 *
 * Read out of the same arrangement as every other component, because that is where a shopkeeper
 * writes and hides it — but drawn by the window rather than among the bands, because it sits above
 * the masthead and "before the header" is not a position the arrangement can hold.
 */
export function announcementOf(
  sections: readonly PublicSection[] = [],
): { left: string; right?: string } | null {
  const strip = sections
    .flatMap((section) => section.components)
    .find((component) => component.kind === "ANNOUNCEMENT")

  if (!strip?.title) return null

  return strip.subtitle ? { left: strip.title, right: strip.subtitle } : { left: strip.title }
}
