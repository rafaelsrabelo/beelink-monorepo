import "server-only"

// App
import { callApi } from "./api"

/**
 * Spends a shopper's confirmation token, as the click on their e-mailed link asks (BEELINK-149), and
 * says whether it confirmed an e-mail. A used, expired or unknown token, and an API that could not
 * answer, all read as not confirmed: the page offers another link either way.
 */
export async function emailConfirmedBy(token: string): Promise<boolean> {
  const response = await callApi({ path: "/auth/verify-email", body: { token } }).catch(() => null)
  return response?.ok === true
}
