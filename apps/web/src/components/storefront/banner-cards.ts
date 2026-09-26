// Types
import type { PublicBannerSlide, PublicComponent } from "@harness-monorepo/contracts"

// UI
import type { StorefrontShowcaseItem } from "@harness-monorepo/ui/blocks/storefront/storefront-showcase"

/**
 * A banner's pictures as cards, when it is drawn as cards: one picture, whatever its display, or any
 * number with `display: GRID`. Null for everything else, which `StorefrontComponent` draws — the
 * carousel among them.
 *
 * The shopkeeper's display decides carousel or grid, and the count never overrides it: the count
 * used to be the whole decision, so a second picture turned three posters meant for one row into a
 * carousel nobody asked for. A grid of one and a carousel of one are the same card.
 */
export function cardsOf(component: PublicComponent): StorefrontShowcaseItem[] | null {
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
