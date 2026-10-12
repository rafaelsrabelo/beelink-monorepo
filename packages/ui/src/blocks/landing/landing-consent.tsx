"use client"

// React
import { useEffect, useId, useImperativeHandle, useRef, type Ref } from "react"

// UI
import { withParts } from "@harness-monorepo/ui/lib/text-parts"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { LANDING_CONTAINER } from "./landing-styles"

export interface LandingConsentProps {
  /** bee-link's privacy policy, which says what the measurement shares. The address is the screen's to know. */
  privacyHref: string
  /** The answer in force, on a notice opened again; null for a visitor who has not answered. */
  current?: "granted" | "denied" | null
  onAccept: () => void
  onRefuse: () => void
  /** The region itself, focusable by script: opened again from the footer, it is where the focus goes. */
  ref?: Ref<HTMLElement>
  linkComponent?: LinkComponent
  /**
   * The notice's own sentences, and only them. It is drawn by a Client Component: what that is
   * handed is written into the page for the browser to read back, and the whole dictionary would be.
   */
  text: UiMessages["landing"]["consent"]
}

/**
 * One drawing for both answers. Refusing must cost what accepting costs — the same size, the same
 * weight, the same row — so neither is the button a hurried thumb finds first.
 */
const CHOICE =
  "flex h-11 min-w-28 flex-1 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-brand-ink bg-brand-surface px-6 text-[15px] font-bold text-brand-ink transition-colors hover:bg-brand-sand sm:flex-none"

/**
 * The landing's cookie notice (BEELINK-319): what a yes lets Beelink's own Google Analytics do, that
 * a no changes nothing about the site, and the two answers.
 *
 * It stands at the foot of the screen, which a shop's strip never does (`storefront-consent` is a
 * band above the header): a shop keeps its buy bar down there, and the landing keeps nothing — while
 * a band above the hero would push a selling page's first words down a phone. Sticky and not fixed,
 * laid last in `landing-shell`'s column: it follows the screen while the page scrolls, and at the
 * page's end it rests in its own place, under the footer. So the page is longer by exactly this
 * notice, at any width and in any language, and nothing is ever left behind it with no way to reach.
 *
 * Not a dialog: a named region a keyboard walks into and out of, which traps nothing, over a page
 * that stays usable. Under the header's open menu and over everything else, since a menu's last
 * links are what a short phone would lose to it.
 *
 * While it stands, the document keeps its height clear at the foot (`scroll-padding-bottom`), so
 * whatever Tab reaches is scrolled above the notice rather than under it — the product page's buy
 * bar does the same with a height it knows; this one's changes with the width and the language, so
 * it is measured.
 *
 * No close button: closing without answering would be a third answer nobody could name.
 *
 * It imports no dictionary, like the landing's other blocks a browser draws.
 */
export function LandingConsent({ privacyHref, current = null, onAccept, onRefuse, ref, linkComponent: Link = AnchorLink, text }: LandingConsentProps) {
  const headingId = useId()
  const region = useRef<HTMLElement>(null)

  useImperativeHandle(ref, () => region.current as HTMLElement, [])

  useEffect(() => {
    const element = region.current
    if (!element) return
    const root = document.documentElement
    const keepRoom = () => {
      root.style.scrollPaddingBottom = `${element.offsetHeight}px`
    }
    keepRoom()
    const observer = new ResizeObserver(keepRoom)
    observer.observe(element)
    return () => {
      observer.disconnect()
      root.style.scrollPaddingBottom = ""
    }
  }, [])

  return (
    <section
      ref={region}
      tabIndex={-1}
      aria-labelledby={headingId}
      className="sticky bottom-0 z-15 order-last border-t-[1.5px] border-brand-ink bg-brand-surface text-brand-ink focus-visible:-outline-offset-4"
    >
      <div className={cn(LANDING_CONTAINER, "flex flex-col gap-3 py-4 lg:flex-row lg:items-center lg:justify-between lg:gap-10")}>
        <div className="flex max-w-3xl flex-col gap-1">
          <h2 id={headingId} className="text-[15px] font-extrabold">
            {text.title}
          </h2>
          <p className="text-sm leading-snug text-brand-text">
            {withParts(text.body, {
              privacy: (
                <Link href={privacyHref} className="font-semibold text-brand-ink underline underline-offset-2">
                  {text.privacy}
                </Link>
              ),
            })}
          </p>
          {current ? <p className="text-sm font-bold">{text.current[current]}</p> : null}
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
