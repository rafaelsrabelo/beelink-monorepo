// Types
import type { PublicStore } from "@harness-monorepo/contracts"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { StorefrontOfferStripLive } from "./storefront-offer-strip-live"
import { customerOffersAt } from "@/lib/customer-offers"
import { offerStripOf } from "@/lib/offer-strip"
import { shopperAt } from "@/lib/shopper"
import { offersAt } from "@/lib/storefront-data"
import { storefrontRoutes } from "@/lib/storefront-routes"

export interface StorefrontOffersProps {
  store: Pick<PublicStore, "slug" | "type" | "routeWords">
  /** This page's own address: where a visitor comes back to once they have opened their account. */
  back: string
  messages: UiMessages
}

/**
 * The strip under the shop's header, for whoever this page is drawn for: an invitation to open an
 * account to a visitor, their first-order benefit to a shopper who has not ordered, and nothing to
 * anyone else. Which of those is `offerStripOf`'s to say; this reads what it asks for.
 *
 * Read on the server, so the strip is in the HTML — no skeleton that most pages would only take
 * back. The shop's headline is anyone's and kept; a shopper's own offers are asked for only when
 * that headline says the shop has something for a first order, so a shop with none costs a signed-in
 * shopper's page no call at all.
 *
 * A page mounts it by handing it to the frame, and only the shop's home, its listings and its
 * product pages do: not the cart, the account, the sign-in and token pages or a landing — and the
 * panel's design preview draws the frame without it. A site has no account to open.
 */
export async function StorefrontOffers({ store, back, messages }: StorefrontOffersProps) {
  if (store.type === "INSTITUTIONAL") return null

  const [shopper, { firstPurchase: headline }] = await Promise.all([shopperAt(store.slug), offersAt(store.slug)])
  // Nothing for a first order: a shopper is shown nothing, and their offers are not asked for.
  if (shopper && !headline) return null

  const routes = storefrontRoutes(store)
  const strip = offerStripOf({
    headline,
    viewer: shopper ? { offers: await customerOffersAt(store.slug) } : "visitor",
    signUpHref: routes.signIn({ mode: "criar", back }),
    cartHref: routes.cart(),
    locale: "pt-BR",
    messages,
  })

  return strip ? <StorefrontOfferStripLive slug={store.slug} strip={strip} messages={messages} /> : null
}
