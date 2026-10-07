// Types
import type { PublicStore } from "@harness-monorepo/contracts"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { shopPaletteVariables } from "@harness-monorepo/ui/lib/shop-palette"
import { popupWordsOf } from "@harness-monorepo/ui/lib/shop-popup"

// App
import { figtree } from "./shop-font"
import { StorefrontOfferStripLive } from "./storefront-offer-strip-live"
import { StorefrontPopupLive } from "./storefront-popup-live"
import { customerOffersAt } from "@/lib/customer-offers"
import { offerStripOf } from "@/lib/offer-strip"
import { popupVisitorAt } from "@/lib/popup"
import { popupSeen } from "@/lib/popup-cookie"
import { shopperAt } from "@/lib/shopper"
import { offersAt } from "@/lib/storefront-data"
import { storefrontRoutes } from "@/lib/storefront-routes"

export interface StorefrontOffersProps {
  store: Pick<PublicStore, "slug" | "type" | "routeWords" | "colors">
  /** This page's own address: where a visitor comes back to once they have opened their account. */
  back: string
  messages: UiMessages
}

/** The shop window speaks one language (apps/web/AGENTS.md, the root layout's trap). */
const LOCALE = "pt-BR"

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
 *
 * The shop's first-purchase pop-up is mounted here too (BEELINK-306), and for that reason: this is
 * the one component that knows who is looking and on which pages the shop speaks of offers — a
 * second list of pages would be a second rule. It is for a visitor alone: nobody signed in, nor a
 * browser that holds a shopper's session whose token ran out; and not for one who already closed
 * the pop-up as it stands (`bl_popup`). Its headline, its words and its benefit arrive in the same
 * kept read as the strip's, so a shop with a pop-up costs its page no call more.
 */
export async function StorefrontOffers({ store, back, messages }: StorefrontOffersProps) {
  if (store.type === "INSTITUTIONAL") return null

  const [shopper, { firstPurchase: headline, popup }, visitor] = await Promise.all([shopperAt(store.slug), offersAt(store.slug), popupVisitorAt()])
  // Nothing for a first order: a shopper is shown nothing, and their offers are not asked for.
  if (shopper && !headline) return null

  const routes = storefrontRoutes(store)
  const signUpHref = routes.signIn({ mode: "criar", back })
  const strip = offerStripOf({
    headline,
    viewer: shopper ? { offers: await customerOffersAt(store.slug) } : "visitor",
    signUpHref,
    cartHref: routes.cart(),
    locale: LOCALE,
    messages,
  })
  const calls = popup && !shopper && !visitor.holdsSession && !popupSeen(visitor.seen, popup.revision) ? popup : null

  return (
    <>
      {strip ? <StorefrontOfferStripLive slug={store.slug} strip={strip} messages={messages} /> : null}
      {calls ? (
        <StorefrontPopupLive
          slug={store.slug}
          revision={calls.revision}
          trigger={calls.trigger}
          delaySeconds={calls.delaySeconds}
          words={popupWordsOf(calls, calls.benefit, LOCALE, messages)}
          imageUrl={calls.imageUrl}
          signUpHref={signUpHref}
          // The dialog is drawn in a portal, outside the frame that carries the shop's variables and typeface.
          style={{ ...shopPaletteVariables(store.colors), fontFamily: figtree.style.fontFamily }}
          messages={messages}
        />
      ) : null}
    </>
  )
}
