// Libs
import { MessageCircleIcon } from "lucide-react"

// UI
import { buttonVariants } from "@harness-monorepo/ui/components/button"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import type { OrderDetailView } from "./order-types"

export interface OrderFactsProps {
  order: Pick<OrderDetailView, "customer" | "fulfillment" | "paymentMethod" | "note">
  /** The customer's address in one line, as the screen writes addresses; null when there is none. */
  addressLine: string | null
  /** The conversation with the order already typed; null when the customer has no phone. */
  whatsappHref: string | null
  /** The customer's record; absent, the name is only text. */
  customerHref?: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

function Fact({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className={cn("text-sm", className)}>{children}</dd>
    </div>
  )
}

/**
 * Who bought — the name leading to their record — where they are, how it leaves and how it was
 * paid, and a way to talk to them.
 */
export function OrderFacts({ order, addressLine, whatsappHref, customerHref, linkComponent: Link = AnchorLink, messages = defaultMessages }: OrderFactsProps) {
  const text = messages.orders.detail
  const labels = messages.orders

  return (
    <section aria-labelledby="order-facts-title" className="bg-shell-surface border-shell-border flex flex-col gap-4 rounded-xl border p-4 shadow-xs">
      <h2 id="order-facts-title" className="font-semibold">
        {text.customer}
      </h2>
      <div className="flex flex-col gap-1">
        {customerHref ? (
          <Link
            href={customerHref}
            aria-label={format(messages.customers.open, { name: order.customer.name })}
            className="focus-visible:ring-ring w-fit rounded-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2"
          >
            {order.customer.name}
          </Link>
        ) : (
          <span className="font-medium">{order.customer.name}</span>
        )}
        <span className="text-muted-foreground text-sm tabular-nums">{order.customer.phone ?? text.noPhone}</span>
        <span className="text-muted-foreground text-sm">{addressLine ?? text.noAddress}</span>
      </div>
      {whatsappHref ? (
        <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "outline" }), "self-start")}>
          <MessageCircleIcon aria-hidden="true" />
          {text.whatsapp}
        </a>
      ) : null}
      <dl className="grid gap-3 border-t pt-4">
        <Fact label={text.fulfillment}>{labels.fulfillments[order.fulfillment]}</Fact>
        <Fact label={text.payment}>{labels.payments[order.paymentMethod]}</Fact>
        {/* Typed in a textarea: its line breaks are the shopkeeper's, and a pasted link must not run out of the card. */}
        {order.note ? (
          <Fact label={text.note} className="break-words whitespace-pre-line">
            {order.note}
          </Fact>
        ) : null}
      </dl>
    </section>
  )
}
