/**
 * What a visitor told this shop about themselves, as the `bl_shop` cookie holds it: for now, the CEP
 * they deliver to. Its own cookie and not `bl_prefs`, which is the panel's, and on `path=/<slug>`:
 * a CEP given to one shop is that shop's.
 *
 * Read and written in the browser only. A Server Component that read it would make every page of
 * the shop window dynamic, and the window is the page that has to be cached.
 */

export const SHOP_PREFS_COOKIE = "bl_shop"
/** A year: a visitor's address changes rarely, and asking again costs them a form. */
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365

/** The CEP in a `document.cookie` string, eight digits, or null for none or one that is not a CEP. */
export function cepFromCookies(cookies: string): string | null {
  const entry = cookies.split(/;\s*/).find((pair) => pair.startsWith(`${SHOP_PREFS_COOKIE}=`))
  const value = entry ? decodeURIComponent(entry.slice(SHOP_PREFS_COOKIE.length + 1)) : ""
  const cep = /(?:^|~)cep\.(\d{8})(?:~|$)/.exec(value)?.[1]
  return cep ?? null
}

/** The cookie that keeps a CEP for one shop, as `document.cookie` takes it. */
export function shopPrefsCookieOf(slug: string, cep: string, secure: boolean): string {
  return `${SHOP_PREFS_COOKIE}=cep.${cep};path=/${encodeURIComponent(slug)};max-age=${MAX_AGE_SECONDS};samesite=lax${secure ? ";secure" : ""}`
}
