"use client"

// React
import type { ReactNode } from "react"

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

export interface StorefrontHeroItem {
  id: string
  imageUrl: string
  /** Written over the picture. A hero is often a photograph with the shop's own words in it. */
  title?: string | null
  subtitle?: string | null
  /** Already resolved by the API from the slug the target has now. Null goes nowhere. */
  href?: string | null
  external?: boolean
  /**
   * Wraps this one slide. Design mode puts a grip on it; the shop passes nothing.
   *
   * Per slide and not per carousel, because a grip bound to the group would carry the first
   * slide's id — dragging it would pull that one hero out and split the carousel.
   */
  wrap?: (card: ReactNode) => ReactNode
}

export interface StorefrontHeroProps {
  /** One is a cover. Two or more are a carousel, and nothing else decides that. */
  items: readonly StorefrontHeroItem[]
  /** Edge to edge, or inside the shop's measure. The shopkeeper's choice, per hero. */
  width?: "FULL" | "CONTAINED"
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * The banner at the top of the shop.
 *
 * **One is a cover; two or more are a carousel, and there is no switch.** The shape is read off
 * the count, which is one fewer thing that can disagree with itself — `layoutSettings.bannerType`
 * stored exactly that switch, `'single' | 'carousel'`, beside a list of images, and nothing ever
 * read either of them.
 *
 * This is the first importer of the shadcn carousel, which had sat in this package unused since it
 * was installed. The rails deliberately do not use it — `scroll-rail.tsx` says why: Embla hides the
 * overflow, which is right for a hero showing one thing at a time and wrong for a shelf that should
 * show the edge of the next card.
 */
export function StorefrontHero({
  items,
  width = "FULL",
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: StorefrontHeroProps) {
  // A hero with no picture is a fixed-height band of nothing, and `src=""` makes the browser
  // re-request the page. Dropped here rather than guarded at every call site.
  const drawn = items.filter((item) => item.imageUrl)

  if (!drawn.length) return null

  const text = messages.storefront
  // A contained hero gets the corner the rest of the page has; a full-bleed one must not, or the
  // rounding cuts the picture away from the very edges it was chosen to reach.
  const frame = cn("w-full object-cover", "h-44 sm:h-72 lg:h-96", width === "CONTAINED" && "rounded-2xl")

  function one(item: StorefrontHeroItem) {
    const wrap = item.wrap ?? ((card: ReactNode) => card)
    const picture = (
      <>
        <img
          src={item.imageUrl}
          alt=""
          // Decorative: the title is written over it and is the hero's whole accessible name. A
          // hero whose words are painted into the JPEG has nothing a screen reader can read out.
          aria-hidden="true"
          className={frame}
        />
        {item.title || item.subtitle ? (
          <div
            className={cn(
              "absolute inset-x-0 bottom-0 flex flex-col gap-1 p-5 sm:p-8",
              width === "CONTAINED" && "rounded-b-2xl",
            )}
            style={{
              // Drawn in the shop's own ink so a dark shop gets a light scrim and a pale one a
              // dark scrim — the same derivation the rest of the window uses, rather than a
              // black that would vanish on a black page.
              backgroundImage:
                "linear-gradient(to top, color-mix(in oklab, var(--shop-text) 88%, transparent) 0%, color-mix(in oklab, var(--shop-text) 45%, transparent) 45%, transparent 85%)",
              color: "var(--shop-on-text)",
            }}
          >
            {item.title ? (
              <p className="text-2xl leading-tight font-semibold text-balance sm:text-4xl">{item.title}</p>
            ) : null}
            {item.subtitle ? (
              <p className="max-w-xl text-sm opacity-85 sm:text-base">{item.subtitle}</p>
            ) : null}
          </div>
        ) : null}
      </>
    )

    const shape = cn("group relative block w-full overflow-hidden", width === "CONTAINED" && "rounded-2xl")

    return wrap(
      item.href ? (
      <Link
        href={item.href}
        className={shape}
        // A hero whose words are painted into the photograph leaves this link holding nothing but
        // an `aria-hidden` image — an empty link, which a screen reader announces as a URL. The
        // shop's own fallback is the only name there is to give it.
        {...(item.title || item.subtitle ? {} : { "aria-label": text.backToShop })}
        // The pair every outbound anchor in this repository carries. Without the `target`, a hero
        // pointing at WhatsApp takes the shop window away with it.
        {...(item.external ? { target: "_blank", rel: "noreferrer" } : {})}
      >
        {picture}
      </Link>
    ) : (
      <div className={shape}>{picture}</div>
      ),
    )
  }

  const only = drawn[0]
  const body =
    drawn.length === 1 && only ? (
      one(only)
    ) : (
      <Carousel className="w-full" opts={{ loop: true }}>
        <CarouselContent>
          {drawn.map((item) => (
            <CarouselItem key={item.id}>{one(item)}</CarouselItem>
          ))}
        </CarouselContent>
        {/* Inside the picture: a control outside it would sit on the page's background and read as
            belonging to whatever is underneath. */}
        <CarouselPrevious className="left-4" aria-label={text.railPrevious} />
        <CarouselNext className="right-4" aria-label={text.railNext} />
      </Carousel>
    )

  // The page's main band has no top padding — a full-bleed hero is meant to meet the header. A
  // contained one is not, so it supplies the gap itself rather than making every other block pay.
  return width === "CONTAINED" ? <div className={cn(BAND, "pt-6")}>{body}</div> : body
}
