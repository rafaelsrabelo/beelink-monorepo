// App
import { shutGoogleAnalytics } from "@/lib/google-analytics"

/**
 * The start of every navigation the router makes, before the address changes (BEELINK-320). Next
 * calls it by this name.
 *
 * Google's library, once a page loaded it, stays in the tab and listens to the address changing by
 * itself — and would tell the next page, whichever it is, as a view of its own. So it is shut here,
 * while the address is still the measured page's; arriving at a measured page with a yes opens it
 * again (`SiteAnalytics`). In a tab that never loaded it there is nothing to shut, and nothing is done.
 */
export function onRouterTransitionStart(url: string): void {
  const to = new URL(url, window.location.href)
  // An anchor of the same page, or a parameter of it, is no departure.
  if (to.origin === window.location.origin && to.pathname === window.location.pathname) return

  shutGoogleAnalytics()
}
