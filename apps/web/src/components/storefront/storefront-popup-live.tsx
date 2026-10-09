"use client"

// React
import { useEffect, type CSSProperties } from "react"

// Types
import type { PopupTrigger } from "@harness-monorepo/contracts"

// UI
import { StorefrontPopup } from "@harness-monorepo/ui/blocks/storefront/storefront-popup"
import type { PopupWords } from "@harness-monorepo/ui/lib/shop-popup"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { useConsent } from "./consent-provider"
import { usePopupTrigger } from "./use-popup-trigger"
import { useShopAddress } from "@/components/storefront/shop-address-provider"
import { popupCookieOf, type PopupNotice } from "@/lib/popup-cookie"
import { useShopPopup } from "@/stores/shop-popup"

export interface StorefrontPopupLiveProps {
  slug: string
  /** Which of the pop-up's two notices this is: a visitor's invitation, or the coupon of a customer who never ordered (BEELINK-310). */
  notice: PopupNotice
  /** The pop-up's revision, which — with the notice — is what closing it remembers. */
  revision: number
  trigger: PopupTrigger
  delaySeconds: number
  /** What it says, put together on the server: the shop's words and the API's benefit for a visitor, the product's words and the customer's own offer for a customer. */
  words: PopupWords
  /** A customer's coupon code; null for a visitor, always, and for a promotion, which has none. */
  code?: string | null
  /**
   * Where its button leads: the shop's sign-up carrying the way back to this page, or the cart with
   * the coupon in its address. Null is a button that only closes — a promotion applies by itself.
   */
  actionHref: string | null
  imageUrl: string | null
  /** The shop's colours and typeface: the dialog is drawn outside the element that carries them. */
  style: CSSProperties
  messages: UiMessages
}

/**
 * A shop's first-purchase pop-up, with everything about it that happens in the browser (BEELINK-306):
 * when it opens, and what closing it remembers. Whether this page has one at all, and which of its
 * two notices — the invitation, for a visitor with no account; the coupon, for a signed-in customer
 * who never ordered (BEELINK-310) — was decided on the server (`offersViewOf`): a page that mounts
 * this is one where the notice is due and was not closed before, and where no offer strip is drawn.
 *
 * It waits for the cookie notice. While the shop's question about tracking is on the page, nothing
 * is armed: a pop-up must never cover that question, and two asks at once is one too many. Once it
 * is answered the wait starts from there, whole — so the pop-up does not open on the click itself.
 * A shop with no pixel asks nothing, and nothing is waited for.
 *
 * It opens once in a page's life. Closed — by its "×", Escape or a press outside — or with its
 * button pressed, the browser's `bl_popup` cookie takes the notice's version, and the server leaves
 * that notice out of every page until the cookie runs out or the shopkeeper changes what the pop-up
 * says. Left open and walked away from, nothing is written: it was never dismissed.
 *
 * It tells no one. Opening it and pressing its button reach neither the shop's pixel nor its funnel.
 */
export function StorefrontPopupLive({ slug, notice, revision, trigger, delaySeconds, words, code = null, actionHref, imageUrl, style, messages }: StorefrontPopupLiveProps) {
  const shop = useShopAddress(slug)
  const open = useShopPopup((state) => state.open[slug] === true)
  const shown = useShopPopup((state) => state.shown[slug] === true)
  const show = useShopPopup((state) => state.show)
  const hide = useShopPopup((state) => state.hide)
  const asking = useConsent((consent) => consent.asking)
  const offers = messages.storefront.offers

  usePopupTrigger({ trigger, delaySeconds, armed: !shown && !asking, onFire: () => show(slug) })

  // A page that takes the pop-up away while it is open must not leave it marked open.
  useEffect(() => () => hide(slug), [slug, hide])

  function dismiss() {
    document.cookie = popupCookieOf(shop, notice, revision, window.location.protocol === "https:")
    hide(slug)
  }

  return (
    <StorefrontPopup
      open={open}
      onOpenChange={(next) => {
        if (!next) dismiss()
      }}
      title={words.title}
      text={words.text}
      detail={words.detail}
      imageUrl={imageUrl}
      code={code ? { value: code, copyLabel: offers.copy, copiedLabel: offers.copied, selectedLabel: offers.copySelected } : null}
      action={actionHref ? { label: words.buttonLabel, href: actionHref } : { label: words.buttonLabel }}
      onAction={dismiss}
      style={style}
      messages={messages}
    />
  )
}
