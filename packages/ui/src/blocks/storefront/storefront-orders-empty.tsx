// Libs
import { PackageOpenIcon } from "lucide-react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface StorefrontOrdersEmptyProps {
  /** Never ordered here, or nothing under the filters chosen — a different sentence and a different door. */
  variant: "none" | "filtered"
  /** The shop's shelf, or the list with its filters cleared. */
  href: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/** A list with nothing in it says why, and where to go: never a blank column. */
export function StorefrontOrdersEmpty({ variant, href, linkComponent: Link = AnchorLink, messages = defaultMessages }: StorefrontOrdersEmptyProps) {
  const text = messages.storefront
  const filtered = variant === "filtered"

  return (
    <section className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-shop-line px-6 py-14 text-center">
      <PackageOpenIcon aria-hidden="true" className="size-9 text-shop-muted" strokeWidth={1.5} />
      <p className="font-semibold">{filtered ? text.ordersNoResults : text.ordersEmpty}</p>
      <Link href={href} className="mt-1 rounded-[10px] bg-shop-primary px-4 py-2 text-sm font-semibold text-shop-on-primary">
        {filtered ? text.ordersClear : text.ordersEmptyCta}
      </Link>
    </section>
  )
}
