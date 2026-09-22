"use client"

// UI
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@harness-monorepo/ui/components/carousel"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { BAND } from "./storefront-band"

export interface CoverSlideItem {
  id: string
  imageUrl: string
  alt?: string | null
  href?: string | null
}

export interface StorefrontCoverProps {
  slides: readonly CoverSlideItem[]
  /** Edge to edge, or inside the shop's measure. The shopkeeper's choice, per cover. */
  width?: "FULL" | "CONTAINED"
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * The picture at the top of the shop.
 *
 * One slide is a photograph; several is a carousel — and there is no switch to disagree with the
 * count. `layoutSettings.bannerType` used to be that switch, storing `'single' | 'carousel'`
 * beside a `bannerImages` array, and nothing ever read either of them. Reading the shape off what
 * the block holds is one fewer thing that can be wrong.
 *
 * This is the first importer of the shadcn carousel, which has sat in this package unused since it
 * was installed. The rails deliberately do not use it — `scroll-rail.tsx` says why: Embla hides
 * the overflow, which is right for a cover that shows one slide at a time and wrong for a shelf
 * that should show the edge of the next card.
 */
export function StorefrontCover({
  slides,
  width = "FULL",
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: StorefrontCoverProps) {
  if (!slides.length) return null

  const text = messages.storefront
  // Contained covers get the corner the rest of the page has; a full-bleed one must not, or the
  // rounding cuts the picture away from the edges it was chosen to reach.
  const frame = cn("w-full object-cover", "h-44 sm:h-72 lg:h-96", width === "CONTAINED" && "rounded-2xl")

  function slide(item: CoverSlideItem) {
    const picture = (
      <img
        src={item.imageUrl}
        alt={item.alt ?? ""}
        // Decorative unless the shopkeeper wrote a description: a cover whose words are painted
        // into the JPEG has nothing a screen reader can read out of the file.
        aria-hidden={item.alt ? undefined : "true"}
        className={frame}
      />
    )

    return item.href ? (
      <Link href={item.href} className="block w-full">
        {picture}
      </Link>
    ) : (
      picture
    )
  }

  const only = slides[0]
  const body =
    slides.length === 1 && only ? (
      slide(only)
    ) : (
      <Carousel className="w-full" opts={{ loop: true }}>
        <CarouselContent>
          {slides.map((item) => (
            <CarouselItem key={item.id}>{slide(item)}</CarouselItem>
          ))}
        </CarouselContent>
        {/* Inside the picture, because a control outside it would sit on the page's background and
            read as belonging to whatever is underneath. */}
        <CarouselPrevious className="left-4" aria-label={text.railPrevious} />
        <CarouselNext className="right-4" aria-label={text.railNext} />
      </Carousel>
    )

  return width === "CONTAINED" ? <div className={BAND}>{body}</div> : body
}
