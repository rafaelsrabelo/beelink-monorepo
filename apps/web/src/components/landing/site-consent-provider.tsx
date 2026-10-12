"use client"

// React
import { createContext, useContext, useState, type ReactNode } from "react"

// Libs
import { useStore } from "zustand"

// App
import type { SiteConsentChoice } from "@/lib/site-consent-cookie"
import { createSiteConsentStore, type SiteConsentState, type SiteConsentStore } from "@/stores/site-consent"

const SiteConsentContext = createContext<SiteConsentStore | null>(null)

/**
 * Where nobody is asked — a deployment with no measurement ID, or a screen `SiteConsentGate` is not
 * around — a refusal that ignores every change stands in: nothing may be loaded on its word, and no
 * cookie is ever written by it.
 */
const INERT: SiteConsentStore = createSiteConsentStore("denied")
INERT.setState({ accept: () => {}, refuse: () => {}, ask: () => {} })

export interface SiteConsentProviderProps {
  /** What the server read from the cookie, so the browser starts where the HTML left off. */
  choice: SiteConsentChoice | null
  children: ReactNode
}

/** The visitor's answer to Beelink's own site, once per page load. Mounted by `SiteConsentGate` alone. */
export function SiteConsentProvider({ choice, children }: SiteConsentProviderProps) {
  const [store] = useState(() => createSiteConsentStore(choice))

  return <SiteConsentContext value={store}>{children}</SiteConsentContext>
}

/**
 * One field per subscription: `useSiteConsent((consent) => consent.choice)`. This is how a page
 * learns of a yes the moment it is given, with no reload — and of a yes taken back.
 */
export function useSiteConsent<T>(selector: (state: SiteConsentState) => T): T {
  return useStore(useContext(SiteConsentContext) ?? INERT, selector)
}

/** Whether this site asks at all, here: the notice and the footer's "Cookies" draw nothing where it does not. */
export function useSiteAsks(): boolean {
  return useContext(SiteConsentContext) !== null
}
