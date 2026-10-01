"use client"

// React
import { useEffect, useMemo } from "react"

// Next
import { useRouter } from "next/navigation"

// Libs
import { useMutation, useQueryClient } from "@tanstack/react-query"

// Types
import type { OrderFulfillment, OrderQuote, QuotedCoupon } from "@harness-monorepo/contracts"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { formatCents } from "@harness-monorepo/ui/blocks/storefront/storefront-price"
import { couponRefusalTextOf } from "@harness-monorepo/ui/lib/order-discounts"

// App
import { useCart } from "./cart-provider"
import { cartPricingOf, cartQuoteOf, sameCart, type CartPricing, type ServedQuote } from "@/lib/cart-pricing"
import type { CartView } from "@/lib/cart-view"
import { useDebouncedValue } from "@/services/addresses/use-debounced-value"
import { storefrontKeys, useCartQuote } from "@/services/storefront/storefront-hooks"
import { quoteCart, ShopperOrderError } from "@/services/storefront/storefront-requests"

/** Long enough for a run of presses on "+" to be one question, short enough that the total does not feel late. */
const QUANTITY_DEBOUNCE_MS = 300

export interface CartPricingInput {
  slug: string
  view: CartView
  fulfillment: OrderFulfillment
  /** A coupon is a signed-in shopper's: a visitor's cart is priced without one. */
  signedIn: boolean
  /** The price the page was served with; null when the server could not ask for one. */
  served: ServedQuote | null
  locale: string
  messages: UiMessages
}

export interface CartCouponHandle {
  /** The coupon in force, as the shop stores it; null with none. */
  applied: string | null
  /** It is counting in the totals on screen. */
  holding: boolean
  /** A code just typed is being checked. */
  pending: boolean
  /** Why the code typed was not taken, or why the one in force does not hold now. */
  error: string | null
  apply: (code: string) => void
  remove: () => void
  /** The shopper is typing again: the last code's refusal no longer describes the field. */
  edit: () => void
}

export interface CartPricingHandle extends CartPricing {
  /** No price yet: the summary waits as a skeleton. */
  pricing: boolean
  /** The amounts on screen are the ones before the last change. */
  stale: boolean
  coupon: CartCouponHandle
  /** What goes with the order: the coupon the screen says is applied, and no other. */
  orderCoupon: string | null
  /** Why the order cannot go out yet over its coupon: it is still being checked, or the check failed. */
  couponBlock: "checking" | "failed" | null
  /** Asks for the price again, whatever is kept: an order was refused over what it said. */
  recheck: () => void
}

function failureOf(error: unknown, text: UiMessages["storefront"]): string {
  const code = error instanceof ShopperOrderError ? error.errorCode : "UNKNOWN"
  if (code === "RATE_LIMITED" || code === "TOO_MANY_REQUESTS") return text.couponTooMany
  return code === "AUTH_UNAUTHENTICATED" ? text.checkoutSignedOut : text.couponFailed
}

/**
 * The cart's price and its coupon (BEELINK-194), as the cart page reads them. The price is the
 * API's, asked again as the cart changes; the coupon is asked about once, when it is applied, and
 * then follows the cart — a code that was refused is said and dropped, never sent again with every
 * press of "+".
 */
export function useCartPricing({ slug, view, fulfillment, signedIn, served, locale, messages }: CartPricingInput): CartPricingHandle {
  const text = messages.storefront
  const router = useRouter()
  const queryClient = useQueryClient()
  const kept = useCart((cart) => cart.coupon)
  const setCoupon = useCart((cart) => cart.setCoupon)
  const coupon = signedIn ? kept : null

  // The quantities settle before they are asked about; how it leaves and the coupon are one press each.
  const rows = useDebouncedValue(view.rows, QUANTITY_DEBOUNCE_MS)
  const cart = useMemo(() => cartQuoteOf(rows, fulfillment, coupon), [rows, fulfillment, coupon])
  // By what is asked, not by identity: a page read again hands over the same cart as new rows.
  const settling = useMemo(() => !sameCart(cartQuoteOf(view.rows, fulfillment, coupon), cart), [view.rows, fulfillment, coupon, cart])
  const quote = useCartQuote(slug, cart, served)
  const signedOut = quote.error instanceof ShopperOrderError && quote.error.errorCode === "AUTH_UNAUTHENTICATED"
  const context = { pickup: fulfillment === "PICKUP", money: (cents: number) => formatCents(cents, locale, "BRL") }
  const refusalOf = (verdict: QuotedCoupon | null | undefined) => (verdict?.status === "REFUSED" ? couponRefusalTextOf(verdict, context, text) : null)

  const applying = useMutation({
    mutationFn: async (code: string): Promise<OrderQuote> => {
      const asked = cartQuoteOf(view.rows, fulfillment, code)
      const answer = await quoteCart(slug, asked)
      if (answer.coupon?.status === "APPLIED") {
        // Kept here, before the mutation settles: the price just read is the one the cart reads next,
        // under the code as the shop stores it, and the field hands over to the coupon in one draw.
        queryClient.setQueryData(storefrontKeys.quote(slug, cartQuoteOf(view.rows, fulfillment, answer.coupon.code)), answer)
        setCoupon(answer.coupon.code)
      }
      return answer
    },
    // The session ended while the code was typed: the page reads the shop again, as a visitor.
    onError: (error) => {
      if (error instanceof ShopperOrderError && error.errorCode === "AUTH_UNAUTHENTICATED") router.refresh()
    },
  })

  // The session ended under a coupon in force: the page reads the shop again, and prices the cart as a visitor's.
  useEffect(() => {
    if (signedOut) router.refresh()
  }, [signedOut, router])

  // The answer for the cart on screen — not one kept from a moment ago, nor one for quantities still settling.
  const fresh = quote.data && !quote.isPlaceholderData && !settling ? quote.data : null
  const verdict = coupon ? fresh?.coupon : null
  const failed = coupon !== null && !settling && !fresh && quote.isError
  const couponBlock = coupon === null || fresh ? null : failed ? "failed" : "checking"

  const error = coupon
    ? (refusalOf(verdict) ?? (failed ? failureOf(quote.error, text) : null))
    : applying.isError
      ? failureOf(applying.error, text)
      : applying.data
        ? (refusalOf(applying.data.coupon) ?? (applying.data.coupon ? null : text.couponFailed))
        : null

  return {
    ...cartPricingOf(quote.data ?? null, view, { fulfillment, locale, messages }),
    pricing: cart.items.length > 0 && quote.isPending,
    stale: settling || quote.isPlaceholderData,
    coupon: {
      applied: coupon,
      holding: verdict?.status === "APPLIED",
      pending: applying.isPending,
      error,
      apply: (code) => applying.mutate(code),
      remove: () => {
        setCoupon(null)
        applying.reset()
      },
      edit: () => {
        if (!applying.isIdle && !applying.isPending) applying.reset()
      },
    },
    orderCoupon: verdict?.status === "APPLIED" ? coupon : null,
    couponBlock,
    recheck: () => void queryClient.invalidateQueries({ queryKey: storefrontKeys.quotes(slug) }),
  }
}
