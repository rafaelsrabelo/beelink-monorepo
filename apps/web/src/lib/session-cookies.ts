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

/**
 * The shop the panel was last inside, so signing in again lands where it left off.
 *
 * A HINT and never a permission. It is not httpOnly and it is not checked against anything: what it
 * buys is one redirect, and the page it points at asks the API whether this person owns that shop
 * exactly as it would have anyway. A forged value costs its owner a 404.
 *
 * The scope itself lives in the URL, which is what makes a panel page bookmarkable and lets two
 * tabs hold two different shops. This cookie only decides where an address-less arrival goes.
 */
export const SHOP_COOKIE = "bl_shop"

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
  // The shop goes with the session. Signing out and back in as somebody else would otherwise send
  // them at a shop the first person was in, and they would meet a 404 with no idea why.
  jar.delete(SHOP_COOKIE)
}

/**
 * Remembers the shop being worked in. Not httpOnly, and a year is fine: it is a hint about where to
 * land, so its worst failure is sending somebody to a shop they no longer own.
 */
export function rememberShop(jar: CookieJar, slug: string): void {
  jar.set(SHOP_COOKIE, slug, {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  })
}
