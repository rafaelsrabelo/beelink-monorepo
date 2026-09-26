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
import type { StorefrontRoutes } from "@/lib/storefront-routes"
import { reachesTheEdge } from "./band-rhythm"
import { deviceRhythmOf, shownClassOf, shownOn, spacingClassOf } from "./device-visibility"
import { drawnSectionsOf } from "./empty-component"
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
  /** Every category the shop has. A CATEGORIES component draws these; nothing else reads them. */
  categories: readonly PublicProductCategory[]
  routes: StorefrontRoutes
  showPrice: boolean
  showBadge: boolean
  /** "Adicionar ao carrinho" on each card of a showcase. */
  quickAdd?: boolean
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
  /**
   * Drawn after a band's blocks, inside its grid. Design mode puts the room a row has left there, as
   * a place to add beside; the shop passes nothing.
   */
  renderBandEnd?: (section: PublicSection) => ReactNode
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

  // The first picture over its words, or beside them, is a layout of its own and never a card.
  if (component.display === "BACKDROP" || component.display === "SPLIT") return null
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
  categories,
  routes,
  showPrice,
  showBadge,
  quickAdd = false,
  linkComponent,
  renderBlock,
  renderSection,
  renderBandEnd,
  contact = null,
  messages,
}: StorefrontSectionsProps) {
  const link = linkComponent ? { linkComponent } : {}
  // A named band is an anchor, so a site's menu and the page agree on where "Serviços" is.
  const anchors = anchorsOf(sections)
  // Design mode draws a placeholder where a block is still empty, so the owner can find and fill it;
  // the shop leaves it out, and a band left with nothing, rather than spend the page's spacing on a gap.
  // The strip is drawn above the header by the window — see `announcementOf` — so it is not one of them.
  const drawn = drawnSectionsOf(sections, renderBlock !== undefined)
  const rhythm = deviceRhythmOf(drawn)

  return (
    <>
      {drawn.map((section, at) => {
        const bleed = section.width === "FULL"
        const { phone, desktop } = rhythm[at] ?? { phone: null, desktop: null }
        const band = (
          <StorefrontSectionBand
            {...(anchors.has(section.id) ? { id: anchors.get(section.id)! } : {})}
            background={section.background}
            primary={primary}
            width={section.width}
            className={spacingClassOf("padding", !!phone?.padded, !!desktop?.padded)}
          >
            {/*
              One cell per component, each taking its own slice of twelve columns. The posters used
              to be gathered into runs here, because the band was a column and a run was the only
              way two of them shared a row — and only two of the same shape, with one picture each.
              The grid does that for every kind now, a heading beside a banner included.
            */}
            <StorefrontBandGrid bleed={bleed}>
              {section.components.map((component) => {
                const cards = cardsOf(component)
                const body = cards ? (
                  <StorefrontShowcase items={cards} span={component.span} bleed={bleed} {...link} messages={messages} />
                ) : (
                  <StorefrontComponent
                    component={component}
                    categories={categories}
                    routes={routes}
                    showPrice={showPrice}
                    showBadge={showBadge}
                    quickAdd={quickAdd}
                    {...link}
                    contact={contact}
                    bleed={bleed}
                    messages={messages}
                  />
                )

                return (
                  <StorefrontBandCell
                    key={component.id}
                    span={component.span}
                    gutter={bleed && !reachesTheEdge(component.kind)}
                    className={shownClassOf(shownOn(component.visibleOn, "PHONE"), shownOn(component.visibleOn, "DESKTOP"))}
                  >
                    {renderBlock ? renderBlock(component, body) : body}
                  </StorefrontBandCell>
                )
              })}
              {renderBandEnd?.(section)}
            </StorefrontBandGrid>
          </StorefrontSectionBand>
        )

        // The space goes on the outermost element, so design mode's grip wraps the band and not the gap.
        return (
          <div
            key={section.id}
            className={
              [shownClassOf(!!phone, !!desktop), spacingClassOf("space", !!phone?.spaceBefore, !!desktop?.spaceBefore)]
                .filter(Boolean)
                .join(" ") || undefined
            }
          >
            {renderSection ? renderSection(section, band) : band}
          </div>
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
): {
  left: string
  right?: string
  background: string | null
  href: string | null
  external: boolean
  motion?: "STATIC" | "MARQUEE"
} | null {
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
    ...(strip.display === "STATIC" || strip.display === "MARQUEE" ? { motion: strip.display } : {}),
  }
}
