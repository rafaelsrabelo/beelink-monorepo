// Types
import type { AuthSession } from "@harness-monorepo/contracts"
import type { NextResponse } from "next/server"

// App
import { accessCookieExpiryOf } from "./session-cookies"
import { shopHomeOf, type ShopAddress } from "./shop-address"

/**
 * A shopper's session, apart from a shopkeeper's. Two names and not the panel's `bl_access`: one
 * person may be both, in one browser, and the two sessions must never stand in for each other — the
 * API refuses a token from the wrong door, and distinct cookies keep the web from ever sending one.
 *
 * `path: "/<slug>"`: a shopper's account belongs to one shop, and so does the session. The browser
 * sends it to that shop's pages and nowhere else, so the sessions of two shops live side by side
 * and a handler that reads one has to live under the shop's path (`/<slug>/api/customer`).
 *
 * At the shop's own domain (BEELINK-283) the path is `/`: the host is one shop's alone, and its
 * pages sit at `/conta`, where a cookie on `/<slug>` is never sent. The handlers stay under
 * `/<slug>/api`, which `/` reaches too.
 *
 * `bl_shopper_*` and not the `bl_customer_*` these were before they were a shop's: those had
 * `path: "/"`, and would go on reaching every shop until they expire.
 */
export const CUSTOMER_ACCESS_COOKIE = "bl_shopper_access"
export const CUSTOMER_REFRESH_COOKIE = "bl_shopper_refresh"

type CookieJar = NextResponse["cookies"]

/** An answer about to be sent: its jar, and its headers for what the jar cannot hold. */
type Answer = Pick<NextResponse, "cookies" | "headers">

const base = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
} as const

/**
 * Stores a shopper's session on the shop's path — the whole site, at its own domain. The last thing
 * written on an answer: see `dropPlatformTwins`.
 */
export function setCustomerSessionCookies(answer: Answer, shop: ShopAddress, session: AuthSession): void {
  const path = shopHomeOf(shop)
  answer.cookies.set(CUSTOMER_ACCESS_COOKIE, session.accessToken, { ...base, path, expires: accessCookieExpiryOf(session) })
  answer.cookies.set(CUSTOMER_REFRESH_COOKIE, session.refreshToken, { ...base, path, expires: new Date(session.refreshTokenExpiresAt) })
  dropPlatformTwins(answer, shop)
}

/**
 * At the shop's own domain, the same two cookies on `/<slug>` are expired with every write. A
 * browser holds them only if it was served that host under the slug, in the minute before the
 * proxy learned of the domain — and then both would travel to `/<slug>/api`, where a session signed
 * out at `/` would go on living in its twin.
 *
 * As raw headers, after the jar's writes: the jar keeps one cookie a name, so a second `set` on
 * another path replaces the first, and any write to it afterwards rebuilds the headers from what it
 * holds — which is why this is the last thing done to an answer.
 */
function dropPlatformTwins(answer: Answer, shop: ShopAddress): void {
  if (!shop.ownDomain) return

  for (const name of [CUSTOMER_ACCESS_COOKIE, CUSTOMER_REFRESH_COOKIE]) {
    answer.headers.append("set-cookie", `${name}=; Path=/${shop.slug}; Max-Age=0; HttpOnly; SameSite=Lax${base.secure ? "; Secure" : ""}`)
  }
}

/**
 * A Google sign-in in flight, held to the browser that started it: the state sent to Google, the shop
 * it began at, that shop's sign-in face to come back to on a refusal, and where the shopper was going. Only the fixed callback
 * reads it, for ten minutes — the state's own life at the API. Comparing it with the state that
 * comes back is what stops someone finishing, in another person's browser, a sign-in they started.
 */
export const GOOGLE_STATE_COOKIE = "bl_oauth_google"
export const GOOGLE_CALLBACK_PATH = "/api/customer/google/callback"

export interface GoogleFlight {
  state: string
  slug: string
  /** The shop's sign-in face the flow began on, for a refusal to land on. */
  signIn: string
  /** Where the shopper was going (`voltar`), kept through a refusal as through a sign-in. */
  back: string
}

export function setGoogleStateCookie(jar: CookieJar, flight: GoogleFlight): void {
  jar.set(GOOGLE_STATE_COOKIE, new URLSearchParams({ ...flight }).toString(), { ...base, path: GOOGLE_CALLBACK_PATH, maxAge: 600 })
}

export function googleFlightOf(value: string | undefined): GoogleFlight | null {
  if (!value) return null
  const read = new URLSearchParams(value)
  const [state, slug, signIn, back] = [read.get("state"), read.get("slug"), read.get("signIn"), read.get("back")]
  return state && slug && signIn && back ? { state, slug, signIn, back } : null
}

export function clearGoogleStateCookie(jar: CookieJar): void {
  jar.delete({ name: GOOGLE_STATE_COOKIE, path: GOOGLE_CALLBACK_PATH })
}

/**
 * A Google sign-in begun at the shop's own domain (BEELINK-284), held to the browser that began it
 * — at that domain, which the state cookie of the platform's host never reaches. The secret
 * (`verifier`) is what the handler here trades the returning code with; its hash went along the
 * flow as the challenge. Without it a code opens nothing, so one read off an address or sent to
 * another person's browser signs nobody in. `signIn` and `back` are this domain's own addresses, for
 * a refusal to land on. Read only by the two handlers under its path, for the state's ten minutes.
 *
 * The same name as the state cookie, on purpose: it is the same thing to a shopper — a Google
 * sign-in in flight, kept ten minutes so it ends in the browser it began in — and that is the line
 * the privacy policy's list of cookies already has for `bl_oauth_google`. The two never meet: this
 * one is the shop's host's, and on a path the platform's callback is not under.
 */
/** The address parameter the challenge rides to the platform's host in, beside `voltar` and `retorno`. */
export const GOOGLE_HANDOFF_KEY = "desafio"
/** 32 random bytes, or a SHA-256, in base64url: a handoff's code, secret and challenge alike. */
export const GOOGLE_HANDOFF_VALUE = /^[A-Za-z0-9_-]{43}$/

export interface GoogleHandoffFlight {
  verifier: string
  signIn: string
  back: string
}

const handoffPathOf = (slug: string) => `/${slug}/api/customer/google`

export function setGoogleHandoffCookie(jar: CookieJar, slug: string, flight: GoogleHandoffFlight): void {
  jar.set(GOOGLE_STATE_COOKIE, new URLSearchParams({ ...flight }).toString(), { ...base, path: handoffPathOf(slug), maxAge: 600 })
}

export function googleHandoffFlightOf(value: string | undefined): GoogleHandoffFlight | null {
  if (!value) return null
  const read = new URLSearchParams(value)
  const [verifier, signIn, back] = [read.get("verifier"), read.get("signIn"), read.get("back")]
  return verifier && GOOGLE_HANDOFF_VALUE.test(verifier) && signIn && back ? { verifier, signIn, back } : null
}

export function clearGoogleHandoffCookie(jar: CookieJar, slug: string): void {
  jar.delete({ name: GOOGLE_STATE_COOKIE, path: handoffPathOf(slug) })
}

/** Ends a shopper's session in this browser: on the shop's path, and on its twin at the shop's own domain. */
export function clearCustomerSessionCookies(answer: Answer, shop: ShopAddress): void {
  const path = shopHomeOf(shop)
  answer.cookies.delete({ name: CUSTOMER_ACCESS_COOKIE, path })
  answer.cookies.delete({ name: CUSTOMER_REFRESH_COOKIE, path })
  dropPlatformTwins(answer, shop)
}
