// Next
import { redirect } from "next/navigation"

// UI
import { StorefrontCheckoutBar } from "@harness-monorepo/ui/blocks/storefront/storefront-checkout-bar"

// App
import { AppLink } from "@/components/app-link"
import { StorefrontCartLinkLive } from "./storefront-cart-link-live"
import { StorefrontCheckoutLive } from "./storefront-checkout-live"
import { StorefrontFrame } from "./storefront-frame"
import { cartAt } from "@/lib/cart"
import { COUPON_KEY, couponIn, pathWithCoupon } from "@/lib/cart-coupon"
import { cartQuoteOf, firstFulfillmentOf } from "@/lib/cart-pricing"
import { cartQuoteAt } from "@/lib/cart-quote"
import { cartViewOf } from "@/lib/cart-view"
import { checkoutIdentityOf } from "@/lib/checkout-identity"
import { servedOffersAt } from "@/lib/customer-offers"
import { errorSentenceOf } from "@/lib/error-sentence"
import { getMessages } from "@/lib/locale"
import { cartFirstOrderOf } from "@/lib/offer-strip"
import { ADDRESS_ERROR_KEY, ADDRESS_KEY, checkoutAddressesOf, checkoutAddressIdOf, DELIVER_TO_KEY, NEW_ADDRESS } from "@/lib/saved-address"
import { purchaseAt, shopperAt } from "@/lib/shopper"
import { offersAt, paymentOptionsAt } from "@/lib/storefront-data"
import { BACK_KEY, paramOf, storefrontRoutes } from "@/lib/storefront-routes"
import type { SectionPlace, SectionQuery } from "@/lib/storefront-section"

export interface StorefrontCheckoutSectionProps {
  place: SectionPlace
  query: SectionQuery
}

/**
 * The checkout's page (`/<shop>/checkout`): the shop's colours and nothing of its header — no search,
 * no menu, no strip, no footer — but a bar with the logo and the bag. What it reads is what the
 * checkout needs to be in the HTML: the cart, who is buying, how the shop is paid, and the cart's
 * price for them, to the address a delivery would go to (BEELINK-178).
 *
 * A cart with nothing to order has no checkout: the address leads to the cart, which says why.
 */
export async function StorefrontCheckoutSection({ place, query }: StorefrontCheckoutSectionProps) {
  const { store, navigation, messages: ui } = place
  const routes = storefrontRoutes(store)
  const locale = "pt-BR"
  const coupon = couponIn(paramOf(query[COUPON_KEY]))
  const [cart, shopper, paymentOptions, { web }] = await Promise.all([cartAt(store.slug), shopperAt(store.slug), paymentOptionsAt(store.slug), getMessages()])
  const rows = cartViewOf(cart.lines, cart.products).rows
  if (!rows.some((row) => row.available)) redirect(pathWithCoupon(routes.cart(), coupon) as Parameters<typeof redirect>[0])

  const deliverTo = paramOf(query[DELIVER_TO_KEY]) ?? null
  // A visitor already identified at this checkout: their purchase session (P0), read only where no shopper is signed in.
  const purchase = shopper ? null : await purchaseAt(store.slug)
  // An address the checkout sent and the shop refused: the code it came back with, said in its form.
  const addressRefusal = shopper || purchase ? (paramOf(query[ADDRESS_ERROR_KEY]) ?? null) : null
  // A visitor's "who is buying": the e-mail and what to say, as the checkout's form left them.
  const identity = !shopper && !purchase ? checkoutIdentityOf(query, web.errors) : null
  const asked = cartQuoteOf(rows, firstFulfillmentOf(shopper), null, { addressId: shopper ? checkoutAddressIdOf(checkoutAddressesOf(shopper), deliverTo) : null })
  // With it, for a shopper: the shop's shown coupons that same cart may take, so the list is in the HTML as well.
  // And for a visitor, what the shop's first-purchase coupon gives (BEELINK-311).
  const [served, servedOffers, publicOffers] = await Promise.all([
    cartQuoteAt(store.slug, asked, shopper?.id ?? null),
    asked.items.length && shopper ? servedOffersAt(store.slug, shopper.id, asked) : null,
    shopper ? null : offersAt(store.slug),
  ])
  const checkoutHref = routes.checkout()

  return (
    <StorefrontFrame
      store={store}
      categories={navigation.categories}
      year={new Date().getFullYear()}
      shopper={shopper}
      chrome={false}
      pageHeader={<StorefrontCheckoutBar name={store.name} logoUrl={store.logoUrl} homeHref={routes.home} cart={<StorefrontCartLinkLive href={pathWithCoupon(routes.cart(), coupon)} messages={ui} />} linkComponent={AppLink} messages={ui} />}
      messages={ui}
    >
      <StorefrontCheckoutLive
        slug={store.slug}
        products={cart.products}
        continueHref={routes.catalog()}
        shopName={store.name}
        whatsapp={store.socialNetworks.whatsapp?.replace(/\D/g, "") || null}
        routeWords={store.routeWords}
        paymentMethods={store.paymentMethods}
        paymentOptions={paymentOptions}
        shopper={shopper}
        identityHrefs={{
          signInHref: routes.signIn({ back: checkoutHref }),
          signUpHref: routes.signIn({ mode: "criar", back: checkoutHref }),
          editHref: `${routes.accountTab("profile")}?${BACK_KEY}=${encodeURIComponent(checkoutHref)}`,
          addAddressHref: `${routes.accountTab("profile")}?${new URLSearchParams({ [ADDRESS_KEY]: NEW_ADDRESS, [BACK_KEY]: checkoutHref }).toString()}`,
          checkoutHref,
        }}
        cartHref={routes.cart()}
        deliverTo={deliverTo}
        addressError={addressRefusal ? errorSentenceOf(web.errors, addressRefusal) : null}
        identity={identity}
        purchase={purchase}
        served={served}
        servedOffers={servedOffers}
        signedOutBenefit={publicOffers ? cartFirstOrderOf(publicOffers.firstOrder, locale, ui) : null}
        coupon={coupon}
        locale={locale}
        messages={ui}
      />
    </StorefrontFrame>
  )
}
