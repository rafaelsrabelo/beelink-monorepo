// React
import type { ReactNode } from "react"

// Types
import type {
  PublicAnnouncementLink,
  PublicBannerSlide,
  PublicComponent,
  PublicProductCategory,
  PublicSection,
} from "@harness-monorepo/contracts"

// UI
import type { LinkComponent } from "@harness-monorepo/ui/blocks/auth/auth-link"
import { StorefrontBandCell } from "@harness-monorepo/ui/blocks/storefront/storefront-band-cell"
import { StorefrontBandGrid } from "@harness-monorepo/ui/blocks/storefront/storefront-band-grid"
import { StorefrontSectionBand } from "@harness-monorepo/ui/blocks/storefront/storefront-section-band"
import {
  StorefrontShowcase,
  type StorefrontShowcaseItem,
} from "@harness-monorepo/ui/blocks/storefront/storefront-showcase"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import type { HomeBand } from "@/lib/storefront-data"
import type { StorefrontRoutes } from "@/lib/storefront-routes"
import { anchorsOf } from "./site-chrome"
import { StorefrontComponent, type LiveContact } from "./storefront-component"

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
   * A render prop and not a `draggable` flag, because these blocks are the shop window and must not
   * learn what dnd-kit is: the editor's chrome reaches them as a prop or not at all. It wraps what is
   * inside the cell, so the grip covers the block and the cell keeps the block's width.
   */
  renderBlock?: (component: PublicComponent, block: ReactNode) => ReactNode
  /**
   * Wraps each drawn band. Design mode uses it to make a band draggable where it stands, which
   * is a different gesture from editing what is inside it — so it is a different hook.
   */
  renderSection?: (section: PublicSection, band: ReactNode) => ReactNode
  /** What a contact form sends with. The shop window passes it; the preview does not, and sends nothing. */
  contact?: LiveContact | null
  messages: UiMessages
}

/**
 * A banner's pictures as cards, when it is drawn as cards: one picture, whatever its display, or any
 * number with `display: GRID`. Null for everything else, which `StorefrontComponent` draws — the
 * carousel among them.
 *
 * The shopkeeper's display decides carousel or grid, and the count never overrides it: the count
 * used to be the whole decision, so a second picture turned three posters meant for one row into a
 * carousel nobody asked for. A grid of one and a carousel of one are the same card.
 */
function cardsOf(component: PublicComponent): StorefrontShowcaseItem[] | null {
  if (component.kind !== "BANNER") return null

  const slides = component.items as PublicBannerSlide[]
  if (slides.length !== 1 && !(component.display === "GRID" && slides.length > 1)) return null

  return slides.map((slide, at) => ({
    // The first card keeps the component's id, as the one poster always did.
    id: at === 0 ? component.id : `${component.id}-${slide.id}`,
    title: slide.title ?? "",
    subtitle: slide.subtitle,
    imageUrl: slide.imageUrl,
    href: slide.href,
    external: slide.external,
  }))
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
  contact = null,
  messages,
}: StorefrontSectionsProps) {
  const link = linkComponent ? { linkComponent } : {}
  // A named band is an anchor, so a site's menu and the page agree on where "Serviços" is.
  const anchors = anchorsOf(sections)

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
            {...(anchors.has(section.id) ? { id: anchors.get(section.id)! } : {})}
            background={section.background}
            primary={primary}
            width={section.width}
          >
            {/*
              One cell per component, each taking its own slice of twelve columns. The posters used
              to be gathered into runs here, because the band was a column and a run was the only
              way two of them shared a row — and only two of the same shape, with one picture each.
              The grid does that for every kind now, a heading beside a banner included.
            */}
            <StorefrontBandGrid bleed={section.width === "FULL"}>
              {section.components
                .filter((component) => component.kind !== "ANNOUNCEMENT")
                .map((component) => {
                  const cards = cardsOf(component)
                  const body = cards ? (
                    <StorefrontShowcase items={cards} span={component.span} {...link} messages={messages} />
                  ) : (
                    <StorefrontComponent
                      component={component}
                      bands={bands}
                      categories={categories}
                      routes={routes}
                      showPrice={showPrice}
                      showBadge={showBadge}
                      {...link}
                      contact={contact}
                      messages={messages}
                    />
                  )

                  return (
                    <StorefrontBandCell key={component.id} span={component.span}>
                      {renderBlock ? renderBlock(component, body) : body}
                    </StorefrontBandCell>
                  )
                })}
            </StorefrontBandGrid>
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
): { left: string; right?: string; background: string | null; href: string | null; external: boolean } | null {
  const band = sections.find((section) => section.components.some((component) => component.kind === "ANNOUNCEMENT"))
  const strip = band?.components.find((component) => component.kind === "ANNOUNCEMENT")

  if (!band || !strip?.title) return null

  // Already resolved by the API, the way a slide's is. At most one.
  const link = strip.items[0] as PublicAnnouncementLink | undefined

  return {
    left: strip.title,
    ...(strip.subtitle ? { right: strip.subtitle } : {}),
    // The strip's colour is its band's: the one band not drawn where it sits still owns a colour.
    background: band.background,
    href: link?.href ?? null,
    external: link?.external ?? false,
  }
}
