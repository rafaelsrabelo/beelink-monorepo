// Libs
import type { BrowserContext } from "@playwright/test"

/**
 * Google, stood in for (BEELINK-320). No request of a test ever reaches it: every one to its hosts
 * is answered here, and kept in a list — which is the proof a test reads.
 *
 * In place of Google's tag library the page is served the one below. It was written from what
 * Google documents of its own, and it is no copy: it shows what this app asks of the library, not
 * what Google's does with it. Where the two could differ, it takes the worse case for us:
 *
 * - it reads the queue as Google's does — a command is an `arguments` object, nothing else is;
 * - it sends an event to the ID it is addressed to (`send_to`), or to every ID configured;
 * - a refusal of `analytics_storage` stops its cookies and not its hits, as consent mode's
 *   cookieless pings do: only the `ga-disable-<ID>` lock silences it;
 * - it writes `_ga` and `_ga_<ID>` when it sends with storage granted;
 * - it tells a page view of its own at every change of the address, with the whole address, the way
 *   a GA4 property does while "Page changes based on browser history events" is on — marked
 *   `standin_own=1`, so a test can say none ever left.
 */
const LIBRARY = `(() => {
  const layer = (window.dataLayer = window.dataLayer || [])
  const consent = {}
  const settings = {}
  const shut = (id) => window["ga-disable-" + id] === true
  const keep = (name, value) => (document.cookie = name + "=" + value + "; path=/; max-age=63072000")

  function hit(id, name, params, own) {
    if (shut(id)) return
    const stored = consent.analytics_storage === "granted"
    if (stored) {
      keep("_ga", "GA1.1.1111111111.2222222222")
      keep("_ga_" + id.slice(2), "GS2.1.s3333333333")
    }
    const query = new URLSearchParams({ v: "2", tid: id, en: name, dl: params.page_location || location.href, gcs: stored ? "G101" : "G100" })
    if (params.page_referrer) query.set("dr", params.page_referrer)
    if (params.page_title) query.set("dt", params.page_title)
    if (own) query.set("standin_own", "1")
    fetch("https://www.google-analytics.com/g/collect?" + query, { method: "POST", mode: "no-cors", keepalive: true }).catch(() => {})
  }

  function read(call) {
    if (Object.prototype.toString.call(call) !== "[object Arguments]") return
    const [command, first, second] = call
    if (command === "consent") Object.assign(consent, second)
    if (command === "config") {
      settings[first] = second || {}
      if (settings[first].send_page_view !== false) hit(first, "page_view", settings[first], true)
    }
    if (command === "event") {
      const { send_to: to, ...params } = second || {}
      for (const id of to ? [to] : Object.keys(settings)) hit(id, first, { ...settings[id], ...params }, false)
    }
  }

  layer.forEach(read)
  const push = layer.push.bind(layer)
  layer.push = (...calls) => {
    calls.forEach(read)
    return push(...calls)
  }

  const pageOf = (address) => address.split("#")[0]
  const moved = () => Object.keys(settings).forEach((id) => hit(id, "page_view", { page_location: location.href }, true))
  for (const method of ["pushState", "replaceState"]) {
    const original = history[method]
    history[method] = function (...args) {
      const before = pageOf(location.href)
      const result = original.apply(this, args)
      if (pageOf(location.href) !== before) moved()
      return result
    }
  }
  window.addEventListener("popstate", moved)
})()`

/** Wherever Google's library is fetched from or reports to. */
const GOOGLE = /^https?:\/\/([a-z0-9-]+\.)*(googletagmanager\.com|google-analytics\.com|analytics\.google\.com|doubleclick\.net|google\.com|google\.com\.br|gstatic\.com)\//

export interface GoogleTraffic {
  /** Every request a page tried to make to Google, in order. None of them left the machine. */
  requests: string[]
  /** The ones that asked for the library. */
  scripts: () => string[]
  /** The events the library reported, each as its parameters: `tid` the ID, `en` the name, `dl` the page. */
  hits: () => URLSearchParams[]
}

/** Answers for Google in every page of this context, and keeps what was asked of it. Call it before the first page is opened. */
export async function standInForGoogle(context: BrowserContext): Promise<GoogleTraffic> {
  const requests: string[] = []

  await context.route(GOOGLE, async (route) => {
    const url = route.request().url()
    requests.push(url)

    if (new URL(url).pathname === "/gtag/js") await route.fulfill({ status: 200, contentType: "application/javascript", body: LIBRARY })
    else await route.fulfill({ status: 204, body: "" })
  })

  return {
    requests,
    scripts: () => requests.filter((url) => new URL(url).pathname === "/gtag/js"),
    hits: () => requests.filter((url) => new URL(url).pathname === "/g/collect").map((url) => new URL(url).searchParams),
  }
}
