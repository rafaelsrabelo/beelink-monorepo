// React
import type { ReactNode } from "react"

// App
import { SiteConsentProvider } from "./site-consent-provider"
import type { SiteConsentChoice } from "@/lib/site-consent-cookie"

export interface SiteConsentGateProps {
  /** Beelink's own measurement ID (`serverEnv.SITE_GA_MEASUREMENT_ID`), or nothing where none is configured. */
  measurementId: string | undefined
  /** What the server read from `bl_site_consent`. */
  choice: SiteConsentChoice | null
  children: ReactNode
}

/**
 * Whether Beelink's site asks its visitor about being measured at all (BEELINK-319): only a
 * deployment that was told a measurement ID does. The one place that is decided — there the page
 * gets the visitor's answer around it; anywhere else it gets itself and nothing more: no state, so
 * no notice, no "Cookies" in the footer and no cookie ever written, whatever a cookie left from
 * when there was an ID says.
 *
 * The ID is only asked whether it is there. Nothing here hands it to the browser.
 */
export function SiteConsentGate({ measurementId, choice, children }: SiteConsentGateProps) {
  if (!measurementId) return children

  return <SiteConsentProvider choice={choice}>{children}</SiteConsentProvider>
}
