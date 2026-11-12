/** Where the panel lives: every other path the proxy hands over is a shop window. */
export const PANEL_PATHS = ["/dashboard", "/admin", "/create-store"]

/** The page to go back to after signing in, on `/login`. */
export const RETURN_KEY = "voltar"

/**
 * Where an invited affiliate signs in from and comes back to (IMPULSEIA-104): a page of bee-link's own,
 * signed in or not, and never a shop's — `afiliado` is a reserved slug.
 */
export const AFFILIATE_INVITE_PATH = "/afiliado/convite"

/** The affiliate's own area (IMPULSEIA-108): the shops an account sells for, and each one's page. */
export const AFFILIATE_AREA_PATH = "/afiliado"

/** A page of the affiliate's area: signed in like the panel — all of it but the invite, which is public. */
export function isAffiliateAreaPage(pathname: string): boolean {
  if (pathname === AFFILIATE_INVITE_PATH || pathname.startsWith(`${AFFILIATE_INVITE_PATH}/`)) return false
  return pathname === AFFILIATE_AREA_PATH || pathname.startsWith(`${AFFILIATE_AREA_PATH}/`)
}

/** A signed-in page of bee-link's own: the panel's, and the affiliate's area. */
export function isPanelPage(pathname: string): boolean {
  return PANEL_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`)) || isAffiliateAreaPage(pathname)
}

/**
 * A page of the panel to go back to, or null. Only the panel's own — and the affiliate's invite, which
 * a person with an account signs in to accept: a sign-in link that could send anywhere is a phishing
 * page's best friend, so another site, a protocol-relative `//` and a shop window all fall back to the
 * panel's front.
 */
export function panelReturnOf(raw: string | null | undefined): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return null
  const path = raw.split(/[?#]/)[0] ?? ""
  return isPanelPage(path) || path === AFFILIATE_INVITE_PATH ? raw : null
}

/** The sign-in page that comes back to `back` once the person is in. */
export function signInHrefOf(back: string): string {
  const path = panelReturnOf(back)
  return path ? `/login?${RETURN_KEY}=${encodeURIComponent(path)}` : "/login"
}

/**
 * Where a page goes when a call says its session is over: the route that clears the cookies first —
 * a revoked session still has its access cookie, and the proxy would take `/login` for signed in —
 * then the sign-in, and back to `back`.
 */
export function sessionEndedHrefOf(back: string): string {
  const path = panelReturnOf(back)
  return path ? `/api/session/expired?${RETURN_KEY}=${encodeURIComponent(path)}` : "/api/session/expired"
}

/** An answer that says the session is over: its refresh is spent too, since the proxy renews one still good. */
export function isSignedOutError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "errorCode" in error && error.errorCode === "AUTH_UNAUTHENTICATED"
}
