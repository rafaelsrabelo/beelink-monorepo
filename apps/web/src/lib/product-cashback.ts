// Types
import type { PublicCashback } from "@harness-monorepo/contracts"
import type { ShopCashbackRule } from "@harness-monorepo/ui/lib/cashback"

/**
 * The rate one product earns at (BEELINK-313): the shop's, or — in a shop that gives by product — the
 * product's own. Null with the shop's cashback off, and for a product with no rate in such a shop: its
 * page says nothing, never that nothing comes back.
 */
export function productCashbackRuleOf(shop: PublicCashback | null, product: { cashbackRateBps: number | null }): ShopCashbackRule | null {
  if (!shop) return null
  if (shop.mode === "STORE") return { rateBps: shop.rateBps, minSubtotalCents: shop.minSubtotalCents }
  return product.cashbackRateBps === null ? null : { rateBps: product.cashbackRateBps, minSubtotalCents: shop.minSubtotalCents }
}
