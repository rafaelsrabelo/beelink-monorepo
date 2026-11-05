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
import { markAsLabelOf, orderStatusLabelOf } from "@harness-monorepo/ui/lib/order-status-label"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { OrderFulfillmentValue, OrderStatusValue } from "./order-types"

type OpenStatus = Exclude<OrderStatusValue, "CANCELLED">

/**
 * The order a sale moves through, a pick-up's too: its `OUT_FOR_DELIVERY` is the order ready at the
 * shop, the step that tells its customer to come. Only the words differ (`orderStatusLabelOf`).
 */
const FLOW = ["RECEIVED", "ACCEPTED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"] as const satisfies readonly OpenStatus[]

/** The step after this one. */
export function nextStatusOf(status: OrderStatusValue): OpenStatus | null {
  if (status === "CANCELLED") return null
  return FLOW[FLOW.indexOf(status) + 1] ?? null
}

/** Every other status the order can be moved to by hand — the API lets one marked by mistake go back. */
export function otherStatusesOf(status: OrderStatusValue): OpenStatus[] {
  const next = nextStatusOf(status)
  return FLOW.filter((candidate) => candidate !== status && candidate !== next)
}

export interface OrderStatusActionsProps {
  number: number
  status: OrderStatusValue
  fulfillment: OrderFulfillmentValue
  onChange: (status: OrderStatusValue) => void
  /**
   * Cancelling takes more than a yes: an order that holds its customer's money is cancelled with
   * its refund, which has a screen of its own (BEELINK-208). Given, "cancel" goes there instead of
   * asking here.
   */
  onCancel?: () => void
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
export function OrderStatusActions({ number, status, fulfillment, onChange, onCancel, pending = false, messages = defaultMessages }: OrderStatusActionsProps) {
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
    setSaid(`${text.statusLabel}: ${orderStatusLabelOf(status, fulfillment, messages)}`)
    if (!box.current?.contains(document.activeElement)) box.current?.focus()
  }, [status, fulfillment, text.statusLabel, messages])

  const next = nextStatusOf(status)
  const others = otherStatusesOf(status)

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
              {markAsLabelOf(next, fulfillment, messages)}
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
                      {markAsLabelOf(option, fulfillment, messages)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              ) : null}
              {others.length ? <DropdownMenuSeparator /> : null}
              <DropdownMenuItem variant="destructive" onClick={() => (onCancel ? onCancel() : setConfirming(true))}>
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
