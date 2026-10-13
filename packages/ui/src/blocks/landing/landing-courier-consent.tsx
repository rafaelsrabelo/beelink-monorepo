"use client"

// React
import type { ComponentProps, MouseEvent } from "react"

// UI
import { withParts } from "@harness-monorepo/ui/lib/text-parts"

// Locales
import type { LandingLegalValue, UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { LANDING_REFUSAL } from "./landing-styles"

export interface LandingCourierConsentProps {
  id: string
  termsHref: string
  privacyHref: string
  text: Pick<UiMessages["landing"]["couriers"]["form"], "consent" | "terms" | "privacy">
  /** The checkbox's name and the form library's handlers. */
  checkbox: ComponentProps<"input">
  refusal?: string
  /** A plain click on one of the two links, when the screen reads the texts over the form. */
  onRead?: (document: LandingLegalValue, link: HTMLElement) => void
}

/**
 * The acceptance: one checkbox, and the sentence that says what is accepted and what the CPF, the
 * e-mail and the WhatsApp are used for, with the two texts linked from inside it.
 *
 * The two are plain anchors to the texts' own pages, and stay so: before the script arrives they
 * lead there, and a click with a modifier key or another button is the browser's — a new tab, a new
 * window. Only a plain click is handed to the screen, which reads the text over the form instead.
 * Plain anchors and not the app's router link: that one fetches a page ahead of the click, and the
 * page here is the very text the dialog waits to be asked for.
 */
export function LandingCourierConsent({ id, termsHref, privacyHref, text, checkbox, refusal, onRead }: LandingCourierConsentProps) {
  const read = (document: LandingLegalValue) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (!onRead || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    onRead(document, event.currentTarget)
  }

  return (
    <div className="flex flex-col gap-1">
      {/* The label is the checkbox's target, and on a phone its padding makes it a thumb's: the box alone is 18px. */}
      <label className="flex items-start gap-2 py-1.5 text-xs leading-[1.45] text-brand-text lg:py-0">
        <input type="checkbox" {...checkbox} aria-invalid={refusal ? true : undefined} aria-describedby={refusal ? `${id}-refusal` : undefined} className="mt-px size-[18px] shrink-0 accent-brand-ink" />
        <span>
          {withParts(text.consent, {
            terms: (
              <a href={termsHref} onClick={read("terms")} className="font-bold underline">
                {text.terms}
              </a>
            ),
            privacy: (
              <a href={privacyHref} onClick={read("privacy")} className="font-bold underline">
                {text.privacy}
              </a>
            ),
          })}
        </span>
      </label>
      {refusal ? (
        <span id={`${id}-refusal`} className={LANDING_REFUSAL}>
          {refusal}
        </span>
      ) : null}
    </div>
  )
}
