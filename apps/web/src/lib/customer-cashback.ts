import "server-only"

// Types
import type { ShopperCashback } from "@harness-monorepo/contracts"

// App
import { readAsShopper } from "./shopper-read"

/**
 * The signed-in shopper's cashback at this shop (BEELINK-244): the balance, what is pending, the
 * lots it is made of and one page of the statement — or null when it could not be read, which the
 * tab says as such, never as "no cashback". Read per request with their access cookie and never kept
 * past it: it is theirs alone, and an order placed a moment ago changes it. The page's size is the
 * API's own.
 */
export function customerCashbackAt(slug: string, page: number): Promise<ShopperCashback | null> {
  return readAsShopper<ShopperCashback>(`/stores/${encodeURIComponent(slug)}/customer/cashback?page=${page}`)
}
