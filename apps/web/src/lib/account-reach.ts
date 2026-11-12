import "server-only"

// Next
import { cookies } from "next/headers"

// App
import { callApi } from "./api"
import { ACCESS_COOKIE } from "./session-cookies"

/** How many of an endpoint's answer the signed-in account has; none when the read fails, which is the safe side for a way in. */
async function countOf(path: string): Promise<number> {
  const accessToken = (await cookies()).get(ACCESS_COOKIE)?.value ?? ""
  const response = await callApi({ path, method: "GET", accessToken })
  if (!response.ok) return 0
  return ((await response.json()) as unknown[]).length
}

/** The shops the account owns: the panel's doorway, and the area's way back to it. */
export function ownedShopCountOf(): Promise<number> {
  return countOf("/stores/mine")
}

/** The shops the account sells for (IMPULSEIA-108): where an account with no shop of its own lands. */
export function affiliateShopCountOf(): Promise<number> {
  return countOf("/affiliate/stores")
}
