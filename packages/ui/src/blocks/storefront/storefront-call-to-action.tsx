// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

/** A call to action's button, as a visitor is served it. The contract's `PublicComponentLink`, restated. */
export interface StorefrontCallToActionButton {
  label: string
  /** Null when what it pointed at is gone: no button is drawn. */
  href: string | null
  external: boolean
}

export interface StorefrontCallToActionProps {
  /** `BAND`: a strip of the shop's colour. `CARD`: a tinted card inside the page's margins. */
  layout: "BAND" | "CARD"
  title?: string | null
  body?: string | null
  button?: StorefrontCallToActionButton | null
  /** In an edge-to-edge band a strip reaches the edges; anywhere else it keeps round corners. */
  bleed?: boolean
  linkComponent?: LinkComponent
  className?: string
}

const LAYOUT = {
  BAND: { box: "bg-shop-primary text-shop-on-primary px-6 py-12 shop-md:py-16", pill: "bg-shop-on-primary text-shop-primary" },
  CARD: { box: "bg-shop-primary-tint text-shop-on-background rounded-2xl px-6 py-10", pill: "bg-shop-primary text-shop-on-primary" },
} as const

/**
 * The page's last word: a title, a line of text and one button, centred. It draws nothing without
 * words — a button alone is not a call — and no button where it leads nowhere, or where what it
 * pointed at is gone: a button that goes nowhere is worse than none.
 *
 * The button on a strip of the shop's colour is inverted, the shop's colour on its own ink, so it
 * reads against the strip whatever the colour is.
 */
export function StorefrontCallToAction({
  layout,
  title,
  body,
  button,
  bleed = false,
  linkComponent: Link = AnchorLink,
  className,
}: StorefrontCallToActionProps) {
  if (!title && !body) return null

  const look = LAYOUT[layout]

  return (
    <div className={cn("flex flex-col items-center gap-4 text-center", look.box, layout === "BAND" && !bleed && "rounded-2xl", className)}>
      {title ? <h2 className="max-w-2xl text-2xl font-semibold text-balance shop-sm:text-3xl">{title}</h2> : null}
      {body ? <p className="max-w-xl text-base whitespace-pre-line opacity-90">{body}</p> : null}
      {button?.href ? (
        <Link
          href={button.href}
          className={cn(
            "mt-2 rounded-full px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current",
            look.pill,
          )}
          {...(button.external ? { target: "_blank", rel: "noreferrer" } : {})}
        >
          {button.label}
        </Link>
      ) : null}
    </div>
  )
}
