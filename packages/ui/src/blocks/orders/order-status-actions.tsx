"use client"

// React
import { useState } from "react"

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
 */
export function OrderStatusActions({ number, status, fulfillment, onChange, pending = false, messages = defaultMessages }: OrderStatusActionsProps) {
  const text = messages.orders.detail
  const [confirming, setConfirming] = useState(false)

  if (status === "CANCELLED") return <p className="text-muted-foreground text-sm">{text.cancelled}</p>

  const next = nextStatusOf(status, fulfillment)
  const others = otherStatusesOf(status, fulfillment)

  return (
    <div role="group" aria-label={text.statusLabel} className="flex flex-wrap items-center gap-2">
      {next ? (
        <Button type="button" onClick={() => onChange(next)} disabled={pending}>
          {text.markAs[next]}
        </Button>
      ) : null}

      <DropdownMenu>
        <DropdownMenuTrigger render={<Button type="button" variant="outline" disabled={pending} />}>
          {text.moreStatuses}
          <ChevronDownIcon aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          {others.length ? (
            <DropdownMenuGroup>
              {others.map((option) => (
                <DropdownMenuItem key={option} onClick={() => onChange(option)}>
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
                onChange("CANCELLED")
              }}
            >
              {text.cancelConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
