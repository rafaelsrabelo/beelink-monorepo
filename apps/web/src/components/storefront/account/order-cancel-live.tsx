"use client"

// Next
import { useRouter } from "next/navigation"

// Types
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { StorefrontOrderCancel } from "@harness-monorepo/ui/blocks/storefront/storefront-order-cancel"

// App
import { useCancelShopperOrder } from "@/services/storefront/storefront-hooks"
import { ShopperOrderError } from "@/services/storefront/storefront-requests"

export interface OrderCancelLiveProps {
  slug: string
  number: number
  messages: UiMessages
}

/** Why a cancel was refused, in the shopper's words. */
function refusalOf(error: unknown, text: UiMessages["storefront"]): string {
  const code = error instanceof ShopperOrderError ? error.errorCode : "UNKNOWN"
  switch (code) {
    case "ORDER_NOT_CANCELLABLE":
      return text.orderCancelRefusedAccepted
    case "ORDER_CANCELLED":
      return text.orderCancelRefusedDone
    case "AUTH_UNAUTHENTICATED":
      return text.checkoutSignedOut
    default:
      return text.orderCancelFailed
  }
}

/** The card's cancel, wired to the shop's handler: once it lands, the page is read again and the card says "Cancelado". */
export function OrderCancelLive({ slug, number, messages }: OrderCancelLiveProps) {
  const router = useRouter()
  const cancel = useCancelShopperOrder(slug)

  return (
    <StorefrontOrderCancel
      number={number}
      pending={cancel.isPending}
      error={cancel.error ? refusalOf(cancel.error, messages.storefront) : null}
      // Refused as already moved by the shop: the list is stale either way, so it is read again too.
      onConfirm={() => cancel.mutate(number, { onSettled: () => router.refresh() })}
      messages={messages}
    />
  )
}
