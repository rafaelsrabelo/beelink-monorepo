"use client"

// React
import { useEffect, useMemo, useState } from "react"

// Next
import { useRouter } from "next/navigation"

// Types
import type { StorefrontPaymentOptions } from "@harness-monorepo/contracts"
import type { StorefrontCartLiveProps } from "./storefront-cart-live.types"

// UI
import { StorefrontCart } from "@harness-monorepo/ui/blocks/storefront/storefront-cart"
import { StorefrontCheckout } from "@harness-monorepo/ui/blocks/storefront/storefront-checkout"
import { StorefrontOrderSent } from "@harness-monorepo/ui/blocks/storefront/storefront-order-sent"
import { formatCents } from "@harness-monorepo/ui/blocks/storefront/storefront-price"

// App
import { CartPriceControls } from "./cart-price-controls"
import { useCart } from "./cart-provider"
import { useCartCheckout } from "./use-cart-checkout"
import { useCartOrder } from "./use-cart-order"
import { CHECKOUT_ANCHOR, useCheckoutAddressForm } from "./use-checkout-address-form"
import { useCheckoutIdentity } from "./use-checkout-identity"
import { useCheckoutTracking } from "./use-checkout-tracking"
import { waysBackWithCoupon } from "@/lib/cart-coupon"
import { cartViewOf, orderItemsOf, rowKeyOf } from "@/lib/cart-view"
import { checkoutChannelOf } from "@/lib/checkout-payment"
import { checkoutRefusalOf, REPRICED, rereadsTheCart } from "@/lib/checkout-refusal"
import { isReachable } from "@/lib/customer-address"
import { ShopperOrderError } from "@/services/storefront/storefront-requests"

export type { StorefrontCartLiveProps } from "./storefront-cart-live.types"

/** The checkout of a shop that charges nothing online: its own labels, settled with it. */
const SETTLED_WITH_THE_SHOP: StorefrontPaymentOptions = { online: null, offline: true }

/**
 * The cart page, following the cart as it changes. Quantities and removals go to the store — which
 * writes the cookie — and the totals are the API's price of the cart (BEELINK-194): the promotions
 * and the coupon each on their row, by the one calculation the order is written with.
 *
 * Placing the order asks the API first: the order exists — numbered, priced by the API, in the
 * shop's panel — before the shop's WhatsApp opens with that number. The cart is emptied only then.
 * It carries the coupon the summary shows as applied, and no other — and of the shopper's cashback,
 * the amount on the summary's own row (BEELINK-244).
 *
 * An order charged online (BEELINK-205) opens no WhatsApp and goes on to its payment screen: the
 * sending itself is `useCartOrder`'s.
 */
