"use client"

// React
import { useState } from "react"

// Next
import { useRouter } from "next/navigation"

// Types
import type { CustomerProfile, PlaceCustomerOrderPayload, StorefrontRouteWords } from "@harness-monorepo/contracts"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { usePurchaseTold } from "./tracking/use-purchase-told"
import { purchaseOf, purchaseOrderOf, type Purchase } from "@/lib/purchase"
import { storefrontRoutes } from "@/lib/storefront-routes"
import { orderMessageOf, whatsappOrderHref } from "@/lib/whatsapp-order"
import { usePlaceShopperOrder } from "@/services/storefront/storefront-hooks"
import { ShopperOrderError } from "@/services/storefront/storefront-requests"

export interface CartOrderInput {
  slug: string
  /** The shop's words for its addresses: an order charged online leads to its payment screen, whose address they spell. */
  routeWords: StorefrontRouteWords
  shopName: string
  /** The shop's WhatsApp as `wa.me` wants it; null when it has none. */
  whatsapp: string | null
  shopper: CustomerProfile | null
  locale: string
  messages: UiMessages
}

/** The order once placed: its number, the WhatsApp link opened with it, or the payment screen it goes on to. */
export interface SentCartOrder {
  number: number
  href: string | null
  payHref: string | null
}

export interface CartOrderHandle {
  sent: SentCartOrder | null
  pending: boolean
  /** Why the last order was refused; null with none. */
  error: Error | null
  /** A changed cart is a new order to try: the last refusal no longer describes it. */
  reset: () => void
  /** Places the order. `placed` runs once it exists — before the page moves on; `refused` with the API's code. */
  send: (payload: PlaceCustomerOrderPayload, after: { placed: () => void; refused: (errorCode: string) => void }) => void
}

/**
 * The cart's order on its way out. The order exists — numbered, priced by the API, in the shop's
 * panel — before anything else happens. Settled with the shop, it then opens the shop's WhatsApp
 * with that number. Charged online (BEELINK-205), it opens no WhatsApp: the shopper has something
 * to do here, so the page goes on to the order's payment screen.
 *
 * An order settled with the shop is a purchase the moment it exists (BEELINK-273), and is told as
 * one from the screen that says it was sent. One charged online is none until it is paid: nothing
 * is told of it here.
 */
export function useCartOrder({ slug, routeWords, shopName, whatsapp, shopper, locale, messages }: CartOrderInput): CartOrderHandle {
  const router = useRouter()
  const placing = usePlaceShopperOrder(slug)
  const [sent, setSent] = useState<SentCartOrder | null>(null)
  const [purchase, setPurchase] = useState<Purchase | null>(null)
  usePurchaseTold(slug, purchase)

  function send(payload: PlaceCustomerOrderPayload, { placed, refused }: { placed: () => void; refused: (errorCode: string) => void }) {
    if (!shopper) return
    // Opened in the press itself: a browser blocks a tab opened after the request's wait.
    const tab = whatsapp && payload.paymentChannel !== "ONLINE" ? window.open("", "_blank") : null
    if (tab) tab.opener = null

    placing.mutate(payload, {
      onSuccess: (order) => {
        setPurchase(purchaseOf(purchaseOrderOf(order), new Date()))
        if (order.paymentChannel === "ONLINE") {
          const payHref = storefrontRoutes({ slug, routeWords }).accountOrder(order.number, { payment: true })
          setSent({ number: order.number, href: null, payHref })
          placed()
          // Last: `placed` writes this page's own address — the coupon leaving it — and must not land on the next one.
          return router.push(payHref as Parameters<typeof router.push>[0])
        }
        const href = whatsapp ? whatsappOrderHref(whatsapp, orderMessageOf({ shopName, order, customer: shopper, locale, messages })) : null
        // A refused tab leaves the link on the next screen, where opening it is the shopper's own click.
        if (tab && href) tab.location.href = href
        setSent({ number: order.number, href, payHref: null })
        placed()
      },
      onError: (error) => {
        tab?.close()
        if (error instanceof ShopperOrderError) refused(error.errorCode)
      },
    })
  }

  return { sent, pending: placing.isPending, error: placing.error, reset: placing.reset, send }
}
