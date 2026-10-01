"use client"

// React
import { useEffect, useMemo, useState, type ReactNode } from "react"

// Next
import { useRouter } from "next/navigation"

// Types
import type { CustomerProfile, PaymentMethod, PublicProductDetail } from "@harness-monorepo/contracts"

// UI
import { StorefrontCart } from "@harness-monorepo/ui/blocks/storefront/storefront-cart"
import { StorefrontCheckout } from "@harness-monorepo/ui/blocks/storefront/storefront-checkout"
import { StorefrontCoupon } from "@harness-monorepo/ui/blocks/storefront/storefront-coupon"
import { StorefrontOrderSent } from "@harness-monorepo/ui/blocks/storefront/storefront-order-sent"
import { formatCents } from "@harness-monorepo/ui/blocks/storefront/storefront-price"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { useCart } from "./cart-provider"
import { useCartPricing } from "./use-cart-pricing"
import { useCheckoutChoice } from "./use-checkout-choice"
import { waysBackWithCoupon } from "@/lib/cart-coupon"
import type { ServedQuote } from "@/lib/cart-pricing"
import { cartViewOf, orderItemsOf, rowKeyOf } from "@/lib/cart-view"
import { checkoutRefusalOf, rereadsTheCart } from "@/lib/checkout-refusal"
import { isReachable } from "@/lib/customer-address"
import { orderMessageOf, whatsappOrderHref } from "@/lib/whatsapp-order"
import { usePlaceShopperOrder } from "@/services/storefront/storefront-hooks"
import { ShopperOrderError } from "@/services/storefront/storefront-requests"

export interface StorefrontCartLiveProps {
  slug: string
  /** The products the cart named when the page was served, priced by the catalogue. */
  products: readonly PublicProductDetail[]
  /** Each product's page, by id: the addresses are the shop's words, built on the server. */
  hrefs: Readonly<Record<string, string>>
  continueHref: string
  /** Whether the page found lines whose product left the shop; they are taken out here. */
  goneOnArrival: boolean
  shopName: string
  /** The shop's WhatsApp as `wa.me` wants it, digits only; null when it has none. */
  whatsapp: string | null
  /** The methods the shop takes, in its own order. */
  paymentMethods: readonly PaymentMethod[]
  /** The signed-in shopper's record at this shop; null for a visitor, who is asked to sign in to order. */
  shopper: CustomerProfile | null
  /** Sign in, sign up, change details and add an address — each coming back to this cart. */
  identityHrefs: { signInHref: string; signUpHref: string; editHref: string; addAddressHref: string }
  /** An address just saved on the way from this cart, to deliver to; null or not the shopper's, the default. */
  deliverTo?: string | null
  /** What brought the shopper here — an order bought again — said over the cart until an order is sent from it. */
  arrival?: ReactNode
  /** The cart's price as the page was served with it, so the summary is in the HTML; null and the browser asks. */
  served?: ServedQuote | null
  /** The coupon the page's address named (`?cupom=`), to be checked on arrival; null with none. */
  coupon?: string | null
  locale: string
  messages: UiMessages
}

/**
 * The cart page, following the cart as it changes. Quantities and removals go to the store — which
 * writes the cookie — and the totals are the API's price of the cart (BEELINK-194): the promotions
 * and the coupon each on their row, by the one calculation the order is written with.
 *
 * Placing the order asks the API first: the order exists — numbered, priced by the API, in the
 * shop's panel — before the shop's WhatsApp opens with that number. The cart is emptied only then.
 * It carries the coupon the summary shows as applied, and no other.
 */
