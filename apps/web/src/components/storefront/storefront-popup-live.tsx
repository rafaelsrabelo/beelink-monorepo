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
import { popupCookieOf } from "@/lib/popup-cookie"
import { useShopPopup } from "@/stores/shop-popup"

export interface StorefrontPopupLiveProps {
  slug: string
  /** The pop-up's revision, which is what closing it remembers. */
  revision: number
  trigger: PopupTrigger
  delaySeconds: number
  /** What it says, put together on the server from the shop's words and the API's benefit. */
  words: PopupWords
  imageUrl: string | null
  /** The shop's sign-up, already carrying the way back to this page. */
  signUpHref: string
  /** The shop's colours and typeface: the dialog is drawn outside the element that carries them. */
  style: CSSProperties
  messages: UiMessages
}

/**
 * A shop's first-purchase pop-up, with everything about it that happens in the browser (BEELINK-306):
 * when it opens, and what closing it remembers. Whether this page has one at all — a visitor with
 * no account, on a page where the shop speaks of offers, who has not closed this pop-up before —
 * was decided on the server; a page that mounts this means all three.
 *
 * It waits for the cookie notice. While the shop's question about tracking is on the page, nothing
 * is armed: a pop-up must never cover that question, and two asks at once is one too many. Once it
 * is answered the wait starts from there, whole — so the pop-up does not open on the click itself.
 * A shop with no pixel asks nothing, and nothing is waited for.
 *
 * It opens once in a page's life. Closed — by its "×", Escape or a press outside — or with its
 * button pressed, the visitor's `bl_popup` cookie takes the revision, and the server leaves the
 * pop-up out of every page until that cookie runs out or the shopkeeper changes what it says.
 * Left open and walked away from, nothing is written: it was never dismissed.
 *
 * It tells no one. Opening it and pressing its button reach neither the shop's pixel nor its funnel.
 */
export function StorefrontPopupLive({ slug, revision, trigger, delaySeconds, words, imageUrl, signUpHref, style, messages }: StorefrontPopupLiveProps) {
  const open = useShopPopup((state) => state.open[slug] === true)
  const shown = useShopPopup((state) => state.shown[slug] === true)
  const show = useShopPopup((state) => state.show)
  const hide = useShopPopup((state) => state.hide)
  const asking = useConsent((consent) => consent.asking)

  usePopupTrigger({ trigger, delaySeconds, armed: !shown && !asking, onFire: () => show(slug) })

  // A page that takes the pop-up away while it is open must not leave the offer strip stepped aside.
  useEffect(() => () => hide(slug), [slug, hide])

  function dismiss() {
    document.cookie = popupCookieOf(slug, revision, window.location.protocol === "https:")
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
      action={{ label: words.buttonLabel, href: signUpHref }}
      onAction={dismiss}
      style={style}
      messages={messages}
    />
  )
}
