/** Where the panel lives: every other path the proxy hands over is a shop window. */
export const PANEL_PATHS = ["/dashboard", "/admin", "/create-store"]

/** The page to go back to after signing in, on `/login`. */
export const RETURN_KEY = "voltar"

export function isPanelPage(pathname: string): boolean {
  return PANEL_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

/**
 * A page of the panel to go back to, or null. Only the panel's own: a sign-in link that could send
 * anywhere is a phishing page's best friend, so another site, a protocol-relative `//` and a shop
 * window all fall back to the panel's front.
 */
export function panelReturnOf(raw: string | null | undefined): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return null
  return isPanelPage(raw.split(/[?#]/)[0] ?? "") ? raw : null
}

/** The sign-in page that comes back to `back` once the person is in. */
export function signInHrefOf(back: string): string {
  const path = panelReturnOf(back)
  return path ? `/login?${RETURN_KEY}=${encodeURIComponent(path)}` : "/login"
}

/** An answer that says the session is over: its refresh is spent too, since the proxy renews one still good. */
export function isSignedOutError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "errorCode" in error && error.errorCode === "AUTH_UNAUTHENTICATED"
}
