"use client"

// React
import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react"

// UI
import { scrollToSlide, useSnapIndex } from "@harness-monorepo/ui/hooks/use-snap-index"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { StorefrontGalleryRail } from "./storefront-gallery-rail"
import { StorefrontGalleryViewer } from "./storefront-gallery-viewer"

export interface StorefrontProductImage {
  id: string
  url: string
  alt: string | null
  /** The option values the photo is of; absent or empty, every combination. See `lib/photo-choice`. */
  optionValueIds?: readonly string[]
}

export interface StorefrontProductGalleryProps {
  images: readonly StorefrontProductImage[]
  /** Said for a photo with no alt of its own. */
  name: string
  /** Over the photo's top-left corner: the discount, drawn by the page. */
  badge?: ReactNode
  messages?: UiMessages
}

/** The photo under the cursor, twice its size and anchored where the cursor is — only for a mouse. */
function zoomAt(event: PointerEvent<HTMLButtonElement>) {
  const photo = event.currentTarget.querySelector("img")
  // A photo barely larger than its box would only blur when doubled.
  if (event.pointerType !== "mouse" || !photo || photo.naturalWidth < event.currentTarget.clientWidth * 1.5) return
  const box = event.currentTarget.getBoundingClientRect()
  photo.style.transformOrigin = `${((event.clientX - box.left) / box.width) * 100}% ${((event.clientY - box.top) / box.height) * 100}%`
  photo.style.transform = "scale(2)"
}

function unzoom(event: PointerEvent<HTMLButtonElement>) {
  const photo = event.currentTarget.querySelector("img")
  if (photo) photo.style.transform = ""
}

/**
 * 5b's gallery: the thumbnails in a column beside a 560px photo, the discount on its corner, zoom
 * under the cursor and the photos at full screen on a click.
 *
 * The photo is a strip that snaps, one slide per photo, so a finger swipes it with nothing but the
 * browser — before the script arrives, and on the cheap phone a WhatsApp link opens. Thumbnails and
 * the viewer move the strip; the strip's position says which thumbnail is pressed. Which photo is on
 * show is state about looking, not about the shop, so it is never in the address. The page remounts
 * this with a new key when a choice changes the photos, so it opens on the first.
 */
export function StorefrontProductGallery({ images, name, badge, messages = defaultMessages }: StorefrontProductGalleryProps) {
  const text = messages.storefront
  const strip = useRef<HTMLDivElement>(null)
  const shown = useSnapIndex(strip)
  const [viewing, setViewing] = useState<number | null>(null)
  const total = String(images.length)

  // ← and → step the photo and take the focus with it, so Enter opens the one on screen.
  function stepFrom(event: KeyboardEvent<HTMLButtonElement>, at: number) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
    event.preventDefault()
    const next = Math.max(0, Math.min(images.length - 1, at + (event.key === "ArrowRight" ? 1 : -1)))
    scrollToSlide(strip.current, next, images.length)
    strip.current?.querySelectorAll<HTMLButtonElement>(":scope > button")[next]?.focus({ preventScroll: true })
  }

  return (
    <div className="flex flex-col gap-3 shop-lg:flex-row">
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <div className="relative">
          <div
            ref={strip}
            className="flex aspect-square snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-[16px] bg-shop-placeholder [scrollbar-width:none] shop-lg:aspect-auto shop-lg:h-[560px]"
          >
            {images.length === 0 ? (
              <p className="flex size-full items-center justify-center text-[14px] text-shop-muted">{text.noPhoto}</p>
            ) : (
              images.map((image, at) => (
                <button
                  key={image.id}
                  type="button"
                  // One tab stop: the photo on show. The thumbnails are how the others are reached.
                  tabIndex={at === shown ? 0 : -1}
                  aria-label={format(text.galleryOpen, { n: String(at + 1), total })}
                  onClick={() => setViewing(at)}
                  onKeyDown={(event) => stepFrom(event, at)}
                  onPointerMove={zoomAt}
                  onPointerLeave={unzoom}
                  className="relative size-full shrink-0 snap-center overflow-hidden focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-shop-primary-ink"
                >
                  <img
                    src={image.url}
                    alt={image.alt ?? name}
                    loading={at === 0 ? "eager" : "lazy"}
                    fetchPriority={at === 0 ? "high" : undefined}
                    decoding="async"
                    className="size-full object-contain transition-transform duration-150"
                  />
                </button>
              ))
            )}
          </div>
          {badge}
        </div>
        {/* Only where a pointer hovers: on touch there is no hover, so it would not be true. */}
        {images.length > 0 ? <p className="hidden text-center text-xs text-shop-muted [@media(hover:hover)]:block">{text.galleryHint}</p> : null}
      </div>

      {images.length > 1 ? (
        <StorefrontGalleryRail
          images={images}
          shown={shown}
          onShow={(at) => scrollToSlide(strip.current, at, images.length)}
          onMore={setViewing}
          messages={messages}
        />
      ) : null}

      {images.length > 0 ? (
        <StorefrontGalleryViewer
          images={images}
          name={name}
          open={viewing !== null}
          start={viewing ?? 0}
          onOpenChange={(open) => {
            if (!open) setViewing(null)
          }}
          messages={messages}
        />
      ) : null}
    </div>
  )
}
