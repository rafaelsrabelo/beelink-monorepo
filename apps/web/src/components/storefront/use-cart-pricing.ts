"use client"

// React
import { useCallback, useEffect, useMemo, useState } from "react"

// Next
import { useRouter } from "next/navigation"

// Libs
import { useMutation, useQueryClient } from "@tanstack/react-query"

// Types
import type { CouponRefusalReason, CustomerOrderQuotePayload, OrderFulfillment, OrderQuote, OrderShippingChoice, QuotedCoupon } from "@harness-monorepo/contracts"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { formatCents } from "@harness-monorepo/ui/blocks/storefront/storefront-price"
import { couponRefusalTextOf } from "@harness-monorepo/ui/lib/order-discounts"

// App
import { pathWithCoupon } from "@/lib/cart-coupon"
import { cartPricingOf, cartQuoteOf, sameCart, type CartCreditHandle, type CartPricing, type ServedQuote } from "@/lib/cart-pricing"
import type { CartView } from "@/lib/cart-view"
import { useDebouncedValue } from "@/services/addresses/use-debounced-value"
import { storefrontKeys, useAnsweredCartQuote, useCartQuote } from "@/services/storefront/storefront-hooks"
import { quoteCart, ShopperOrderError } from "@/services/storefront/storefront-requests"

/** Long enough for a run of presses on "+" to be one question, short enough that the total does not feel late. */
export const QUANTITY_DEBOUNCE_MS = 300

export interface CartPricingInput {
  slug: string
  view: CartView
  fulfillment: OrderFulfillment
  /** The saved address a delivery would go to (BEELINK-178): the shop's ways to get there are priced with the cart. Null for a visitor, and with none saved. */
  addressId: string | null
  /** The carrier a delivery would go by, once one was picked (BEELINK-186): its fee is in the totals. Null goes by the shop's own. */
  shipping: OrderShippingChoice | null
  /**
   * Who is asking: the signed-in shopper's id, or null for a visitor. A coupon is a shopper's — a
   * visitor's cart is priced without one — and so is a price, since a first-purchase promotion is.
   */
  shopperId: string | null
  /** The price the page was served with; null when the server could not ask for one. */
  served: ServedQuote | null
  /** The coupon the page's address named — one carried back from adding an address, or a link's; null with none. */
  arrivedWith: string | null
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
  /** The coupon the address carries, whoever is looking: the links that leave the cart and come back take it along. */
  carried: string | null
  /** What goes with the order: the coupon the screen says is applied, and no other. */
  orderCoupon: string | null
  /** Why the order cannot go out yet over its coupon: a code is still being checked, or the check failed. */
  couponBlock: "checking" | "failed" | null
  /** The shopper's credit to offer; null for a visitor, and for a shopper with none to spend. */
  credit: CartCreditHandle | null
  /** What goes with the order: the credit the totals on screen took, and no other. Zero with the box unticked. */
  orderCashbackCents: number
  /** Why the order cannot go out yet over its credit: the price with it is still being asked, or the asking failed. */
  creditBlock: "checking" | "failed" | null
  /** Asks for the price again, whatever is kept: an order was refused over what it said. */
  recheck: () => void
  /** The order went out with them: the coupon leaves the address and the box is unticked, so the next cart starts without either. */
  forget: () => void
}

function failureOf(error: unknown, text: UiMessages["storefront"]): string {
  const code = error instanceof ShopperOrderError ? error.errorCode : "UNKNOWN"
  if (code === "RATE_LIMITED" || code === "TOO_MANY_REQUESTS") return text.couponTooMany
  return code === "AUTH_UNAUTHENTICATED" ? text.checkoutSignedOut : text.couponFailed
}

/** The refusals no change of the cart undoes: asking again with every press of "+" would only spend the door's limit. */
const FINAL: readonly CouponRefusalReason[] = ["NOT_FOUND", "EXPIRED", "EXHAUSTED", "INACTIVE", "CUSTOMER_LIMIT", "NOT_FIRST_PURCHASE"]

