// React
import { useId } from "react"

// Libs
import { BellRingIcon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import type { GestorCardView } from "./gestor-types"

export interface GestorRingingProps {
  /** The new order waiting the longest: the one the bell rings for. */
  order: GestorCardView
  /** New orders waiting besides it. */
  waiting: number
  onAccept: () => void
  onRefuse: () => void
  pending?: boolean
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * The band over the board while an order waits: what it is, and the two answers the bell waits for.
 * Accepting or refusing is what stops it — there is no "silence" here, by design.
 */
export function GestorRinging({ order, waiting, onAccept, onRefuse, pending = false, linkComponent: Link = AnchorLink, messages = defaultMessages }: GestorRingingProps) {
  const text = messages.gestor.board
  const id = useId()

  return (
    <section aria-labelledby={id} className="bg-header text-header-foreground flex flex-wrap items-center gap-4 rounded-2xl p-4 motion-safe:animate-gestor-ring">
      <span aria-hidden="true" className="bg-header-accent text-header flex size-12 shrink-0 items-center justify-center rounded-full">
        <BellRingIcon className="size-6 origin-top motion-safe:animate-gestor-bell" />
      </span>
      <div className="flex min-w-0 flex-1 basis-72 flex-col gap-0.5">
        <h2 id={id} className="text-lg font-bold">
          <Link href={order.href} className="focus-visible:ring-header-accent rounded-sm outline-none hover:underline focus-visible:ring-2">
            {format(text.ringingTitle, { number: String(order.number), total: order.total })}
          </Link>
        </h2>
        <p className="text-sm">{format(text.ringingDetail, { customer: order.customer, fulfillment: order.fulfillmentLabel, payment: order.payment, when: order.age })}</p>
        <p className="text-xs">
          {text.ringingHint}
          {waiting > 0 ? ` ${format(text.moreWaiting, { count: String(waiting) })}` : null}
        </p>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="h-12 px-5 font-semibold" onClick={onRefuse} disabled={pending} focusableWhenDisabled>
          {text.refuse}
        </Button>
        <Button type="button" className="h-12 px-5 text-base font-bold" onClick={onAccept} disabled={pending} focusableWhenDisabled>
          {text.acceptOrder}
        </Button>
      </div>
    </section>
  )
}
