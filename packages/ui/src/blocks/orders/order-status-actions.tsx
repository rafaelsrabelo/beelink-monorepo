"use client"

// React
import { useEffect, useRef, useState } from "react"

// Libs
import { ChevronDownIcon } from "lucide-react"

// UI
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@harness-monorepo/ui/components/alert-dialog"
import { Button, buttonVariants } from "@harness-monorepo/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@harness-monorepo/ui/components/dropdown-menu"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { OrderFulfillmentValue, OrderStatusValue } from "./order-types"

type OpenStatus = Exclude<OrderStatusValue, "CANCELLED">

/** The order a sale moves through. A pick-up never goes out for delivery. */
const FLOW = ["RECEIVED", "ACCEPTED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"] as const satisfies readonly OpenStatus[]

function flowOf(fulfillment: OrderFulfillmentValue): OpenStatus[] {
  return fulfillment === "PICKUP" ? FLOW.filter((status) => status !== "OUT_FOR_DELIVERY") : [...FLOW]
}

/**
 * The step after this one. Read by position, not by neighbour, so a pick-up that was marked out for
 * delivery anyway still has "delivered" ahead of it.
 */
export function nextStatusOf(status: OrderStatusValue, fulfillment: OrderFulfillmentValue): OpenStatus | null {
  if (status === "CANCELLED") return null
  const rank = FLOW.indexOf(status)
  return flowOf(fulfillment).find((candidate) => FLOW.indexOf(candidate) > rank) ?? null
}

/** Every other status the order can be moved to by hand — the API lets one marked by mistake go back. */
export function otherStatusesOf(status: OrderStatusValue, fulfillment: OrderFulfillmentValue): OpenStatus[] {
  const next = nextStatusOf(status, fulfillment)
  return flowOf(fulfillment).filter((candidate) => candidate !== status && candidate !== next)
}

export interface OrderStatusActionsProps {
  number: number
  status: OrderStatusValue
  fulfillment: OrderFulfillmentValue
  onChange: (status: OrderStatusValue) => void
  pending?: boolean
  messages?: UiMessages
}

/**
 * Moving an order along: its next step as the obvious button, the rest in a menu, and cancelling
 * behind a confirmation — a cancelled order leaves its customer's books and never comes back.
 *
 * The buttons stay focusable while the move is on its way: a button that turns disabled under the
 * focus drops it to the page. When the move takes the pressed control away — "entregue" has no
 * next step, a cancelled order has no controls — the focus goes to this block instead, and the new
 * status is said. Only after a press here: an order that moves in another tab moves no one's focus.
 */
export function OrderStatusActions({ number, status, fulfillment, onChange, pending = false, messages = defaultMessages }: OrderStatusActionsProps) {
  const text = messages.orders.detail
  const [confirming, setConfirming] = useState(false)
  const [said, setSaid] = useState("")
  const box = useRef<HTMLDivElement>(null)
  const pressed = useRef(false)

  const move = (to: OrderStatusValue) => {
    pressed.current = true
    onChange(to)
  }

  useEffect(() => {
    if (!pressed.current) return
    pressed.current = false
    setSaid(`${text.statusLabel}: ${messages.orders.statuses[status]}`)
    if (!box.current?.contains(document.activeElement)) box.current?.focus()
  }, [status, text.statusLabel, messages.orders.statuses])

  const next = nextStatusOf(status, fulfillment)
  const others = otherStatusesOf(status, fulfillment)

  return (
    <div ref={box} tabIndex={-1} className="outline-none">
      <p role="status" className="sr-only">
        {said}
      </p>
      {status === "CANCELLED" ? (
        <p className="text-muted-foreground text-sm">{text.cancelled}</p>
      ) : (
        <div role="group" aria-label={text.statusLabel} className="flex flex-wrap items-center gap-2">
          {next ? (
            <Button type="button" onClick={() => move(next)} disabled={pending} focusableWhenDisabled>
              {text.markAs[next]}
            </Button>
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger render={<Button type="button" variant="outline" disabled={pending} focusableWhenDisabled />}>
              {text.moreStatuses}
              <ChevronDownIcon aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-60">
              {others.length ? (
                <DropdownMenuGroup>
                  {others.map((option) => (
                    <DropdownMenuItem key={option} onClick={() => move(option)}>
                      {text.markAs[option]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              ) : null}
              {others.length ? <DropdownMenuSeparator /> : null}
              <DropdownMenuItem variant="destructive" onClick={() => setConfirming(true)}>
                {text.cancel}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <AlertDialog open={confirming} onOpenChange={setConfirming}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{format(text.cancelTitle, { number: String(number) })}</AlertDialogTitle>
                <AlertDialogDescription>{text.cancelBody}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{text.cancelKeep}</AlertDialogCancel>
                <AlertDialogAction
                  className={cn(buttonVariants({ variant: "destructive" }))}
                  onClick={() => {
                    setConfirming(false)
                    move("CANCELLED")
                  }}
                >
                  {text.cancelConfirm}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  )
}
