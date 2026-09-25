// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { StorefrontProductImage } from "./storefront-product-gallery"

export interface StorefrontGalleryRailProps {
  images: readonly StorefrontProductImage[]
  /** The photo on show. */
  shown: number
  onShow: (index: number) => void
  /** "+N": the viewer, on the first photo the rail leaves out. */
  onMore: (index: number) => void
  /** How many thumbnails fit; 5b draws five. */
  max?: number
  messages?: UiMessages
}

/**
 * 5b's thumbnails: a column beside the photo from shop-lg, a row under it on a phone. At most five,
 * then "+N" for the rest, which opens them in the viewer rather than growing the column past the
 * photo.
 */
export function StorefrontGalleryRail({ images, shown, onShow, onMore, max = 5, messages = defaultMessages }: StorefrontGalleryRailProps) {
  const text = messages.storefront
  const rest = images.length - max

  return (
    <div className="flex shrink-0 gap-2 overflow-x-auto [scrollbar-width:none] shop-lg:order-first shop-lg:w-16 shop-lg:flex-col shop-lg:overflow-visible">
      {images.slice(0, max).map((image, at) => (
        <button
          key={image.id}
          type="button"
          onClick={() => onShow(at)}
          // Pressed, not only ringed: which photo is on show has to be answerable without seeing it.
          aria-pressed={at === shown}
          aria-label={image.alt ?? format(text.photoOf, { n: String(at + 1), total: String(images.length) })}
          className={cn(
            "size-16 shrink-0 overflow-hidden rounded-[10px] bg-shop-placeholder focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-shop-primary-ink",
            at === shown ? "border-2 border-shop-primary-ink" : "border border-shop-frame",
          )}
        >
          <img src={image.url} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
        </button>
      ))}
      {rest > 0 ? (
        <button
          type="button"
          onClick={() => onMore(max)}
          aria-label={format(text.galleryMoreLabel, { count: String(rest) })}
          className="flex min-h-6 w-16 shrink-0 items-center justify-center rounded-[10px] text-xs text-shop-muted hover:text-shop-on-background focus-visible:outline-2 focus-visible:outline-shop-primary-ink"
        >
          {format(text.galleryMore, { count: String(rest) })}
        </button>
      ) : null}
    </div>
  )
}
