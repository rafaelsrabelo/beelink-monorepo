// React
import { useId, useImperativeHandle, useRef, type Ref } from "react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"
import { useHeightProperty } from "@harness-monorepo/ui/hooks/use-height-property"
import { withParts } from "@harness-monorepo/ui/lib/text-parts"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface StorefrontConsentProps {
  /** bee-link's privacy policy, which says what the pixel shares. The address is the screen's to know. */
  privacyHref: string
  /** The answer in force, on a notice opened again; null for a visitor who has not answered. */
  current?: "granted" | "denied" | null
  onAccept: () => void
  onRefuse: () => void
  /** The region itself, focusable by script: opened again from the footer, it is where the focus goes. */
  ref?: Ref<HTMLElement>
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * How tall the notice stands, said to the document: `globals.css` keeps that much of the page's foot
 * clear for Tab while it is up, and reads `data-shop-notice` to know when.
 */
export const SHOP_NOTICE_HEIGHT = "--shop-notice-height"

/**
 * One drawing for both answers. Refusing must cost what accepting costs — the same size, the same
 * weight, the same row — so neither is the button a hurried thumb finds first.
 */
const CHOICE =
  "flex h-11 min-w-28 flex-1 cursor-pointer items-center justify-center rounded-full bg-shop-primary-on-header px-6 text-sm font-bold text-shop-on-primary-on-header transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-shop-on-header shop-sm:flex-none"

/**
 * The cookie notice of a shop that connected a Meta Pixel (BEELINK-271): what a yes shares, that a no
 * changes nothing about the shop, and the two answers.
 *
 * A card in the shop's own header colours, standing at the foot of the screen. Sticky and not fixed,
 * and laid after the shop's pages (`StorefrontConsentGate`): it follows the screen while the page
 * scrolls, and at the page's end it rests in its own place, under the footer — so the checkout's last
 * button and the footer's last line are never left behind it. On a phone's product page it stands on
 * the buy bar rather than over it, by the height the bar says it has (`--shop-buy-bar-height`).
 *
 * Not a dialog: a named region a keyboard walks into and out of, which traps nothing, over a shop that
 * stays usable — and a visitor who never answers is simply never tracked. While it is up, the
 * document keeps its height clear at the foot, so whatever Tab reaches is scrolled above it.
 *
 * No close button: closing without answering would be a third answer nobody could name.
 */
export function StorefrontConsent({
  privacyHref,
  current = null,
  onAccept,
  onRefuse,
  ref,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: StorefrontConsentProps) {
  const text = messages.storefront.consent
  const headingId = useId()
  const region = useRef<HTMLElement>(null)

  useImperativeHandle(ref, () => region.current as HTMLElement, [])
  useHeightProperty(region, SHOP_NOTICE_HEIGHT)

  return (
    <section
      ref={region}
      data-shop-notice=""
      tabIndex={-1}
      aria-labelledby={headingId}
      // The margins around the card are the page's: they take no press.
      className="pointer-events-none sticky bottom-[var(--shop-notice-lift,0px)] z-20 px-3 pb-3 outline-none transition-[bottom] shop-md:px-6 shop-md:pb-6"
    >
      {/* The ring keeps the card apart from a footer painted in the header's own colour, as many are. */}
      <div className="pointer-events-auto mx-auto flex max-w-5xl flex-col gap-3 rounded-2xl bg-shop-header p-4 text-shop-on-header shadow-lg ring-1 ring-shop-on-header/25 shop-md:flex-row shop-md:items-center shop-md:justify-between shop-md:gap-8 shop-md:px-6 shop-md:py-5">
        <div className="flex max-w-3xl flex-col gap-1">
          <h2 id={headingId} className="text-sm font-bold">
            {text.title}
          </h2>
          {/* Smaller on a phone, where every line it takes is a line of the shop it stands over. */}
          <p className="text-[13px] leading-snug shop-md:text-sm">
            {withParts(text.body, {
              privacy: (
                <Link href={privacyHref} className="font-semibold underline underline-offset-2">
                  {messages.legal.privacy}
                </Link>
              ),
            })}
          </p>
          {current ? <p className="text-[13px] font-semibold shop-md:text-sm">{text.current[current]}</p> : null}
        </div>

        <div className="flex shrink-0 gap-3">
          <button type="button" onClick={onRefuse} className={CHOICE}>
            {text.refuse}
          </button>
          <button type="button" onClick={onAccept} className={CHOICE}>
            {text.accept}
          </button>
        </div>
      </div>
    </section>
  )
}
