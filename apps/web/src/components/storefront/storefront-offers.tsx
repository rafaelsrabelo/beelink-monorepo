// Types
import type { PublicStore } from "@harness-monorepo/contracts"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { shopPaletteVariables } from "@harness-monorepo/ui/lib/shop-palette"
import { customerPopupWordsOf } from "@harness-monorepo/ui/lib/shop-popup"

// App
import { figtree } from "./shop-font"
import { StorefrontOfferStripLive } from "./storefront-offer-strip-live"
import { StorefrontPopupLive } from "./storefront-popup-live"
import { pathWithCoupon } from "@/lib/cart-coupon"
import { customerOffersAt } from "@/lib/customer-offers"
import { firstOrderOfferOf, offerStripOf } from "@/lib/offer-strip"
import { offersViewOf } from "@/lib/offers-view"
import { popupVisitorAt } from "@/lib/popup"
import { shopperAt } from "@/lib/shopper"
import { offersAt } from "@/lib/storefront-data"
import { storefrontRoutes } from "@/lib/storefront-routes"

export interface StorefrontOffersProps {
  store: Pick<PublicStore, "slug" | "type" | "routeWords" | "colors">
  messages: UiMessages
}

/** The shop window speaks one language (apps/web/AGENTS.md, the root layout's trap). */
const LOCALE = "pt-BR"

/**
 * What a shop says of its offers to whoever this page is drawn for: the first-order benefit, to
 * anyone with no order that stands — a signed-in shopper's own, and to somebody not signed in the
 * shop's public one, since buying asks no account and a first order is priced by the buyer's phone.
 * Nothing invites anyone to open an account. What is said is `offerStripOf`'s; this reads what it
 * asks for.
 *
 * Read on the server, so it is in the HTML — no skeleton that most pages would only take back. The
 * shop's offers are anyone's and kept; a shopper's own are asked for only when the headline says
 * the shop has something for a first order, so a shop with none costs a signed-in shopper's page no
 * call at all.
 *
 * A page mounts it by handing it to the frame, and only the shop's home, its listings and its
 * product pages do: not the cart, the account, the sign-in and token pages or a landing — and the
 * panel's design preview draws the frame without it. A site sells nothing to offer.
 *
 * It is said as a strip under the header or, at a shop that switched its first-purchase pop-up on
 * (BEELINK-306), as a dialog — never both on one page, and which is `offersViewOf`'s (BEELINK-310):
 * the dialog while it is still due to this browser; the strip after only if the shopkeeper keeps it
 * as a reminder. Either is said until it is closed, and then no more (BEELINK-311): the browser's
 * `bl_popup` remembers, and this leaves it out of the HTML. Mounted here because this is the one component that knows
 * who is looking and on which pages the shop speaks of offers — a second list of pages would be a
 * second rule. The pop-up's words and benefit arrive in the same kept read as the headline, and a
 * customer's notice is their own offers, already read for the strip: a pop-up costs no call more.
 */
export async function StorefrontOffers({ store, messages }: StorefrontOffersProps) {
  if (store.type === "INSTITUTIONAL") return null

  const [shopper, { firstPurchase: headline, firstOrder, popup }, visitor] = await Promise.all([shopperAt(store.slug), offersAt(store.slug), popupVisitorAt()])
  // Nothing for a first order: nobody is shown anything, and a shopper's offers are not asked for.
  if (!headline) return null

  const routes = storefrontRoutes(store)
  const session = !shopper && visitor.holdsSession
  // A shopper's own, by the strip's rule; the shop's public one to anyone not signed in — but never
  // to a browser whose session the page could not read: it may be somebody who has ordered.
  const offer = shopper ? firstOrderOfferOf(await customerOffersAt(store.slug)) : session ? null : firstOrder
  const strip = offerStripOf({ offer, cartHref: routes.cart(), locale: LOCALE, messages })

  const view = offersViewOf({ popup, viewer: session ? "session" : { offer }, seen: visitor.seen })
  const words = view.notice && offer ? customerPopupWordsOf(offer, LOCALE, messages) : null

  return (
    <>
      {strip && view.strip ? <StorefrontOfferStripLive slug={store.slug} strip={strip} notice={view.strip} revision={view.revision} messages={messages} /> : null}
      {popup && view.notice && words ? (
        <StorefrontPopupLive
          slug={store.slug}
          notice={view.notice}
          revision={view.revision}
          trigger={popup.trigger}
          delaySeconds={popup.delaySeconds}
          words={words}
          code={words.code}
          // To the cart with the coupon in its address, or — a promotion has no code — nowhere.
          actionHref={words.code ? pathWithCoupon(routes.cart(), words.code) : null}
          imageUrl={popup.imageUrl}
          // The dialog is drawn in a portal, outside the frame that carries the shop's variables and typeface.
          style={{ ...shopPaletteVariables(store.colors), fontFamily: figtree.style.fontFamily }}
          messages={messages}
        />
      ) : null}
    </>
  )
}
