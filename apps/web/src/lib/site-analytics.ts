// App
import type { GoogleAnalyticsPage } from "./google-analytics"
import type { SiteConsentChoice } from "./site-consent-cookie"

/**
 * What Beelink's own site tells of a visit (BEELINK-320), in the words Google Analytics reads them
 * by — the one place they are spelled. A page opened, an account created and a courier's application
 * sent (BEELINK-322), and no more: that is what the privacy policy says is sent, so another event is
 * a new version of that text. None carries a parameter of its own: that it happened, and on which
 * page, is all that is told.
 */
export type SiteEvent = { name: "page_view" } | { name: "sign_up" } | { name: "generate_lead" }

/** How a screen says something happened. It knows nothing of who is told, or whether anyone is. */
export type SiteTrack = (event: SiteEvent) => void

/** What says which link brought a visitor, and nothing about who they are. */
const CAMPAIGN_LABELS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]

/** A label is a word or two. Past this it is something else, written into a link by whoever made it. */
const LABEL_MAX = 80

/**
 * Beelink's measurement ID, for the browser of a visitor whose yes the server read — and for no
 * other. The ID is no secret, but it is the script's address: a page that does not load the script
 * has no use for it, and is not handed it.
 */
export function siteAnalyticsIdFor(measurementId: string | undefined, consent: SiteConsentChoice | null): string | null {
  return consent === "granted" && measurementId ? measurementId : null
}

/** A campaign label as it may be told: short, and not an address somebody wrote into a link. */
function tellable(label: string): boolean {
  return label.length <= LABEL_MAX && !label.includes("@")
}

/** `URL.canParse` is newer than browsers this page is opened in: an address that is none must not stop the page. */
function addressOf(raw: string): URL | null {
  try {
    return new URL(raw)
  } catch {
    return null
  }
}

/**
 * Where the visitor came from, as it is told. Another site: its origin and path, no parameter. This
 * very site: its origin alone — a shop's page, the panel's or a link with a token is never named to
 * Google, not even as the page before this one.
 */
function arrivalOf(referrer: string, site: string): string | undefined {
  const from = addressOf(referrer)
  // An app's own scheme, or a blank page, has no origin to name.
  if (!from || (from.protocol !== "https:" && from.protocol !== "http:")) return undefined
  return from.origin === site ? `${site}/` : `${from.origin}${from.pathname}`
}

/**
 * The page a visitor is on, as Google Analytics is told of it: the origin and the path, and of the
 * address's parameters only the campaign's labels. Everything else is left out — the sign-in's
 * address carries the panel page to go back to, and any link may bring a click identifier or
 * whatever its author wrote. The fragment goes too.
 *
 * Written out on every event, because the library reads the browser's whole address by itself
 * wherever it is not told one.
 */
export function sitePageOf(href: string, referrer: string, title: string): GoogleAnalyticsPage {
  const url = new URL(href)
  const labels = new URLSearchParams()
  for (const label of CAMPAIGN_LABELS) {
    const value = url.searchParams.get(label)
    if (value && tellable(value)) labels.set(label, value)
  }
  const query = labels.toString()
  const from = arrivalOf(referrer, url.origin)

  return {
    page_location: `${url.origin}${url.pathname}${query ? `?${query}` : ""}`,
    ...(from ? { page_referrer: from } : {}),
    ...(title ? { page_title: title } : {}),
  }
}
