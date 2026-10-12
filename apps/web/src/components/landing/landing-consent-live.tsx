"use client"

// React
import { useEffect, useRef } from "react"

// UI
import { LandingConsent } from "@harness-monorepo/ui/blocks/landing/landing-consent"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { AppLink } from "@/components/app-link"
import { useSiteAsks, useSiteConsent } from "./site-consent-provider"

export interface LandingConsentLiveProps {
  privacyHref: string
  /** The notice's own sentences, and only them: what a Client Component is handed is written into the page. */
  text: UiMessages["landing"]["consent"]
}

/**
 * The landing's cookie notice, wired to the visitor's answer (BEELINK-319). It is on the page while
 * nobody answered, or when the footer's "Cookies" asked for it again — then it says the answer in
 * force and takes the focus.
 *
 * The answer given is said in a status line: the notice leaves the page with the click, and a
 * screen reader would otherwise hear nothing happen.
 *
 * Where the site does not ask (`SiteConsentGate` found no measurement ID) it draws nothing at all.
 */
export function LandingConsentLive({ privacyHref, text }: LandingConsentLiveProps) {
  const asks = useSiteAsks()
  const asking = useSiteConsent((consent) => consent.asking)
  const choice = useSiteConsent((consent) => consent.choice)
  const answered = useSiteConsent((consent) => consent.answered)
  const reopened = useSiteConsent((consent) => consent.asks)
  const accept = useSiteConsent((consent) => consent.accept)
  const refuse = useSiteConsent((consent) => consent.refuse)
  const notice = useRef<HTMLElement>(null)

  useEffect(() => {
    if (reopened > 0) notice.current?.focus()
  }, [reopened])

  if (!asks) return null

  return (
    <>
      {asking ? <LandingConsent ref={notice} privacyHref={privacyHref} current={choice} onAccept={accept} onRefuse={refuse} linkComponent={AppLink} text={text} /> : null}
      <p role="status" className="sr-only">
        {answered && choice ? text.saved[choice] : ""}
      </p>
    </>
  )
}
