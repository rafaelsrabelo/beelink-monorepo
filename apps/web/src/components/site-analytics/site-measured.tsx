// React
import type { ReactNode } from "react"

// App
import { SiteConsentGate } from "../landing/site-consent-gate"
import { SiteAnalytics } from "./site-analytics"
import { serverEnv } from "@/lib/server-env"
import { siteAnalyticsIdFor } from "@/lib/site-analytics"
import { siteConsentAt } from "@/lib/site-consent"

export interface SiteMeasuredProps {
  /** The whole page. */
  children: ReactNode
}

/**
 * Around a page of Beelink's own site that is measured (BEELINK-320) — and the pages that mount it
 * are the list of them: the landing, the sign-in and the sign-up, which is what the privacy policy
 * names. Never a layout: the other signed-out screens open by links that hold a token, and a shop's
 * pages and the panel are not Beelink's to measure.
 *
 * It reads the visitor's answer and decides the one thing a server can here: whether the browser is
 * handed the measurement ID at all. Asking is the landing's alone — the page inside decides whether
 * a notice is drawn; the sign-in and the sign-up draw none and use the answer already given.
 */
export async function SiteMeasured({ children }: SiteMeasuredProps) {
  const consent = await siteConsentAt()
  const measurementId = serverEnv.SITE_GA_MEASUREMENT_ID

  return (
    <SiteConsentGate measurementId={measurementId} choice={consent}>
      <SiteAnalytics measurementId={siteAnalyticsIdFor(measurementId, consent)} drawnFor={consent}>
        {children}
      </SiteAnalytics>
    </SiteConsentGate>
  )
}
