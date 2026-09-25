// Types
import type { AuthSession } from "@harness-monorepo/contracts"
import type { NextResponse } from "next/server"

/**
 * A shopper's session, apart from a shopkeeper's. Two names and not the panel's `bl_access`: one
 * person may be both, in one browser, and the two sessions must never stand in for each other — the
 * API refuses a token from the wrong door, and distinct cookies keep the web from ever sending one.
 *
 * `path: "/<slug>"`: a shopper's account belongs to one shop, and so does the session. The browser
 * sends it to that shop's pages and nowhere else, so the sessions of two shops live side by side
 * and a handler that reads one has to live under the shop's path (`/<slug>/api/customer`).
 *
 * `bl_shopper_*` and not the `bl_customer_*` these were before they were a shop's: those had
 * `path: "/"`, and would go on reaching every shop until they expire.
 */
export const CUSTOMER_ACCESS_COOKIE = "bl_shopper_access"
export const CUSTOMER_REFRESH_COOKIE = "bl_shopper_refresh"

type CookieJar = NextResponse["cookies"]

const base = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
} as const

export function setCustomerSessionCookies(jar: CookieJar, slug: string, session: AuthSession): void {
  const path = `/${slug}`
  jar.set(CUSTOMER_ACCESS_COOKIE, session.accessToken, { ...base, path, expires: new Date(session.accessTokenExpiresAt) })
  jar.set(CUSTOMER_REFRESH_COOKIE, session.refreshToken, { ...base, path, expires: new Date(session.refreshTokenExpiresAt) })
}

/**
 * A Google sign-in in flight, held to the browser that started it: the state sent to Google, the shop
 * it began at, and that shop's sign-in page to come back to on a refusal. Only the fixed callback
 * reads it, for ten minutes — the state's own life at the API. Comparing it with the state that
 * comes back is what stops someone finishing, in another person's browser, a sign-in they started.
 */
export const GOOGLE_STATE_COOKIE = "bl_oauth_google"
export const GOOGLE_CALLBACK_PATH = "/api/customer/google/callback"

export interface GoogleFlight {
  state: string
  slug: string
  /** The shop's sign-in page, for a refusal to land on. */
  signIn: string
}

export function setGoogleStateCookie(jar: CookieJar, flight: GoogleFlight): void {
  jar.set(GOOGLE_STATE_COOKIE, new URLSearchParams({ ...flight }).toString(), { ...base, path: GOOGLE_CALLBACK_PATH, maxAge: 600 })
}

export function googleFlightOf(value: string | undefined): GoogleFlight | null {
  if (!value) return null
  const read = new URLSearchParams(value)
  const [state, slug, signIn] = [read.get("state"), read.get("slug"), read.get("signIn")]
  return state && slug && signIn ? { state, slug, signIn } : null
}

export function clearGoogleStateCookie(jar: CookieJar): void {
  jar.delete({ name: GOOGLE_STATE_COOKIE, path: GOOGLE_CALLBACK_PATH })
}

export function clearCustomerSessionCookies(jar: CookieJar, slug: string): void {
  jar.delete({ name: CUSTOMER_ACCESS_COOKIE, path: `/${slug}` })
  jar.delete({ name: CUSTOMER_REFRESH_COOKIE, path: `/${slug}` })
}
