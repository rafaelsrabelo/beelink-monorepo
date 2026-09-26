// React
import type { ReactNode } from "react"

// Types
import type { PublicBannerSlide, PublicComponent } from "@harness-monorepo/contracts"

// UI
import type { LinkComponent } from "@harness-monorepo/ui/blocks/auth/auth-link"
import { StorefrontHero } from "@harness-monorepo/ui/blocks/storefront/storefront-hero"
import { StorefrontSplitBanner } from "@harness-monorepo/ui/blocks/storefront/storefront-split-banner"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface StorefrontBannerBlockProps {
  component: PublicComponent
  /** In an edge-to-edge band: a carousel's pictures keep square corners, to reach the edges. */
  bleed: boolean
  linkComponent?: LinkComponent
  messages: UiMessages
}

/**
 * A banner that is not drawn as cards: the first picture over its words or beside them, or all of
 * them in turn. One picture, or a grid, never gets here: `StorefrontSections` draws those as cards.
 */
export function StorefrontBannerBlock({ component, bleed, linkComponent, messages }: StorefrontBannerBlockProps): ReactNode {
  const link = linkComponent ? { linkComponent } : {}
  const slides = (component.items as PublicBannerSlide[]).map((slide) => ({
    id: slide.id,
    imageUrl: slide.imageUrl,
    title: slide.title,
    subtitle: slide.subtitle,
    href: slide.href,
    external: slide.external,
  }))

  // "Dividida": the first picture beside its words. The other slides wait, kept, for another layout.
  if (component.display === "SPLIT") {
    return slides[0] ? <StorefrontSplitBanner item={slides[0]} span={component.span} {...link} messages={messages} /> : null
  }

  return (
    <StorefrontHero
      items={component.display === "BACKDROP" ? slides.slice(0, 1) : slides}
      bleed={bleed}
      span={component.span}
      {...link}
      messages={messages}
    />
  )
}
