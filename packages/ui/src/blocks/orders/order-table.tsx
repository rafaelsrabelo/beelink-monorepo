// UI
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@harness-monorepo/ui/components/table"

// Locales
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { LinkComponent } from "../auth/auth-link"
import { OrderStatusBadge } from "./order-status-badge"
import type { OrderListItem } from "./order-types"

export interface OrderRowsProps {
  orders: readonly OrderListItem[]
  hrefOf: (number: number) => string
  money: (cents: number) => string
  when: (iso: string) => string
  linkComponent: LinkComponent
  messages: UiMessages
}

/** How many units, in the shopkeeper's words: "1 item", "3 itens". */
export function itemsLabel(count: number, messages: UiMessages): string {
  return count === 1 ? messages.orders.itemsOne : format(messages.orders.itemsCount, { count: String(count) })
}

/**
 * The list as a table, where there is room for one. The order number is the row's link, named in
 * full, so a screen reader lands on "Abrir o pedido #12, de Bia" and not on a bare "12".
 */
export function OrderTable({ orders, hrefOf, money, when, linkComponent: Link, messages }: OrderRowsProps) {
  const text = messages.orders

  return (
    <div className="bg-shell-surface border-shell-border rounded-xl border shadow-xs">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="w-24">{text.number}</TableHead>
            <TableHead className="w-36">{text.placedAt}</TableHead>
            <TableHead>{text.customer}</TableHead>
            <TableHead className="w-24">{text.items}</TableHead>
            <TableHead className="w-32 text-right">{text.total}</TableHead>
            <TableHead className="w-40">{text.payment}</TableHead>
            <TableHead className="w-40">{text.status}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.number} className="relative">
              <TableCell className="font-medium tabular-nums">
                {/* The whole row answers the click, through the one link it has. */}
                <Link
                  href={hrefOf(order.number)}
                  aria-label={format(text.open, { number: String(order.number), name: order.customer.name })}
                  className="focus-visible:ring-ring rounded-sm outline-none after:absolute after:inset-0 hover:underline focus-visible:ring-2"
                >
                  #{order.number}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground tabular-nums">{when(order.placedAt)}</TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="max-w-56 truncate font-medium" title={order.customer.name}>
                    {order.customer.name}
                  </span>
                  {order.customer.phone ? <span className="text-muted-foreground text-xs tabular-nums">{order.customer.phone}</span> : null}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{itemsLabel(order.itemsCount, messages)}</TableCell>
              <TableCell className="text-right font-medium tabular-nums">{money(order.totalCents)}</TableCell>
              <TableCell className="text-muted-foreground">{text.payments[order.paymentMethod]}</TableCell>
              <TableCell>
                <OrderStatusBadge status={order.status} messages={messages} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
