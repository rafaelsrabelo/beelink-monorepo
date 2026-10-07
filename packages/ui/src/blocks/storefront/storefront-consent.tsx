// React
import { useId, type Ref } from "react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"
import { withParts } from "@harness-monorepo/ui/lib/text-parts"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { BAND } from "./storefront-band"

export interface StorefrontConsentProps {
  /** bee-link's privacy policy, which says what the pixel shares. The address is the screen's to know. */
  privacyHref: string
  /** The answer in force, on a strip opened again; null for a visitor who has not answered. */
  current?: "granted" | "denied" | null
  onAccept: () => void
  onRefuse: () => void
  /** The region itself, focusable by script: opened again from the footer, it is where the focus goes. */
  ref?: Ref<HTMLElement>
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * One drawing for both answers. Refusing must cost what accepting costs — the same size, the same
 * weight, the same row — so neither is the button a hurried thumb finds first.
 */
const CHOICE =
  "flex h-11 min-w-28 flex-1 cursor-pointer items-center justify-center rounded-xl border border-shop-text bg-shop-background px-5 text-sm font-semibold text-shop-on-background transition-colors hover:bg-shop-fill focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-shop-primary-ink shop-sm:flex-none"

/**
 * The cookie strip of a shop that connected a Meta Pixel (BEELINK-271): what a yes shares, that a
 * no changes nothing about the shop, and the two answers.
 *
 * A band in the page's flow, drawn above the header, and never fixed over the page: a phone's
 * product page keeps its buy bar at the bottom of the screen and the checkout its last button, and
 * a strip laid over either would be standing on the one thing the visitor came to press. In the flow
 * it covers nothing and traps nothing — it is a named region a keyboard walks into and out of, and
 * a visitor who never answers is simply never tracked.
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

  return (
    <section
      ref={ref}
      tabIndex={-1}
      aria-labelledby={headingId}
      className="w-full border-b border-shop-line bg-shop-background text-shop-on-background outline-none"
    >
      <div className={cn(BAND, "flex flex-col gap-4 py-4 shop-md:flex-row shop-md:items-center shop-md:justify-between shop-md:gap-8")}>
        <div className="flex max-w-3xl flex-col gap-1">
          <h2 id={headingId} className="text-sm font-bold">
            {text.title}
          </h2>
          <p className="text-sm">
            {withParts(text.body, {
              privacy: (
                <Link href={privacyHref} className="font-semibold text-shop-primary-ink underline underline-offset-2">
                  {messages.legal.privacy}
                </Link>
              ),
            })}
          </p>
          {current ? <p className="text-sm font-semibold">{text.current[current]}</p> : null}
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
