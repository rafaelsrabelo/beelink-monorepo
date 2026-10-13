"use client"

// React
import { useCallback, useEffect, useRef, useSyncExternalStore, type ReactNode } from "react"

// Next
import { usePathname, useRouter } from "next/navigation"
import Script from "next/script"

// App
import { useSiteAsks, useSiteConsent } from "../landing/site-consent-provider"
import { SiteTrackContext } from "./use-site-track"
import { forgetGoogleAnalyticsCookies, googleAnalyticsSrc, sendToGoogleAnalytics, shutGoogleAnalytics, startGoogleAnalytics, stopGoogleAnalytics } from "@/lib/google-analytics"
import { sitePageOf, type SiteTrack } from "@/lib/site-analytics"
import { siteConsentIn, type SiteConsentChoice } from "@/lib/site-consent-cookie"

export interface SiteAnalyticsProps {
  /** Beelink's measurement ID, which the server hands over only for a yes it read (`siteAnalyticsIdFor`); null for anyone else. */
  measurementId: string | null
  /** The answer the server drew this page for. */
  drawnFor: SiteConsentChoice | null
  /** The page's own title, as the page names it. */
  title: string
  /** The page that is measured. */
  children: ReactNode
}

/** A cookie has no change event. It is read again at every render, and an answer given on the page brings one. */
const never = () => () => {}

/**
 * Beelink's own measurement of its own site (BEELINK-320): around a page that is measured, and
 * mounted by `SiteMeasured` alone. Nothing of Google's exists until a yes stands — no script, no
 * queue for its calls, no cookie of its own.
 *
 * A yes is acted on only while two things say it: the answer the page holds and the cookie the
 * browser holds at that moment. A page the router kept — the one Back returns to — may have been
 * drawn for an answer since taken back, and nothing is loaded on the word of a page.
 *
 * The visitor who says yes on this very page has no ID yet: the server kept it, and is asked for the
 * page again. A yes taken back shuts the library at once and takes its cookies out; the library
 * itself stays in the tab until the next load, shut. Leaving the page shuts it too, and so does the
 * start of any navigation away (`instrumentation-client.ts`): it is open only while the visitor
 * stands on a measured page.
 */
export function SiteAnalytics({ measurementId, drawnFor, title, children }: SiteAnalyticsProps) {
  const asks = useSiteAsks()
  const choice = useSiteConsent((consent) => consent.choice)
  const held = useSyncExternalStore(
    never,
    () => siteConsentIn(document.cookie),
    () => choice,
  )
  const pathname = usePathname()
  const router = useRouter()
  const id = choice === "granted" && held === "granted" ? measurementId : null
  const refused = asks && (choice === "denied" || held === "denied")
  // The page whose view was told, so an effect run twice does not tell it twice.
  const viewed = useRef<string | null>(null)

  useEffect(() => {
    // The page was drawn for another answer than the browser's: the server draws it again, with the ID or without it.
    if (asks && held !== drawnFor) router.refresh()
  }, [asks, held, drawnFor, router])

  /**
   * Where the visitor is, as it is told: no parameter of the address but a campaign's labels, and
   * the title the page was given — never the document's, where the page before may still stand.
   */
  const pageNow = useCallback(() => sitePageOf(window.location.href, document.referrer, title), [title])

  useEffect(() => {
    if (!id) return

    const arrive = () => {
      startGoogleAnalytics(id, pageNow())
      if (viewed.current === pathname) return
      viewed.current = pathname
      sendToGoogleAnalytics(id, { name: "page_view", params: pageNow() })
    }
    // One task later, and never inside the event that brought the page: Back and Forward tell every
    // listener that the address changed, the library's among them, and it must still be shut then.
    let opening = window.setTimeout(arrive)
    // Back or Forward within this very page shuts the library like any other; it opens again once the event is over.
    const stay = () => {
      window.clearTimeout(opening)
      opening = window.setTimeout(arrive)
    }
    window.addEventListener("popstate", stay)

    return () => {
      window.clearTimeout(opening)
      window.removeEventListener("popstate", stay)
      shutGoogleAnalytics(id)
    }
  }, [id, pathname, pageNow])

  useEffect(() => {
    if (!refused) return

    // A yes given again is told where the visitor is then, like any yes.
    viewed.current = null
    if (measurementId) stopGoogleAnalytics(measurementId)
    forgetGoogleAnalyticsCookies()
  }, [refused, measurementId])

  const track = useCallback<SiteTrack>(
    (event) => {
      // Asked of the cookie again at the moment of telling: another tab may have taken the yes back.
      if (id && siteConsentIn(document.cookie) === "granted") sendToGoogleAnalytics(id, { name: event.name, params: pageNow() })
    },
    [id, pageNow],
  )

  return (
    <SiteTrackContext value={track}>
      {children}
      {/* Whichever comes first, the library or the queue the effect above creates: it reads what waits, and every call after. */}
      {id ? <Script id="site-analytics" src={googleAnalyticsSrc(id)} strategy="afterInteractive" /> : null}
    </SiteTrackContext>
  )
}
