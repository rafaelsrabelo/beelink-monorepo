/**
 * Google's tag library, and the only file that names `gtag`, its `dataLayer`, the address its script
 * is fetched from and the `ga-disable-<ID>` lock (BEELINK-320). Browser only: every function here is
 * called from an effect or a handler, after a visitor's yes was read.
 *
 * One tab may come to hold more than one measurement ID — Beelink's own today, a shop's one day
 * (BEELINK-303) — so nothing here is ever sent to "the IDs on the page": every function takes the ID,
 * and every event is addressed to it.
 */

const GOOGLE_TAG_SRC = "https://www.googletagmanager.com/gtag/js"

/** Where the library is fetched from. The ID is part of the address, and of nothing else: no script text is ever built. */
export function googleAnalyticsSrc(measurementId: string): string {
  return `${GOOGLE_TAG_SRC}?id=${encodeURIComponent(measurementId)}`
}

/** What a page is told as: the address chosen for it, never whatever the browser's bar holds. */
export interface GoogleAnalyticsPage {
  page_location: string
  page_referrer?: string
  page_title?: string
}

export interface GoogleAnalyticsEvent {
  name: string
  /** The page it happened on, always: left out, the library reads the address by itself, parameters and all. */
  params: GoogleAnalyticsPage
}

type ConsentType = "ad_storage" | "ad_user_data" | "ad_personalization" | "analytics_storage" | "functionality_storage" | "personalization_storage" | "security_storage"
type ConsentState = Partial<Record<ConsentType, "granted" | "denied">>

interface TagSettings extends GoogleAnalyticsPage {
  send_page_view: false
  allow_google_signals: false
  allow_ad_personalization_signals: false
}

type GtagArguments =
  | [command: "consent", action: "default" | "update", state: ConsentState]
  | [command: "js", at: Date]
  | [command: "config", measurementId: string, settings: TagSettings]
  | [command: "event", name: string, params: GoogleAnalyticsPage & { send_to: string }]

declare global {
  interface Window {
    /** The queue Google's snippet creates before its library arrives; the library then reads every push. */
    dataLayer?: unknown[]
    /** Google's own switch: while true, the library sends nothing for that measurement ID. */
    [lock: `ga-disable-${string}`]: boolean | undefined
  }
}

/** Every kind of storage consent mode knows, refused. Only measurement is ever granted, and only by a yes. */
const ALL_DENIED = {
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
  analytics_storage: "denied",
  functionality_storage: "denied",
  personalization_storage: "denied",
  security_storage: "denied",
} as const satisfies Record<ConsentType, "denied">

/** What this tab's library was told, kept beside its queue so the two live and die together. */
interface TagState {
  /** The IDs this tab opened at least once: the ones a navigation has to shut. */
  opened: Set<string>
  /** Which way measurement consent was last turned. It is the tab's, not an ID's. */
  granted: boolean
}

const states = new WeakMap<unknown[], TagState>()

const lockOf = (measurementId: string) => `ga-disable-${measurementId}` as const

/** Google's snippet, as a typed function instead of an injected script: calls wait in the queue until the library takes over. */
function gtag(...command: GtagArguments): void
function gtag(): void {
  // The library tells a command from data by its being an `arguments` object: an array pushed here is never read.
  // eslint-disable-next-line prefer-rest-params
  window.dataLayer?.push(arguments)
}

/** What the tab was told so far, or nothing where no ID was ever opened in it. */
function told(): TagState | undefined {
  return window.dataLayer && states.get(window.dataLayer)
}

function stateOf(): TagState {
  const known = told()
  if (known) return known

  const state: TagState = { opened: new Set<string>(), granted: false }
  window.dataLayer ??= []
  states.set(window.dataLayer, state)
  // First in the queue, before the library can read anything else: it starts with every storage refused.
  gtag("consent", "default", ALL_DENIED)
  gtag("js", new Date())
  return state
}

function shut(state: TagState | undefined, measurementId: string): void {
  if (state?.opened.has(measurementId)) window[lockOf(measurementId)] = true
}

/**
 * This ID, open on the page the visitor is on: measurement consent granted, the lock off, and the
 * library told the page's address — at every arrival, so that what it sends by itself carries the
 * address chosen here and not the one it would read.
 *
 * Called where a yes stands, on a page that is measured, and nowhere else. No page view is sent by
 * the library on its own account (`send_page_view`), nothing is linked to an ad profile, and
 * nothing of the visitor's is given for matching: there is no `user_id` here.
 */
export function startGoogleAnalytics(measurementId: string, page: GoogleAnalyticsPage): void {
  const state = stateOf()

  if (!state.granted) {
    state.granted = true
    gtag("consent", "update", { analytics_storage: "granted" })
  }
  state.opened.add(measurementId)
  window[lockOf(measurementId)] = false
  gtag("config", measurementId, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false, ...page })
}

/**
 * The page this ID was open on is being left — or, with no ID, a navigation to another page began
 * and every ID this tab opened is shut. The library stays in the tab until the next load, and it
 * listens to the address changing by itself: it must already be shut when the address does.
 * Arriving at a measured page with a yes opens it again.
 */
export function shutGoogleAnalytics(measurementId?: string): void {
  const state = told()
  for (const opened of measurementId ? [measurementId] : (state?.opened ?? [])) shut(state, opened)
}

/** The visitor's yes was taken back: this ID is shut, and the library is told measurement is refused. */
export function stopGoogleAnalytics(measurementId: string): void {
  const state = told()
  shut(state, measurementId)
  if (!state?.granted) return

  state.granted = false
  gtag("consent", "update", { analytics_storage: "denied" })
}

/**
 * One event, to one measurement ID and no other. Asked for while that ID is shut — no yes, or the
 * page being left — it is dropped and never kept for later; the answer says which it was.
 */
export function sendToGoogleAnalytics(measurementId: string, event: GoogleAnalyticsEvent): boolean {
  if (!told()?.opened.has(measurementId) || window[lockOf(measurementId)] !== false) return false

  gtag("event", event.name, { ...event.params, send_to: measurementId })
  return true
}

/**
 * What to write so that Google Analytics' cookies leave a browser at `hostname`: `_ga` and every
 * `_ga_<stream>`, expired on the host alone and on each parent domain. The library writes them "at
 * the highest level it can", and which one that was is not for this code to know.
 */
export function googleAnalyticsCookieExpiries(cookies: string, hostname: string): string[] {
  const names = new Set(
    cookies
      .split(";")
      .map((entry) => entry.trim().split("=")[0])
      .filter((name) => name === "_ga" || name.startsWith("_ga_")),
  )
  const labels = hostname.split(".")
  const domains = labels.slice(0, -1).map((_, index) => labels.slice(index).join("."))

  return [...names].flatMap((name) => [`${name}=; Path=/; Max-Age=0`, ...domains.map((domain) => `${name}=; Domain=${domain}; Path=/; Max-Age=0`)])
}

/** Google Analytics' cookies, taken out of this browser: after a yes taken back, or a no given by someone who once said yes. */
export function forgetGoogleAnalyticsCookies(): void {
  for (const expiry of googleAnalyticsCookieExpiries(document.cookie, window.location.hostname)) document.cookie = expiry
}
