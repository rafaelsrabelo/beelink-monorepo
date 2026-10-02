/**
 * Into or out of the panel's session, the tab starts over: a full page load, never the router's
 * client-side navigation. Everything this tab holds was read as the last person — the query cache,
 * which outlives every render on purpose, each Zustand store, the router's cached pages — and only a
 * new document drops all of it at once. A soft navigation kept it, and the next person to sign in
 * on the same tab was shown the last one's shops in the header, and their pages behind them.
 *
 * `replace`, so Back does not reopen the page the last person was on. And no `queryClient.clear()`
 * first: the screens still mounted would ask again for what they show, signed out, and that answer
 * sends the tab to sign in and back to this very page — racing the load started here.
 */
export function startOver(href: string): void {
  window.location.replace(href)
}
