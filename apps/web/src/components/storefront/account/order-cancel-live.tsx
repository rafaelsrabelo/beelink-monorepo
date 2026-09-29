"use client"

// Next
import { useRouter } from "next/navigation"

// Types
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { StorefrontOrderCancel } from "@harness-monorepo/ui/blocks/storefront/storefront-order-cancel"

// App
import { orderCancelRefusalOf } from "@/lib/order-cancel-refusal"
import { useCancelShopperOrder } from "@/services/storefront/storefront-hooks"
import { ShopperOrderError } from "@/services/storefront/storefront-requests"
import { useOrderCancelNotice } from "./order-cancel-notice"

export interface OrderCancelLiveProps {
  slug: string
  number: number
  messages: UiMessages
}

/**
 * The card's cancel, wired to the shop's handler. A cancel that lands is said over the list, takes
 * focus there and reads the page again, and the card says "Cancelado" — or leaves a tab of orders on
 * their way. A refusal stays in the dialog until the shopper has read it: the order moved under
 * them, or their session ended, so the page is read again once they close it.
 */
export function OrderCancelLive({ slug, number, messages }: OrderCancelLiveProps) {
  const router = useRouter()
  const cancel = useCancelShopperOrder(slug)
  const notice = useOrderCancelNotice()
  const refusal = cancel.isError ? orderCancelRefusalOf(cancel.error instanceof ShopperOrderError ? cancel.error.errorCode : null, messages.storefront) : null

  return (
    <StorefrontOrderCancel
      number={number}
      pending={cancel.isPending}
      done={cancel.isSuccess}
      error={refusal}
      onClose={() => {
        if (!cancel.isError) return
        cancel.reset()
        router.refresh()
      }}
      landingFocus={notice?.target}
      onConfirm={() =>
        cancel.mutate(number, {
          onSuccess: () => {
            notice?.announce(number)
            router.refresh()
          },
        })
      }
      messages={messages}
    />
  )
}