export function StorefrontCartLive({
  slug,
  products,
  hrefs,
  continueHref,
  goneOnArrival,
  shopName,
  whatsapp,
  paymentMethods,
  shopper,
  identityHrefs,
  deliverTo = null,
  arrival,
  served = null,
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
  const placing = usePlaceShopperOrder(slug)
  const { addresses, choice, setChoice } = useCheckoutChoice(shopper, paymentMethods, deliverTo)
  // What the last press on the button found missing, before anything was sent.
  const [asked, setAsked] = useState<"payment" | "coupon" | null>(null)
  // The order once placed, and the WhatsApp link opened with its number.
  const [sent, setSent] = useState<{ number: number; href: string | null } | null>(null)
  const view = useMemo(() => cartViewOf(lines, products), [lines, products])
  const byKey = useMemo(() => new Map(view.rows.map((row) => [rowKeyOf(row), row])), [view.rows])
  const pricing = useCartPricing({ slug, view, fulfillment: choice.fulfillment, shopperId: shopper?.id ?? null, served, arrivedWith: coupon, locale, messages })
  // Each way out of the cart that comes back to it — to sign in, to change details, to add an address — takes the coupon along.
  const ways = useMemo(() => waysBackWithCoupon(identityHrefs, pricing.carried), [identityHrefs, pricing.carried])

  // A line the shop no longer sells is taken out of the cookie once, rather than asked for forever.
  useEffect(() => {
    for (const line of view.gone) remove(line.productId, line.variantId)
  }, [view.gone, remove])

  if (sent) return <StorefrontOrderSent number={sent.number} href={sent.href} continueHref={continueHref} messages={messages} />

  function place() {
    if (!shopper) return
    if (!choice.paymentMethod) return setAsked("payment")
    // A coupon in force whose check did not come back: the order would go out at a price nobody
    // read. The press asks for it again; the button waits for the answer.
    if (pricing.couponBlock) {
      pricing.recheck()
      return setAsked("coupon")
    }
    setAsked(null)

    // Opened in the press itself: a browser blocks a tab opened after the request's wait.
    const tab = whatsapp ? window.open("", "_blank") : null
    if (tab) tab.opener = null

    placing.mutate(
      {
        items: orderItemsOf(view.rows),
        fulfillment: choice.fulfillment,
        paymentMethod: choice.paymentMethod,
        ...(choice.fulfillment === "DELIVERY" && choice.addressId ? { addressId: choice.addressId } : {}),
        ...(pricing.orderCoupon ? { couponCode: pricing.orderCoupon } : {}),
      },
      {
        onSuccess: (order) => {
          const href = whatsapp ? whatsappOrderHref(whatsapp, orderMessageOf({ shopName, order, customer: shopper, locale, messages })) : null
          // A refused tab leaves the link on the next screen, where opening it is the shopper's own click.
          if (tab && href) tab.location.href = href
          setSent({ number: order.number, href })
          clear()
          pricing.forget()
        },
        onError: (error) => {
          tab?.close()
          // The session, the shopper's record or the shop's payments moved: the page reads them again.
          if (error instanceof ShopperOrderError && rereadsTheCart(error.errorCode)) router.refresh()
          // The coupon stopped holding since it was priced: the cart is priced again, and says so itself.
          if (error instanceof ShopperOrderError && error.errorCode === "ORDER_COUPON_REFUSED") pricing.recheck()
        },
      },
    )
  }

  // Said only while it still holds: a payment since chosen, or a coupon since checked, takes its sentence away.
  const missing = asked === "payment" && !choice.paymentMethod ? text.checkoutChoosePayment : asked === "coupon" && pricing.couponBlock === "failed" ? text.couponUnchecked : null
  const refusal = placing.error
    ? checkoutRefusalOf(placing.error instanceof ShopperOrderError ? placing.error : { errorCode: "UNKNOWN" }, view.rows, text, {
        pickup: choice.fulfillment === "PICKUP",
        money: (cents) => formatCents(cents, locale, "BRL"),
      })
    : null
  // A changed cart, choice or coupon is a new order to try: the refusal of the last one no longer describes it.
  const changed = (change: () => void) => {
    change()
    setAsked(null)
    placing.reset()
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
        total={pricing.total}
        offer={pricing.offer}
        pricing={pricing.pricing}
        stale={pricing.stale}
        locale={locale}
        continueHref={continueHref}
        notice={goneOnArrival ? messages.storefront.cartGone : null}
        checkout={
          <>
            <StorefrontCoupon
              signedOut={!shopper}
              applied={pricing.coupon.applied}
              holding={pricing.coupon.holding}
              pending={pricing.coupon.pending}
              error={pricing.coupon.error}
              onApply={(code) => changed(() => pricing.coupon.apply(code))}
              onRemove={() => changed(pricing.coupon.remove)}
              onEdit={pricing.coupon.edit}
              disabled={placing.isPending || view.count === 0}
              messages={messages}
            />
            <StorefrontCheckout
              channel={whatsapp ? "whatsapp" : "shop"}
              customer={
                shopper
                  ? {
                      lines: [shopper.name, shopper.phone].filter((line): line is string => Boolean(line)),
                      complete: isReachable(shopper),
                      editHref: ways.editHref,
                      addresses,
                      addAddressHref: ways.addAddressHref,
                    }
                  : null
              }
              signIn={ways}
              paymentMethods={paymentMethods}
              choice={choice}
              onChoiceChange={(next) => changed(() => setChoice(next))}
              onPlace={place}
              pending={placing.isPending}
              error={missing ?? refusal}
              // Nothing to order, or the coupon in force is being checked against the cart as it is now.
              disabled={view.count === 0 || pricing.couponBlock === "checking"}
              messages={messages}
            />
          </>
        }
        onQtyChange={(key, qty) => {
          const row = byKey.get(key)
          if (row) setQty(row.productId, row.variantId, qty)
          placing.reset()
        }}
        onRemove={(key) => {
          const row = byKey.get(key)
          if (row) remove(row.productId, row.variantId)
          placing.reset()
        }}
        messages={messages}
      />
    </>
  )
}
