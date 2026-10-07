"use client"

// React
import { useEffect, useRef } from "react"

// UI
import { StorefrontConsent } from "@harness-monorepo/ui/blocks/storefront/storefront-consent"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { AppLink } from "@/components/app-link"
import { useConsent } from "./consent-provider"

export interface StorefrontConsentLiveProps {
  privacyHref: string
  messages: UiMessages
}

/**
 * The cookie strip, wired to the visitor's answer at this shop (BEELINK-271). It is on the page
 * while nobody answered, or when the footer's "Cookies" asked for it again — then it says the
 * answer in force and takes the focus, since it sits at the other end of the page.
 *
 * The answer given is said in a status line: the strip leaves the page with the click, and a
 * screen reader would otherwise hear nothing happen.
 */
export function StorefrontConsentLive({ privacyHref, messages }: StorefrontConsentLiveProps) {
  const asking = useConsent((consent) => consent.asking)
  const choice = useConsent((consent) => consent.choice)
  const answered = useConsent((consent) => consent.answered)
  const asks = useConsent((consent) => consent.asks)
  const accept = useConsent((consent) => consent.accept)
  const refuse = useConsent((consent) => consent.refuse)
  const strip = useRef<HTMLElement>(null)

  useEffect(() => {
    if (asks > 0) strip.current?.focus()
  }, [asks])

  return (
    <>
      {asking ? (
        <StorefrontConsent ref={strip} privacyHref={privacyHref} current={choice} onAccept={accept} onRefuse={refuse} linkComponent={AppLink} messages={messages} />
      ) : null}
      <p role="status" className="sr-only">
        {answered && choice ? messages.storefront.consent.saved[choice] : ""}
      </p>
    </>
  )
}
