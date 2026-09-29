// Libs
import { ChevronRightIcon, PackageOpenIcon, RefreshCwIcon } from "lucide-react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import type { StorefrontOrderCardProps } from "./storefront-order-card"

/** The last order, in the words the list's card gives it. */
export interface StorefrontAccountLastOrder {
  number: number
  headline: string
  detail: string | null
  tone: StorefrontOrderCardProps["tone"]
}

export type StorefrontAccountOrdersNoteProps = {
  href: string
  linkComponent?: LinkComponent
  messages?: UiMessages
} & (
  | { kind: "last"; order: StorefrontAccountLastOrder }
  | { kind: "none" }
  /** The orders could not be read: said as such, never as "no orders". */
  | { kind: "unavailable" }
)

const TONE = { progress: "text-shop-on-background", done: "text-shop-positive-ink", cancelled: "text-shop-muted" } as const

/**
 * What the front says about orders when none is on its way: how the last one ended, an invitation
 * to the shelf for a shopper who never ordered, or that they could not be read. `href` is the door:
 * the list, the shelf, or this page again.
 */
export function StorefrontAccountOrdersNote(props: StorefrontAccountOrdersNoteProps) {
  const { href, linkComponent: Link = AnchorLink, messages = defaultMessages } = props
  const text = messages.storefront

  if (props.kind === "last") {
    const { order } = props
    return (
      <section className="flex flex-col gap-3 rounded-2xl border border-shop-line bg-shop-background p-5 text-shop-on-background shop-md:p-6">
        <h2 className="text-[13px] font-bold tracking-[0.04em] text-shop-muted uppercase">{text.accountLastOrder}</h2>
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-bold">{format(text.orderNumber, { number: String(order.number) })}</p>
          <p className={cn("text-lg font-extrabold", TONE[order.tone])}>{order.headline}</p>
          {order.detail ? <p className="text-sm text-shop-muted">{order.detail}</p> : null}
        </div>
        <Link href={href} className="flex w-fit items-center gap-1 text-sm font-semibold text-shop-primary-ink hover:underline">
          {text.accountSeeOrders}
          <ChevronRightIcon aria-hidden="true" className="size-4" />
        </Link>
      </section>
    )
  }

  const unavailable = props.kind === "unavailable"
  const Icon = unavailable ? RefreshCwIcon : PackageOpenIcon

  return (
    <section className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-shop-line p-5 text-shop-on-background shop-md:flex-row shop-md:items-center shop-md:p-6">
      <Icon aria-hidden="true" className="size-8 shrink-0 text-shop-muted" strokeWidth={1.5} />
      <p role={unavailable ? "alert" : undefined} className="font-semibold">
        {unavailable ? text.ordersUnavailable : text.ordersEmpty}
      </p>
      <Link href={href} className="rounded-[10px] bg-shop-primary px-4 py-2 text-sm font-semibold text-shop-on-primary shop-md:ml-auto">
        {unavailable ? text.ordersRetry : text.ordersEmptyCta}
      </Link>
    </section>
  )
}
