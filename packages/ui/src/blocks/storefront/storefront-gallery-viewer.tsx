"use client"

// React
import { useEffect, useRef } from "react"

// Libs
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

// UI
import { Dialog, DialogContent, DialogTitle } from "@harness-monorepo/ui/components/dialog"
import { scrollToSlide, useSnapIndex } from "@harness-monorepo/ui/hooks/use-snap-index"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { useShopPalette } from "./shop-palette-context"
import type { StorefrontProductImage } from "./storefront-product-gallery"

export interface StorefrontGalleryViewerProps {
  images: readonly StorefrontProductImage[]
  /** Said for a photo with no alt of its own, and in the viewer's title. */
  name: string
  open: boolean
  /** The photo it opens on. */
  start: number
  onOpenChange: (open: boolean) => void
  messages?: UiMessages
}

// `aria-disabled`, not `disabled`: a button disabled under the focus drops it to the page's body.
const STEP = "flex size-11 items-center justify-center rounded-full border border-shop-frame bg-shop-background text-shop-on-background aria-disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-shop-primary-ink"

/**
 * The photos at the size of the screen: swiped like the page's strip, stepped with the arrows or
 * the ← and → keys, counted aloud, and closed with Esc — focus goes back to the photo that opened it.
 * A phone's pinch still zooms: on touch there is no hover zoom, so this is where detail is seen.
 */
export function StorefrontGalleryViewer({ images, name, open, start, onOpenChange, messages = defaultMessages }: StorefrontGalleryViewerProps) {
  const text = messages.storefront
  // Portaled out of the window, so the shop's variables have to come along.
  const palette = useShopPalette()

  return (
    <Dialog open={open} onOpenChange={(next: boolean) => onOpenChange(next)}>
      <DialogContent
        closeLabel={text.galleryClose}
        style={palette}
        className="flex h-dvh w-screen max-w-none flex-col gap-0 rounded-none bg-shop-background p-0 text-shop-on-background ring-0 sm:max-w-none"
      >
        <DialogTitle className="sr-only">{format(text.galleryViewerTitle, { name })}</DialogTitle>
        {/* Its own component, so the strip is measured once the dialog has put it on the page. */}
        <ViewerStrip images={images} name={name} start={start} messages={messages} />
      </DialogContent>
    </Dialog>
  )
}

function ViewerStrip({ images, name, start, messages }: { images: readonly StorefrontProductImage[]; name: string; start: number; messages: UiMessages }) {
  const text = messages.storefront
  const strip = useRef<HTMLDivElement>(null)
  const shown = useSnapIndex(strip)
  const count = images.length

  useEffect(() => {
    scrollToSlide(strip.current, start, count)
  }, [start, count])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const node = strip.current
      if (!node || !node.clientWidth || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return
      event.preventDefault()
      scrollToSlide(node, Math.round(node.scrollLeft / node.clientWidth) + (event.key === "ArrowRight" ? 1 : -1), count)
    }
    // Capturing: the dialog stops a key's way back up, so a listener waiting for it never hears it.
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [count])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={strip} data-slot="viewer-strip" className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none]">
        {images.map((image, at) => (
          <div key={image.id} className="flex size-full shrink-0 snap-center items-center justify-center p-4 shop-sm:p-12">
            <img
              src={image.url}
              alt={image.alt ?? name}
              loading={Math.abs(at - start) <= 1 ? "eager" : "lazy"}
              decoding="async"
              className="max-h-full max-w-full object-contain"
            />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-4 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        <button type="button" aria-label={text.photoPrevious} aria-disabled={shown <= 0} onClick={() => scrollToSlide(strip.current, shown - 1, count)} className={STEP}>
          <ChevronLeftIcon aria-hidden="true" className="size-5" />
        </button>
        <p aria-live="polite" className="min-w-24 text-center text-sm tabular-nums">
          {format(text.photoOf, { n: String(shown + 1), total: String(count) })}
        </p>
        <button type="button" aria-label={text.photoNext} aria-disabled={shown >= count - 1} onClick={() => scrollToSlide(strip.current, shown + 1, count)} className={STEP}>
          <ChevronRightIcon aria-hidden="true" className="size-5" />
        </button>
      </div>
    </div>
  )
}
