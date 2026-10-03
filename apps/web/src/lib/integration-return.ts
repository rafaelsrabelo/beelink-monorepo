// Next
import type { NextResponse } from "next/server"

type CookieJar = NextResponse["cookies"]

/**
 * The shop a connection to a third party began at (BEELINK-182), so the browser comes back to that
 * shop's panel. A way home, never a credential: the API decides the connection by its own state, tied
 * to the person, and refuses anyone else's. Scoped to the callbacks, and gone in ten minutes.
 */
export const INTEGRATION_RETURN_COOKIE = "bl_integration_return"
const COOKIE_PATH = "/api/integrations"
const TEN_MINUTES_S = 10 * 60

/** What the panel's integrations page reads from its address after the return. */
export const INTEGRATION_RESULT_KEYS = { connected: "conectado", error: "erro" } as const

const isSlug = (value: string | undefined | null): value is string => typeof value === "string" && /^[a-z0-9-]{1,80}$/.test(value)

export function setIntegrationReturn(cookies: CookieJar, slug: string): void {
  cookies.set(INTEGRATION_RETURN_COOKIE, slug, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: COOKIE_PATH, maxAge: TEN_MINUTES_S })
}

export function clearIntegrationReturn(cookies: CookieJar): void {
  cookies.set(INTEGRATION_RETURN_COOKIE, "", { path: COOKIE_PATH, maxAge: 0 })
}

/** The shop to go back to: the one the API named, else the cookie's; null when neither is a slug. */
export function integrationReturnOf(...candidates: (string | undefined | null)[]): string | null {
  return candidates.find(isSlug) ?? null
}

/** The panel's integrations page, saying what came of the connection; the panel's front with no shop to go back to. */
export function integrationsPageOf(slug: string | null, result: { connected: string } | { error: string }): string {
  if (!slug) return "/admin"
  const query = new URLSearchParams("connected" in result ? { [INTEGRATION_RESULT_KEYS.connected]: result.connected } : { [INTEGRATION_RESULT_KEYS.error]: result.error })
  return `/admin/${slug}/integrations?${query.toString()}`
}
