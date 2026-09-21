// Types
import type { AuthSession } from "@harness-monorepo/contracts"
import type { NextResponse } from "next/server"

/**
 * `bl_` names the product, and the rename off the harness template's `hm_` is not cosmetic: a
 * cookie set on a shared parent domain reaches every app under it, and two sessions answering to
 * one name would hand each other's tokens around. The cart and the language cookie carry the same
 * prefix for the same reason.
 */
export const ACCESS_COOKIE = "bl_access"
export const REFRESH_COOKIE = "bl_refresh"

type CookieJar = NextResponse["cookies"]

/**
 * httpOnly is the whole point: page JavaScript can send these on a same-origin request but can
 * never read them. `path: "/"` on both because the proxy refreshes on page navigations too.
 */
const base = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
} as const

export function setSessionCookies(jar: CookieJar, session: AuthSession): void {
  jar.set(ACCESS_COOKIE, session.accessToken, {
    ...base,
    expires: new Date(session.accessTokenExpiresAt),
  })
  jar.set(REFRESH_COOKIE, session.refreshToken, {
    ...base,
    expires: new Date(session.refreshTokenExpiresAt),
  })
}

export function clearSessionCookies(jar: CookieJar): void {
  jar.delete(ACCESS_COOKIE)
  jar.delete(REFRESH_COOKIE)
}
