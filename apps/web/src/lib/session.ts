// React
import { cache } from "react"

// Next
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

// Types
import type { User } from "@harness-monorepo/contracts"

// App
import { callApi } from "./api"
import { ACCESS_COOKIE } from "./session-cookies"

/**
 * The server's view of who is signed in. Memoised per request, so a layout and its page asking the
 * same question cost one call.
 *
 * It never refreshes: a Server Component cannot set a cookie, so spending the refresh token here
 * would hand out a successor nobody could store. Refreshing belongs to src/proxy.ts.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const accessToken = (await cookies()).get(ACCESS_COOKIE)?.value
  if (!accessToken) return null

  const response = await callApi({ path: "/users/me", method: "GET", accessToken })
  if (response.status === 401) return null
  if (!response.ok) throw new Error(`GET /users/me answered ${response.status}`)

  return (await response.json()) as User
})

/**
 * For a screen that has no signed-out version. It sends people through the route that clears the
 * cookies rather than straight to /login: the cookie is still in the browser, so the proxy would
 * read it as a live session and bounce them back here.
 */
export const requireUser = cache(async (): Promise<User> => {
  const user = await getCurrentUser()
  if (!user) redirect("/api/session/expired")
  return user
})
