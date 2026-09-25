"use client"

// React
import { useRef } from "react"

// Libs
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

// UI
import { scrollToSlide, useSnapIndex } from "@harness-monorepo/ui/hooks/use-snap-index"
import { cn } from "@harness-monorepo/ui/lib/utils"

export interface StorefrontCardPhotosProps {
  /** The card's photos in the shopkeeper's order, the cover first; two or more. */
  urls: readonly string[]
  /** The product's page: a press on a photo goes there, as a press anywhere else on the card does. */
  href: string
  /**
   * On a rail that scrolls sideways: there a finger moves the rail, not the photos, and the dots are
   * how a phone passes them.
   */
  inRail?: boolean
}

const ARROW =
  "absolute top-1/2 z-[2] hidden size-8 -translate-y-1/2 items-center justify-center rounded-full border border-shop-line bg-shop-background text-shop-on-background shadow-sm pointer-fine:group-hover/card:flex"

/**
 * A card's photos, passed through where the card stands — the owner's ask, on the home, the listing,
 * a category and the search. A strip that snaps, one photo per width, so a finger swipes it before
 * any script; arrows on a hovered card for a mouse, and dots under the photo.
 *
 * All of it is decoration for a reader, who has the product's name as the card's link and the full
 * gallery on its page: hidden from the accessibility tree and out of the tab order. The first photo
 * is in the server's HTML; the rest load as they are reached.
 */
// Plain anchors, never an injected link component: the card renders on the server, and a component is
// a function no server can hand to this client island.
export function StorefrontCardPhotos({ urls, href, inRail = false }: StorefrontCardPhotosProps) {
  const strip = useRef<HTMLDivElement>(null)
  const shown = useSnapIndex(strip)
  const count = urls.length

  // Round the ends: from the last photo, the next is the first.
  const go = (to: number) => scrollToSlide(strip.current, (to + count) % count, count)

  return (
    // Above the card's stretched link, so a finger swipes the photos rather than following the link.
    <div aria-hidden="true" className="relative z-[1] size-full">
      <div
        ref={strip}
        className={cn(
          "flex size-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none]",
          // On a rail, a finger belongs to the rail: the photos pass by their dots.
          inRail && "pointer-coarse:overflow-x-hidden",
        )}
      >
        {urls.map((url, at) => (
          <a key={`${at}-${url}`} href={href} tabIndex={-1} className="block size-full shrink-0 snap-start">
            <img src={url} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
          </a>
        ))}
      </div>

      <button type="button" tabIndex={-1} onClick={() => go(shown - 1)} className={cn(ARROW, "left-2")}>
        <ChevronLeftIcon className="size-4" />
      </button>
      <button type="button" tabIndex={-1} onClick={() => go(shown + 1)} className={cn(ARROW, "right-2")}>
        <ChevronRightIcon className="size-4" />
      </button>

      <div className="absolute inset-x-0 bottom-1 z-[2] flex justify-center gap-1">
        {urls.map((url, at) => (
          // A 6px dot in a finger-sized box: on a rail, the dots are how a phone passes the photos.
          <button key={`${at}-${url}`} type="button" tabIndex={-1} onClick={() => go(at)} className="flex h-6 w-4 items-center justify-center">
            <span className={cn("size-1.5 rounded-full", at === shown ? "bg-shop-primary" : "bg-shop-on-background/30")} />
          </button>
        ))}
      </div>
    </div>
  )
}
