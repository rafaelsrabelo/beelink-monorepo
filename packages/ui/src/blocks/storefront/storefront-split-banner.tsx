// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import type { StorefrontHeroItem } from "./storefront-hero"

export interface StorefrontSplitBannerProps {
  /** A banner's first picture, with its words and where it leads. */
  item: StorefrontHeroItem
  linkComponent?: LinkComponent
  className?: string
  messages?: UiMessages
}

/**
 * A banner laid out as "Dividida": the words on one side, the picture on the other — a title that
 * reads as text and not as a caption on a photograph, and a button where the banner leads somewhere.
 *
 * The same slide as every other layout of the banner, so switching to it and back loses nothing.
 * Stacked on a phone, picture first; side by side from the tablet up.
 */
export function StorefrontSplitBanner({ item, linkComponent: Link = AnchorLink, className, messages = defaultMessages }: StorefrontSplitBannerProps) {
  if (!item.imageUrl) return null

  return (
    <div className={cn("grid items-center gap-6 shop-md:grid-cols-2 shop-md:gap-10", className)}>
      <img
        src={item.imageUrl}
        alt=""
        // Decorative: the title beside it is the banner's words.
        aria-hidden="true"
        className="aspect-[4/3] w-full rounded-2xl object-cover"
      />
      <div className="flex flex-col items-start gap-3">
        {item.title ? <h2 className="text-2xl leading-tight font-semibold text-balance shop-md:text-4xl">{item.title}</h2> : null}
        {item.subtitle ? <p className="max-w-prose opacity-80 shop-md:text-lg">{item.subtitle}</p> : null}
        {item.href ? (
          <Link
            href={item.href}
            className="mt-2 rounded-full px-5 py-2.5 text-sm font-semibold"
            style={{ backgroundColor: "var(--shop-primary)", color: "var(--shop-on-primary)" }}
            {...(item.external ? { target: "_blank", rel: "noreferrer" } : {})}
          >
            {messages.storefront.learnMore}
          </Link>
        ) : null}
      </div>
    </div>
  )
}
