// Types
import type { ShippingQuote } from "@harness-monorepo/contracts"
import type { StorefrontCheckoutShipping } from "@harness-monorepo/ui/blocks/storefront/storefront-checkout"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { distanceText, minutesWindowText } from "@harness-monorepo/ui/lib/shipping"
import { format } from "@harness-monorepo/ui/locales/index"

/**
 * What the shop's delivery rules quote to the chosen address, as the checkout says it (BEELINK-178):
 * the fee and the window of its own delivery, a fee agreed afterwards, or that the shop does not go
 * there — with how far the address is and how far the shop goes. Null while there is no quote: both
 * ways are offered then, as before there were rules.
 */
export function checkoutShippingOf(quote: ShippingQuote | null, money: (cents: number) => string, locale: string, text: UiMessages["storefront"]): StorefrontCheckoutShipping | null {
  if (!quote) return null

  const pickup = quote.options.some((option) => option.kind === "PICKUP")
  const verdict = quote.ownDelivery
  if (verdict.status === "OFF") return { delivery: false, pickup, deliveryNote: "", unreachable: false }

  if (verdict.status === "OUT_OF_RANGE") {
    const where = format(text.checkoutOutOfRange, { distance: distanceText(verdict.distanceMeters, locale), radius: distanceText(verdict.radiusMeters, locale) })
    return { delivery: true, pickup, deliveryNote: `${where} ${pickup ? text.checkoutOutOfRangePickup : text.checkoutOutOfRangeAddress}`, unreachable: true }
  }

  const own = quote.options.find((option) => option.kind === "OWN_DELIVERY")
  if (!own || own.feeCents === null) return { delivery: true, pickup, deliveryNote: text.checkoutFeeLater, unreachable: false }

  const fee = own.feeCents === 0 ? (own.freeAbove ? text.checkoutDeliveryFreeAbove : text.checkoutDeliveryFree) : money(own.feeCents)
  const deliveryNote = own.window ? format(text.checkoutDeliveryArrives, { fee, window: minutesWindowText(own.window.from, own.window.to, text) }) : fee
  return { delivery: true, pickup, deliveryNote, unreachable: false }
}
