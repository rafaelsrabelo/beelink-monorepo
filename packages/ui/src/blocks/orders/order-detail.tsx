// Libs
import { ArrowLeftIcon } from "lucide-react"

// Locales
import { defaultLocale, defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { formatCents } from "../storefront/storefront-price"
import { OrderFacts } from "./order-facts"
import { OrderHistory } from "./order-history"
import { OrderItems } from "./order-items"
import { OrderStatusActions } from "./order-status-actions"
import { OrderStatusBadge } from "./order-status-badge"
import type { OrderDetailView, OrderStatusValue } from "./order-types"

export interface OrderDetailProps {
  order: OrderDetailView
  /** Where the list is, for the way back. */
  backHref: string
  addressLine: string | null
  whatsappHref: string | null
  onStatusChange: (status: OrderStatusValue) => void
  statusPending?: boolean
  /** Why the last status change did not go through, in words. */
  statusError?: string
  locale?: string
  currency?: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/** An opened order: where it stands and how to move it, what was sold, and who it is for. */
export function OrderDetail({
  order,
  backHref,
  addressLine,
  whatsappHref,
  onStatusChange,
  statusPending = false,
  statusError,
  locale = defaultLocale,
  currency = "BRL",
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: OrderDetailProps) {
  const text = messages.orders.detail
  const money = (cents: number) => formatCents(cents, locale, currency)
  const date = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })
  const when = (iso: string) => date.format(new Date(iso))

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Link
          href={backHref}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex w-fit items-center gap-1 rounded-sm text-sm outline-none focus-visible:ring-2"
        >
          <ArrowLeftIcon aria-hidden="true" className="size-4" />
          {text.back}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tabular-nums">{format(text.title, { number: String(order.number) })}</h1>
          <OrderStatusBadge status={order.status} messages={messages} />
        </div>
        <p className="text-muted-foreground text-sm">{format(text.placedAt, { date: when(order.placedAt) })}</p>
        <OrderStatusActions
          number={order.number}
          status={order.status}
          fulfillment={order.fulfillment}
          onChange={onStatusChange}
          pending={statusPending}
          messages={messages}
        />
        {statusError ? (
          <p role="alert" className="text-destructive text-sm">
            {statusError}
          </p>
        ) : null}
      </header>

      <div className="grid items-start gap-6 @4xl/main:grid-cols-[minmax(0,1fr)_20rem]">
        <OrderItems order={order} money={money} messages={messages} />
        <div className="flex flex-col gap-6">
          <OrderFacts order={order} addressLine={addressLine} whatsappHref={whatsappHref} messages={messages} />
          <OrderHistory events={order.events} when={when} messages={messages} />
        </div>
      </div>
    </div>
  )
}
