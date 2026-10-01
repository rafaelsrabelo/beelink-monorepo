// Libs
import { RefreshCwIcon, StarIcon } from "lucide-react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface StorefrontReviewsEmptyProps {
  /** Nothing delivered to rate and nothing rated, or a list that could not be read. */
  variant: "none" | "unavailable"
  /** The shopper's orders, or this very address to read it again. */
  href: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/** Avaliar compras with nothing in it says why, and where to go. A failed read is never told as nothing to rate. */
export function StorefrontReviewsEmpty({ variant, href, linkComponent: Link = AnchorLink, messages = defaultMessages }: StorefrontReviewsEmptyProps) {
  const text = messages.storefront
  const failed = variant === "unavailable"
  const Icon = failed ? RefreshCwIcon : StarIcon

  return (
    <section className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-shop-line px-6 py-14 text-center">
      <Icon aria-hidden="true" className="size-9 text-shop-muted" strokeWidth={1.5} />
      <p role={failed ? "alert" : undefined} className="max-w-md font-semibold">
        {failed ? text.reviewsUnavailable : text.reviewsEmpty}
      </p>
      <Link href={href} className="mt-1 inline-flex min-h-11 items-center rounded-[10px] bg-shop-primary px-4 text-sm font-semibold text-shop-on-primary">
        {failed ? text.reviewsRetry : text.reviewsEmptyCta}
      </Link>
    </section>
  )
}
