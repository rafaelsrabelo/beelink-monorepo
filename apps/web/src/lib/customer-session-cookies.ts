// Types
import type { AuthSession } from "@harness-monorepo/contracts"
import type { NextResponse } from "next/server"

/**
 * A shopper's session, apart from a shopkeeper's. Two names and not the panel's `bl_access`: one
 * person may be both, in one browser, and the two sessions must never stand in for each other — the
 * API refuses a token from the wrong door, and distinct cookies keep the web from ever sending one.
 *
 * `path: "/"`, not the shop's: a shopper signed in at one shop is signed in at every shop on this
 * domain, each keeping its own record of them (the API's `customers`, one per shop).
 */
export const CUSTOMER_ACCESS_COOKIE = "bl_customer_access"
export const CUSTOMER_REFRESH_COOKIE = "bl_customer_refresh"

type CookieJar = NextResponse["cookies"]

const base = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
} as const

export function setCustomerSessionCookies(jar: CookieJar, session: AuthSession): void {
  jar.set(CUSTOMER_ACCESS_COOKIE, session.accessToken, { ...base, expires: new Date(session.accessTokenExpiresAt) })
  jar.set(CUSTOMER_REFRESH_COOKIE, session.refreshToken, { ...base, expires: new Date(session.refreshTokenExpiresAt) })
}

export function clearCustomerSessionCookies(jar: CookieJar): void {
  jar.delete(CUSTOMER_ACCESS_COOKIE)
  jar.delete(CUSTOMER_REFRESH_COOKIE)
}
