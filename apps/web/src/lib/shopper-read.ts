import "server-only"

// Next
import { cookies } from "next/headers"

// App
import { callApi } from "./api"
import { CUSTOMER_ACCESS_COOKIE } from "./customer-session-cookies"

/**
 * A GET as the signed-in shopper, with their access cookie, or null with no cookie or no good
 * answer — which a screen says as such, never as nothing. Read per request and never kept past it.
 */
export async function readAsShopper<T>(path: string): Promise<T | null> {
  const accessToken = (await cookies()).get(CUSTOMER_ACCESS_COOKIE)?.value
  if (!accessToken) return null

  const response = await callApi({ path, method: "GET", accessToken }).catch(() => null)
  return response?.ok ? ((await response.json()) as T) : null
}
