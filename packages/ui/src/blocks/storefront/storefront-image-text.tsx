// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import type { StorefrontSpan } from "./storefront-band-cell"
import type { StorefrontCallToActionButton } from "./storefront-call-to-action"
import { PICTURE_LAST, SIDE_BY_SIDE, SPAN_TITLE } from "./storefront-span-shape"

/** The picture, what it shows and the button beside the words. The contract's `PublicImageTextMedia`, restated. */
export interface StorefrontImageTextMedia {
  imageUrl: string
  /** Null is decorative: the words beside it say what the block says. */
  alt: string | null
  button: StorefrontCallToActionButton | null
}

export interface StorefrontImageTextProps {
  /** Which side the picture sits on once it sits beside the words. */
  layout: "IMAGE_LEFT" | "IMAGE_RIGHT"
  title?: string | null
  body?: string | null
  media?: StorefrontImageTextMedia | null
  /** Its slice of the band: side by side only where the slice has the room, stacked otherwise. */
  span?: StorefrontSpan
  linkComponent?: LinkComponent
  className?: string
}

/**
 * A picture beside a title, a paragraph and, if it leads somewhere, a button.
 *
 * The picture comes first in the document whichever side it is drawn on: stacked on a phone it is
 * on top, and a screen reader meets the page in the order a phone shows it. "À direita" only moves
 * it once there is a side to move it to. With no picture it is the words alone; with neither, nothing.
 */
export function StorefrontImageText({
  layout,
  title,
  body,
  media,
  span = "FULL",
  linkComponent: Link = AnchorLink,
  className,
}: StorefrontImageTextProps) {
  if (!media && !title && !body) return null

  const button = media?.button?.href ? media.button : null

  return (
    <div className={cn("grid items-center gap-6", media && SIDE_BY_SIDE[span], className)}>
      {media ? (
        <img
          src={media.imageUrl}
          alt={media.alt ?? ""}
          className={cn("aspect-[4/3] w-full rounded-2xl object-cover", layout === "IMAGE_RIGHT" && PICTURE_LAST[span])}
        />
      ) : null}
      {title || body || button ? (
        <div className="flex flex-col items-start gap-3">
          {title ? <h2 className={cn("leading-tight font-semibold text-balance", SPAN_TITLE[span])}>{title}</h2> : null}
          {body ? <p className="max-w-prose text-base whitespace-pre-line opacity-85 shop-md:text-lg">{body}</p> : null}
          {button?.href ? (
            <Link
              href={button.href}
              className="mt-2 rounded-full bg-shop-primary px-5 py-2.5 text-sm font-semibold text-shop-on-primary transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-shop-primary-ink"
              {...(button.external ? { target: "_blank", rel: "noreferrer" } : {})}
            >
              {button.label}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