export function StorefrontCartLive({
  slug,
  products,
  hrefs,
  continueHref,
  goneOnArrival,
  shopName,
  whatsapp,
  routeWords,
  paymentMethods,
  paymentOptions = SETTLED_WITH_THE_SHOP,
  shopper,
  identityHrefs,
  deliverTo = null,
  addressError = null,
  identity = null,
  arrival,
  served = null,
  servedOffers = null,
  signedOutBenefit = null,
  coupon = null,
  locale,
  messages,
}: StorefrontCartLiveProps) {
  const text = messages.storefront
  const router = useRouter()
  const lines = useCart((cart) => cart.lines)
  const setQty = useCart((cart) => cart.setQty)
  const remove = useCart((cart) => cart.remove)
  const clear = useCart((cart) => cart.clear)
  const order = useCartOrder({ slug, routeWords, shopName, whatsapp, shopper, locale, messages })
  // What the last press on the button found missing, before anything was sent.
  const [asked, setAsked] = useState<"payment" | "coupon" | "credit" | "shipping" | null>(null)
  const view = useMemo(() => cartViewOf(lines, products), [lines, products])
  const told = useCheckoutTracking(view)
  const byKey = useMemo(() => new Map(view.rows.map((row) => [rowKeyOf(row), row])), [view.rows])
  const { addresses, choice, setChoice, pricing, offers, shipping, blocked, sent: leaving, recipientDocument, offlineMethods, online, nothingToPay, payment } = useCartCheckout({ slug, view, shopper, paymentMethods, paymentOptions, deliverTo, served, servedOffers, arrivedWith: coupon, addressRefused: addressError !== null, locale, messages })
  const paysOnline = payment?.paymentChannel === "ONLINE"
  // Each way out of the cart that comes back to it — to sign in, to change details, to add an address — takes the coupon along.
  const ways = useMemo(() => waysBackWithCoupon(identityHrefs, pricing.carried), [identityHrefs, pricing.carried])
  const addressForm = useCheckoutAddressForm({ slug, shopper, cartHref: identityHrefs.cartHref, coupon: pricing.carried, error: addressError, messages })
  const whoIsBuying = useCheckoutIdentity({ slug, identity: shopper ? null : identity, cartHref: identityHrefs.cartHref, coupon: pricing.carried, signInHref: ways.signInHref, signUpHref: ways.signUpHref, messages })

  // A line the shop no longer sells is taken out of the cookie once, rather than asked for forever.
  useEffect(() => {
    for (const line of view.gone) remove(line.productId, line.variantId)
  }, [view.gone, remove])

  if (order.sent) return <StorefrontOrderSent {...order.sent} continueHref={continueHref} messages={messages} />

  function place() {
    // The shop does not reach the address, or hands nothing over now: nothing is sent to be refused.
    if (blocked) return setAsked("shipping")
    if (!payment) return setAsked("payment")
    // A coupon in force, or credit ticked, whose price did not come back: the order would go out at
    // a price nobody read. The press asks for it again; the button waits for the answer.
    if (pricing.couponBlock || pricing.creditBlock) {
      pricing.recheck()
      return setAsked(pricing.couponBlock ? "coupon" : "credit")
    }
    setAsked(null)

    order.send(
      {
        items: orderItemsOf(view.rows),
        fulfillment: choice.fulfillment,
        ...payment,
        // Where a delivery goes, the carrier it goes by and the fee the summary shows: the API quotes again, and refuses the order at any other (BEELINK-178).
        ...leaving,
        ...(pricing.orderCoupon ? { couponCode: pricing.orderCoupon } : {}),
        ...(pricing.orderCashbackCents > 0 ? { cashbackCents: pricing.orderCashbackCents } : {}),
      },
      {
        placed: () => {
          clear()
          pricing.forget()
        },
        refused: (errorCode) => {
          // The session, the shopper's record or the shop's payments moved: the page reads them again.
          if (rereadsTheCart(errorCode)) router.refresh()
          // The coupon, the delivery's fee or the credit stopped holding since it was priced: the cart is priced again, and says so itself.
          if (REPRICED.has(errorCode)) pricing.recheck()
        },
      },
    )
  }

  // Said only while it still holds: a payment since chosen, or a coupon since checked, takes its sentence away.
  const unchecked = asked === "coupon" && pricing.couponBlock === "failed" ? text.couponUnchecked : asked === "credit" && pricing.creditBlock === "failed" ? text.cashbackUseUnchecked : null
  const missing = asked === "shipping" ? blocked : asked === "payment" && !payment ? text.checkoutChoosePayment : unchecked
  const refusal = order.error
    ? checkoutRefusalOf(order.error instanceof ShopperOrderError ? order.error : { errorCode: "UNKNOWN" }, view.rows, text, {
        pickup: choice.fulfillment === "PICKUP",
        money: (cents) => formatCents(cents, locale, "BRL"),
        online: paysOnline,
      })
    : null
  // A changed cart, choice or coupon is a new order to try: the refusal of the last one no longer describes it.
  const changed = (change: () => void) => {
    change()
    setAsked(null)
    order.reset()
  }

  return (
    <>
      {/* Its own box: the page's element as an only child, never a sibling React asks a key of. */}
      {arrival ? <div className="pt-5">{arrival}</div> : null}
      <StorefrontCart
        rows={view.rows.map((row) => ({ ...row, key: rowKeyOf(row), href: hrefs[row.productId] ?? continueHref, ...pricing.lines.get(rowKeyOf(row)) }))}
        subtotalCents={pricing.subtotalCents}
        count={view.count}
        discounts={pricing.discounts}
        delivery={pricing.delivery}
        total={pricing.total}
        offer={pricing.offer}
        cashback={pricing.cashback}
        pricing={pricing.pricing}
        stale={pricing.stale}
        locale={locale}
        continueHref={continueHref}
        notice={goneOnArrival ? messages.storefront.cartGone : null}
        checkout={
          <>
            <CartPriceControls pricing={pricing} offers={offers} signedOut={!shopper} signedOutBenefit={signedOutBenefit} disabled={order.pending || view.count === 0} onChange={changed} locale={locale} messages={messages} />
            <StorefrontCheckout
              channel={checkoutChannelOf({ offlineMethods, online, nothingToPay }, payment, Boolean(whatsapp))}
              customer={
                shopper
                  ? {
                      lines: [shopper.name, shopper.phone].filter((line): line is string => Boolean(line)),
                      complete: isReachable(shopper),
                      editHref: ways.editHref,
                      addresses,
                      addAddressHref: ways.addAddressHref,
                      addressForm,
                    }
                  : null
              }
              signIn={ways}
              identity={whoIsBuying}
              paymentMethods={offlineMethods}
              online={online}
              nothingToPay={nothingToPay}
              choice={choice}
              onChoiceChange={(next) => {
                if (next.paymentMethod && next.paymentMethod !== choice.paymentMethod) told.paymentPicked()
                changed(() => setChoice(next))
              }}
              shipping={shipping}
              recipientDocument={recipientDocument}
              onPlace={place}
              pending={order.pending}
              error={missing ?? refusal}
              // Nothing to order, or what the order goes with — its coupon, the credit ticked, a delivery's fee — is still being priced.
              disabled={view.count === 0 || pricing.couponBlock === "checking" || pricing.creditBlock === "checking" || (choice.fulfillment === "DELIVERY" && pricing.stale)}
              id={CHECKOUT_ANCHOR}
              messages={messages}
            />
          </>
        }
        onQtyChange={(key, qty) => {
          const row = byKey.get(key)
          if (row) setQty(row.productId, row.variantId, qty)
          order.reset()
        }}
        onRemove={(key) => {
          const row = byKey.get(key)
          if (row) remove(row.productId, row.variantId)
          order.reset()
        }}
        messages={messages}
      />
    </>
  )
}
