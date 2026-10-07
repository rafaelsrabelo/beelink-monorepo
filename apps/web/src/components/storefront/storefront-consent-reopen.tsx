"use client"

// React
import { useEffect, useRef } from "react"

// UI
import { StorefrontFooterAction } from "@harness-monorepo/ui/blocks/storefront/storefront-footer-action"

// App
import { useConsent } from "./consent-provider"

export interface StorefrontConsentReopenProps {
  label: string
}

/**
 * The footer's "Cookies": it puts the strip back on the page, for a visitor who wants to change
 * their answer. The strip is at the top and this is at the foot, so the focus goes there with the
 * click — and comes back here once they have answered, rather than being dropped on the page.
 *
 * Outside a shop's own pages (the panel's preview) it does nothing, like every link drawn there.
 */
export function StorefrontConsentReopen({ label }: StorefrontConsentReopenProps) {
  const ask = useConsent((consent) => consent.ask)
  const asking = useConsent((consent) => consent.asking)
  const button = useRef<HTMLButtonElement>(null)
  // Whether the strip on the page was asked for from here: only then is the focus this button's to take back.
  const opened = useRef(false)

  useEffect(() => {
    if (asking || !opened.current) return
    opened.current = false
    button.current?.focus()
  }, [asking])

  return (
    <StorefrontFooterAction
      ref={button}
      onClick={() => {
        opened.current = true
        ask()
      }}
    >
      {label}
    </StorefrontFooterAction>
  )
}
