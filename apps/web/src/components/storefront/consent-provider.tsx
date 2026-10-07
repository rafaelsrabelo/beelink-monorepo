"use client"

// React
import { createContext, useContext, useState, type ReactNode } from "react"

// Libs
import { useStore } from "zustand"

// App
import type { ConsentChoice } from "@/lib/consent-cookie"
import { createConsentStore, type ConsentState, type ConsentStore } from "@/stores/consent"

const ConsentContext = createContext<ConsentStore | null>(null)

/**
 * Outside a shop's own pages — the panel's design preview draws the same footer — nobody is asked
 * anything. A refusal that ignores every change stands in: nothing may be loaded on its word, and
 * the footer's "Cookies" does nothing there, like every link of the preview.
 */
const INERT: ConsentStore = createConsentStore("", "denied")
INERT.setState({ accept: () => {}, refuse: () => {}, ask: () => {} })

export interface ConsentProviderProps {
  slug: string
  /** What the server read from the cookie, so the browser starts where the HTML left off. */
  choice: ConsentChoice | null
  children: ReactNode
}

/**
 * The visitor's answer at this shop, for every page of it. The layout provides it once per shop and
 * page load, and only at a shop that has something to ask about.
 */
export function ConsentProvider({ slug, choice, children }: ConsentProviderProps) {
  const [store] = useState(() => createConsentStore(slug, choice))

  return <ConsentContext value={store}>{children}</ConsentContext>
}

/**
 * One field per subscription: `useConsent((consent) => consent.choice)`. This is how the page learns
 * of a yes the moment it is given, with no reload — and of a yes taken back.
 */
export function useConsent<T>(selector: (state: ConsentState) => T): T {
  return useStore(useContext(ConsentContext) ?? INERT, selector)
}
