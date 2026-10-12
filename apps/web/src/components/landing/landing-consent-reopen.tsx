"use client"

// React
import { useEffect, useRef } from "react"

// UI
import { LandingFooterAction } from "@harness-monorepo/ui/blocks/landing/landing-footer-action"

// App
import { useSiteAsks, useSiteConsent } from "./site-consent-provider"

export interface LandingConsentReopenProps {
  label: string
}

/**
 * The footer's "Cookies": it puts the notice back on the page, for a visitor who wants to change
 * their answer. The focus goes to the notice with the click — and comes back here once they have
 * answered, rather than being dropped on the page.
 *
 * Where the site does not ask it draws nothing: a "Cookies" that opened nothing would be a link to nowhere.
 */
export function LandingConsentReopen({ label }: LandingConsentReopenProps) {
  const asks = useSiteAsks()
  const ask = useSiteConsent((consent) => consent.ask)
  const asking = useSiteConsent((consent) => consent.asking)
  const button = useRef<HTMLButtonElement>(null)
  // Whether the notice on the page was asked for from here: only then is the focus this button's to take back.
  const opened = useRef(false)

  useEffect(() => {
    if (asking || !opened.current) return
    opened.current = false
    button.current?.focus()
  }, [asking])

  if (!asks) return null

  return (
    <LandingFooterAction
      ref={button}
      onClick={() => {
        opened.current = true
        ask()
      }}
    >
      {label}
    </LandingFooterAction>
  )
}
