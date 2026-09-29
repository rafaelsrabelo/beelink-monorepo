"use client"

// React
import { useEffect, useMemo, useState, type ReactNode } from "react"

// Next
import { useRouter } from "next/navigation"

// Types
import type { CustomerProfile, PaymentMethod, PublicProductDetail } from "@harness-monorepo/contracts"

// UI
import { StorefrontCart } from "@harness-monorepo/ui/blocks/storefront/storefront-cart"
import { StorefrontCheckout, type StorefrontCheckoutChoice } from "@harness-monorepo/ui/blocks/storefront/storefront-checkout"
import { StorefrontOrderSent } from "@harness-monorepo/ui/blocks/storefront/storefront-order-sent"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { useCart } from "./cart-provider"
import { cartViewOf, orderItemsOf, rowKeyOf } from "@/lib/cart-view"
import { checkoutRefusalOf, rereadsTheCart } from "@/lib/checkout-refusal"
import { isReachable } from "@/lib/customer-address"
import { checkoutAddressesOf } from "@/lib/saved-address"
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
  locale: string
  messages: UiMessages
}

/**
 * The cart page, following the cart as it changes. Quantities and removals go to the store — which
 * writes the cookie — and the totals are recomputed from the prices the page was served with.
 *
 * Placing the order asks the API first: the order exists — numbered, priced by the API, in the
 * shop's panel — before the shop's WhatsApp opens with that number. The cart is emptied only then.
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
  const addresses = useMemo(() => (shopper ? checkoutAddressesOf(shopper) : []), [shopper])
  const [picked, setChoice] = useState<StorefrontCheckoutChoice>(() => ({
    fulfillment: addresses.length ? "DELIVERY" : "PICKUP",
    addressId: deliverTo,
    paymentMethod: paymentMethods.length === 1 ? paymentMethods[0]! : null,
  }))
  // What was picked, held to what the page says now: an address gone since, or a payment the shop
  // stopped taking, is never what gets sent. The default stands in for an address no longer offered.
  const address = addresses.find((each) => each.id === picked.addressId) ?? addresses[0] ?? null
  const choice: StorefrontCheckoutChoice = {
    fulfillment: address ? picked.fulfillment : "PICKUP",
    addressId: address?.id ?? null,
    paymentMethod:
      picked.paymentMethod && paymentMethods.includes(picked.paymentMethod)
        ? picked.paymentMethod
        : paymentMethods.length === 1
          ? paymentMethods[0]!
          : null,
  }
  // What was asked of the shopper before anything was sent: a payment to choose.
  const [asked, setAsked] = useState<string | null>(null)
  // The order once placed, and the WhatsApp link opened with its number.
  const [sent, setSent] = useState<{ number: number; href: string | null } | null>(null)
  const view = useMemo(() => cartViewOf(lines, products), [lines, products])
  const byKey = useMemo(() => new Map(view.rows.map((row) => [rowKeyOf(row), row])), [view.rows])

  // A line the shop no longer sells is taken out of the cookie once, rather than asked for forever.
  useEffect(() => {
    for (const line of view.gone) remove(line.productId, line.variantId)
  }, [view.gone, remove])

  if (sent) return <StorefrontOrderSent number={sent.number} href={sent.href} continueHref={continueHref} messages={messages} />

  function place() {
    if (!shopper) return
    if (!choice.paymentMethod) {
      setAsked(text.checkoutChoosePayment)
      return
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
      },
      {
        onSuccess: (order) => {
          const href = whatsapp ? whatsappOrderHref(whatsapp, orderMessageOf({ shopName, order, customer: shopper, locale, messages })) : null
          // A refused tab leaves the link on the next screen, where opening it is the shopper's own click.
          if (tab && href) tab.location.href = href
          setSent({ number: order.number, href })
          clear()
        },
        onError: (error) => {
          tab?.close()
          // The session, the shopper's record or the shop's payments moved: the page reads them again.
          if (error instanceof ShopperOrderError && rereadsTheCart(error.errorCode)) router.refresh()
        },
      },
    )
  }

  const refusal = placing.error
    ? checkoutRefusalOf(placing.error instanceof ShopperOrderError ? placing.error : { errorCode: "UNKNOWN" }, view.rows, text)
    : null

  return (
    <>
      {/* Its own box: the page's element as an only child, never a sibling React asks a key of. */}
      {arrival ? <div className="pt-5">{arrival}</div> : null}
      <StorefrontCart
        rows={view.rows.map((row) => ({ ...row, key: rowKeyOf(row), href: hrefs[row.productId] ?? continueHref }))}
        subtotalCents={view.subtotalCents}
        count={view.count}
        locale={locale}
        continueHref={continueHref}
        notice={goneOnArrival ? messages.storefront.cartGone : null}
        checkout={
          <StorefrontCheckout
            channel={whatsapp ? "whatsapp" : "shop"}
            customer={
              shopper
                ? {
                    lines: [shopper.name, shopper.phone].filter((line): line is string => Boolean(line)),
                    complete: isReachable(shopper),
                    editHref: identityHrefs.editHref,
                    addresses,
                    addAddressHref: identityHrefs.addAddressHref,
                  }
                : null
            }
            signIn={identityHrefs}
            paymentMethods={paymentMethods}
            choice={choice}
            onChoiceChange={(next) => {
              setChoice(next)
              setAsked(null)
              placing.reset()
            }}
            onPlace={place}
            pending={placing.isPending}
            error={asked ?? refusal}
            disabled={view.count === 0}
            messages={messages}
          />
        }
        // A changed cart is a new order to try: the refusal of the last one no longer describes it.
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
