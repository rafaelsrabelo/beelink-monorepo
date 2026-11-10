// UI
import { buttonVariants } from "@harness-monorepo/ui/components/button"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { GestorOrderCard } from "./gestor-order-card"
import { GestorRinging } from "./gestor-ringing"
import type { GestorColumnKey, GestorColumns } from "./gestor-types"

export type { GestorCardView, GestorColumnKey, GestorColumns, GestorPaymentTone } from "./gestor-types"

const COLUMNS = ["NEW", "PREPARING", "ON_THE_WAY", "DONE"] as const satisfies readonly GestorColumnKey[]

export interface GestorBoardProps {
  columns: GestorColumns
  onAccept: (number: number) => void
  onRefuse: (number: number) => void
  /** The order a move is on its way for; its buttons wait. */
  pendingNumber?: number | null
  /** The order opened beside the board. */
  current?: number | null
  allOrdersHref: string
  newSaleHref: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * The counter (plan 2026-11-10--modo-gestor): the orders in four columns, new to done, and — while
 * any is new — the band naming the one waiting the longest, which is what the bell rings for.
 */
export function GestorBoard({ columns, onAccept, onRefuse, pendingNumber = null, current = null, allOrdersHref, newSaleHref, linkComponent: Link = AnchorLink, messages = defaultMessages }: GestorBoardProps) {
  const text = messages.gestor.board
  // A column is a queue, the oldest first: the one waiting the longest leads it.
  const ringing = columns.NEW[0] ?? null

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-foreground text-2xl font-bold text-balance">{text.title}</h1>
          <p className="text-shell-muted text-sm">{text.intro}</p>
        </div>
        <Link href={newSaleHref} className={buttonVariants({ className: "h-11 px-4 font-semibold" })}>
          {text.newSale}
        </Link>
      </header>

      {/* Always there, so a reader hears the band when it comes. */}
      <div aria-live="polite">
        {ringing ? (
          <GestorRinging
            order={ringing}
            waiting={columns.NEW.length - 1}
            onAccept={() => onAccept(ringing.number)}
            onRefuse={() => onRefuse(ringing.number)}
            pending={pendingNumber === ringing.number}
            linkComponent={Link}
            messages={messages}
          />
        ) : null}
      </div>

      <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((key) => {
          const cards = columns[key]
          return (
            <section key={key} aria-labelledby={`gestor-${key}`} className="bg-shell flex flex-col gap-2.5 rounded-2xl p-3">
              <h2 id={`gestor-${key}`} className="text-foreground flex justify-between px-1.5 py-1 text-sm font-bold">
                <span>{text.columns[key]}</span>{" "}
                <span className="text-shell-muted tabular-nums">{cards.length}</span>
              </h2>
              {cards.length === 0 ? <p className="text-shell-muted px-2 py-5 text-center text-sm">{key === "NEW" ? text.emptyNew : text.emptyColumn}</p> : null}
              {cards.map((order) => (
                <GestorOrderCard
                  key={order.number}
                  order={order}
                  onAccept={key === "NEW" ? () => onAccept(order.number) : undefined}
                  pending={pendingNumber === order.number}
                  ringing={key === "NEW"}
                  current={current === order.number}
                  linkComponent={Link}
                  messages={messages}
                />
              ))}
              {key === "DONE" ? (
                <Link href={allOrdersHref} className="focus-visible:ring-ring rounded-sm px-1.5 py-1 text-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2">
                  {text.allOrders}
                </Link>
              ) : null}
            </section>
          )
        })}
      </div>
    </div>
  )
}
