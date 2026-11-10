// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import type { GestorCardView, GestorPaymentTone } from "./gestor-types"

const TONES: Record<GestorPaymentTone, string> = {
  paid: "bg-success text-success-foreground",
  due: "bg-warning text-warning-foreground",
  neutral: "bg-muted text-foreground",
}

export interface GestorOrderCardProps {
  order: GestorCardView
  /** On a new order: accepting it from the card, without opening it. */
  onAccept?: () => void
  /** A move of this order is on its way. */
  pending?: boolean
  /** Waiting to be accepted: the card pulses with the bell. */
  ringing?: boolean
  /** The order opened beside the board. */
  current?: boolean
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * One order on the board: who, how much, how it is paid and handed over. The card opens the order;
 * a new one can also be accepted from it, which is what the counter does most.
 */
export function GestorOrderCard({ order, onAccept, pending = false, ringing = false, current = false, linkComponent: Link = AnchorLink, messages = defaultMessages }: GestorOrderCardProps) {
  const text = messages.gestor.board

  return (
    <article
      className={cn(
        "bg-shell-surface flex flex-col gap-2.5 rounded-xl border p-3.5 transition-colors",
        ringing ? "border-header border-2 motion-safe:animate-gestor-ring" : "border-shell-border hover:border-foreground",
        current && "ring-foreground ring-2",
      )}
    >
      <Link
        href={order.href}
        aria-current={current ? "true" : undefined}
        className="focus-visible:ring-ring flex flex-col gap-1 rounded-md outline-none focus-visible:ring-2"
      >
        <span className="flex items-baseline justify-between gap-2">
          <span className="text-foreground text-base font-semibold tabular-nums">{format(text.cardNumber, { number: String(order.number) })}</span>
          <span className="text-shell-muted text-xs">{order.age}</span>
        </span>
        <span className="text-foreground font-medium">{order.customer}</span>
        <span className="text-shell-muted text-sm">{order.items}</span>
      </Link>
      <div className="flex flex-wrap gap-1.5">
        <span className={cn("rounded-full px-2 py-1 text-xs font-semibold", TONES[order.paymentTone])}>{order.payment}</span>
        <span className={cn("rounded-full px-2 py-1 text-xs font-medium", TONES.neutral)}>{order.fulfillmentLabel}</span>
      </div>
      <div className="border-shell-border flex min-h-11 items-center justify-between gap-2 border-t pt-2">
        <span className="text-foreground font-semibold tabular-nums">{order.total}</span>
        {onAccept ? (
          <Button type="button" className="h-11 px-4 font-semibold" onClick={onAccept} disabled={pending} focusableWhenDisabled>
            {text.accept}
          </Button>
        ) : null}
      </div>
    </article>
  )
}