/** The cart itself cannot be priced — a line the shop stopped selling — whatever its coupon. */
function isCartRefusal(error: unknown): boolean {
  return error instanceof ShopperOrderError && error.errorCode.startsWith("ORDER_")
}

/**
 * The cart's price and its coupon (BEELINK-194), as the cart page reads them. The price is the
 * API's, asked again as the cart changes. A code typed is asked about once: taken, it is kept and
 * follows the cart; refused, it is said and dropped. One kept that is refused for good — expired,
 * used up — stays on screen with its reason and is not asked about again.
 *
 * The coupon in force is this page's own state, written through to the page's address (`cart-coupon.ts`)
 * so a reload, and the trip to add an address, come back with it.
 *
 * The shopper's cashback (BEELINK-244) is a box, unticked on arrival: ticked, the cart is asked about
 * with it, and the order takes what that answer applied — never an amount from an answer kept from
 * before, which is the cart of a moment ago.
 */
export function useCartPricing({ slug, view, fulfillment, addressId, shipping, shopperId, served, arrivedWith, locale, messages }: CartPricingInput): CartPricingHandle {
  const text = messages.storefront
  const router = useRouter()
  const queryClient = useQueryClient()
  const [kept, setKept] = useState(arrivedWith)
  // The question whose answer refused the coupon for good. The answer itself is read back from the cache.
  const [settledBy, setSettledBy] = useState<CustomerOrderQuotePayload | null>(null)
  const settled = useAnsweredCartQuote(slug, shopperId, settledBy)?.coupon
  const setCoupon = useCallback((code: string | null) => {
    setKept(code)
    setSettledBy(null)
    // `replaceState`, not a navigation: the address changes under the page and nothing is read again.
    // With no state of the router's own: handed its state back, Next takes the call for one of its
    // own, keeps the old address as the page's, and puts it back at the next `router.refresh()`.
    window.history.replaceState(null, "", pathWithCoupon(`${window.location.pathname}${window.location.search}`, code))
  }, [])
  const coupon = shopperId ? kept : null
  // Credit is somebody's: a session that ended under a ticked box asks as a visitor, without it.
  const [spending, setSpending] = useState(false)
  const useCredit = shopperId !== null && spending
  const dead = coupon !== null && settledBy?.couponCode === coupon && settled?.status === "REFUSED" ? settled : null
  // What the price is asked with: the coupon in force, unless it was refused for good.
  const asked = dead ? null : coupon

  // The quantities settle before they are asked about; how it leaves and the coupon are one press each.
  const rows = useDebouncedValue(view.rows, QUANTITY_DEBOUNCE_MS)
  const cart = useMemo(() => cartQuoteOf(rows, fulfillment, asked, { addressId, shipping, useCashback: useCredit }), [rows, fulfillment, asked, addressId, shipping, useCredit])
  // By what is asked, not by identity: a page read again hands over the same cart as new rows.
  const settling = useMemo(
    () => !sameCart(cartQuoteOf(view.rows, fulfillment, asked, { addressId, shipping, useCashback: useCredit }), cart),
    [view.rows, fulfillment, asked, addressId, shipping, useCredit, cart],
  )
  const extras = { addressId, shipping, useCashback: useCredit }
  const quote = useCartQuote(slug, shopperId, cart, served)
  const signedOut = quote.error instanceof ShopperOrderError && quote.error.errorCode === "AUTH_UNAUTHENTICATED"
  const context = { pickup: fulfillment === "PICKUP", money: (cents: number) => formatCents(cents, locale, "BRL") }
  const refusalOf = (verdict: QuotedCoupon | null | undefined) => (verdict?.status === "REFUSED" ? couponRefusalTextOf(verdict, context, text) : null)

  const applying = useMutation({
    mutationFn: async (code: string): Promise<OrderQuote> => {
      const cartNow = cartQuoteOf(view.rows, fulfillment, code, extras)
      const answer = await quoteCart(slug, cartNow)
      if (answer.coupon?.status === "APPLIED") {
        // Kept here, before the mutation settles: the price just read is the one the cart reads next,
        // under the code as the shop stores it, and the field hands over to the coupon in one draw.
        queryClient.setQueryData(storefrontKeys.quote(slug, shopperId, cartQuoteOf(view.rows, fulfillment, answer.coupon.code, extras)), answer)
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

  const errored = !settling && quote.isError
  // The cart cannot be priced at all, coupon or not: the order is left to go out, and its refusal names the line.
  const cartRefused = errored && isCartRefusal(quote.error)
  // With a coupon asked about, an answer that failed is no answer — not even the one kept from before it.
  const unanswered = asked !== null && errored
  // The answer for the cart on screen — not one kept from a moment ago, nor one for quantities still settling.
  const fresh = quote.data && !quote.isPlaceholderData && !settling && !unanswered ? quote.data : null
  const verdict = asked ? fresh?.coupon : null
  // Refused for good: remembered during the draw itself, so the next question already leaves the code out.
  if (asked && verdict?.status === "REFUSED" && FINAL.includes(verdict.reason)) setSettledBy(cart)

  const failed = unanswered && !cartRefused
  const couponBlock = applying.isPending ? "checking" : asked === null || fresh || cartRefused ? null : failed ? "failed" : "checking"
  // What the coupon's own lines say: the last answer about this very code, kept while the cart is priced
  // again — said from the fresh one alone, "aplicado" would blink at every press of "+".
  const last = asked && !unanswered && quote.data?.coupon?.code.toUpperCase() === asked.toUpperCase() ? quote.data.coupon : null

  const error = coupon
    ? (refusalOf(dead ?? last) ?? (failed ? failureOf(quote.error, text) : null))
    : applying.isError
      ? failureOf(applying.error, text)
      : applying.data
        ? (refusalOf(applying.data.coupon) ?? (applying.data.coupon ? null : text.couponFailed))
        : null
  // The credit the order may take is the one in the answer to this very cart — never one kept on
  // screen from the cart before it, nor one read before a failed asking.
  const answered = useCredit && quote.data && !quote.isPlaceholderData && !settling && !quote.isError ? quote.data : null
  const creditBlock = !useCredit || answered || cartRefused ? null : errored ? "failed" : "checking"
  // Offered from the last answer, kept while the cart is priced again: the box does not blink at every press of "+".
  const offered = shopperId !== null && !quote.isError ? quote.data?.cashbackUse : null

  // Nothing orderable is nothing to price: the answer kept from the cart before it is not this cart's.
  const priced = cart.items.length === 0 || unanswered ? null : (quote.data ?? null)

  return {
    ...cartPricingOf(priced, view, { fulfillment, locale, messages }),
    pricing: cart.items.length > 0 && quote.isPending,
    stale: cart.items.length > 0 && (settling || quote.isPlaceholderData),
    coupon: {
      applied: coupon,
      holding: last?.status === "APPLIED",
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
    carried: kept,
    // The coupon the screen shows as applied — or, with a cart the API could not price, the one in
    // force: the order is refused for that cart, and should it go through, the API decides the coupon.
    orderCoupon: verdict?.status === "APPLIED" || (asked !== null && cartRefused) ? asked : null,
    couponBlock,
    credit:
      offered && offered.balanceCents > 0
        ? { balanceCents: offered.balanceCents, maxCents: offered.maxCents, nothingToPay: offered.unavailable === "NOTHING_TO_PAY", checked: useCredit, toggle: setSpending }
        : null,
    orderCashbackCents: answered?.cashbackUse?.appliedCents ?? 0,
    creditBlock,
    recheck: () => void queryClient.invalidateQueries({ queryKey: storefrontKeys.quotes(slug) }),
    forget: () => {
      setCoupon(null)
      setSpending(false)
    },
  }
}
