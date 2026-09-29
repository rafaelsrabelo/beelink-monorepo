// Libs
import { PackageOpenIcon, RefreshCwIcon } from "lucide-react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface StorefrontOrdersEmptyProps {
  /**
   * Never ordered here, nothing under the filters chosen, or a list that could not be read — each
   * a different sentence and a different door. A failed read is never told as an empty list.
   */
  variant: "none" | "filtered" | "unavailable"
  /** The shop's shelf, the list with its filters cleared, or this very address to read it again. */
  href: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/** A list with nothing in it says why, and where to go: never a blank column. */
export function StorefrontOrdersEmpty({ variant, href, linkComponent: Link = AnchorLink, messages = defaultMessages }: StorefrontOrdersEmptyProps) {
  const text = messages.storefront
  const words = {
    none: { sentence: text.ordersEmpty, door: text.ordersEmptyCta },
    filtered: { sentence: text.ordersNoResults, door: text.ordersClear },
    unavailable: { sentence: text.ordersUnavailable, door: text.ordersRetry },
  }[variant]
  const Icon = variant === "unavailable" ? RefreshCwIcon : PackageOpenIcon

  return (
    <section className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-shop-line px-6 py-14 text-center">
      <Icon aria-hidden="true" className="size-9 text-shop-muted" strokeWidth={1.5} />
      <p role={variant === "unavailable" ? "alert" : undefined} className="font-semibold">
        {words.sentence}
      </p>
      <Link href={href} className="mt-1 rounded-[10px] bg-shop-primary px-4 py-2 text-sm font-semibold text-shop-on-primary">
        {words.door}
      </Link>
    </section>
  )
}
