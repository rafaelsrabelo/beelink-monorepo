// Types
import type { OrderShippingChoice, ShippingOption, ShippingQuote } from "@harness-monorepo/contracts"
import type { StorefrontCheckoutShipping, StorefrontCheckoutWay } from "@harness-monorepo/ui/blocks/storefront/storefront-checkout"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { businessDaysWindowText, distanceText, minutesWindowText } from "@harness-monorepo/ui/lib/shipping"
import { format } from "@harness-monorepo/ui/locales/index"

type Text = UiMessages["storefront"]

/** The shop's own delivery among the ways, by this id; a carrier's service by `CARRIER:<its id>`. */
const OWN = "OWN"
const CARRIER = /^CARRIER:(\d+)$/

/** The way picked as the order and its price are asked with it: a carrier's service, or nothing — the shop's own is what an order goes by unasked. */
export function shippingChoiceOf(wayId: string | null): OrderShippingChoice | null {
  const service = wayId ? CARRIER.exec(wayId)?.[1] : undefined
  return service ? { kind: "CARRIER", serviceId: Number(service) } : null
}

function ownWayOf(own: ShippingOption, money: (cents: number) => string, text: Text): StorefrontCheckoutWay {
  if (own.feeCents === null) return { id: OWN, title: text.checkoutWayOwn, detail: text.checkoutFeeLater }
  const fee = own.feeCents === 0 ? (own.freeAbove ? text.checkoutDeliveryFreeAbove : text.checkoutDeliveryFree) : money(own.feeCents)
  return { id: OWN, title: text.checkoutWayOwn, detail: own.window ? format(text.checkoutDeliveryArrives, { fee, window: minutesWindowText(own.window.from, own.window.to, text) }) : fee }
}

function carrierWayOf(option: ShippingOption, money: (cents: number) => string, text: Text): StorefrontCheckoutWay[] {
  if (!option.carrier || option.feeCents === null) return []
  const fee = money(option.feeCents)
  return [
    {
      id: `CARRIER:${option.carrier.serviceId}`,
      title: `${option.carrier.company} · ${option.carrier.service}`,
      detail: option.window ? format(text.checkoutCarrierArrives, { fee, window: businessDaysWindowText(option.window.from, option.window.to, text) }) : fee,
    },
  ]
}

/**
 * What the shop's delivery rules quote to the chosen address, as the checkout says it: the ways to
 * get there — its own delivery (BEELINK-178) and each carrier of its Melhor Envio (BEELINK-186) —
 * with what each costs and when it arrives, or that there is none, with how far the address is and
 * how far the shop goes. Null while there is no quote: both delivery and pick-up are offered then,
 * as before there were rules.
 */
export function checkoutShippingOf(quote: ShippingQuote | null, money: (cents: number) => string, locale: string, text: Text): StorefrontCheckoutShipping | null {
  if (!quote) return null

  const pickup = quote.options.some((option) => option.kind === "PICKUP")
  const own = quote.options.find((option) => option.kind === "OWN_DELIVERY")
  const ways = [...(own ? [ownWayOf(own, money, text)] : []), ...quote.options.filter((option) => option.kind === "CARRIER").flatMap((option) => carrierWayOf(option, money, text))]
  // A shop that neither brings orders itself nor sells by carrier has no delivery to choose.
  const delivery = quote.ownDelivery.status !== "OFF" || quote.carriers.status !== "OFF"

  const [only, ...others] = ways
  if (only) return { delivery, pickup, ways, note: others.length ? null : only.id === OWN ? only.detail : `${only.title} — ${only.detail}` }
  if (!delivery) return { delivery, pickup, ways, note: null }

  const verdict = quote.ownDelivery
  const where = verdict.status === "OUT_OF_RANGE" ? format(text.checkoutOutOfRange, { distance: distanceText(verdict.distanceMeters, locale), radius: distanceText(verdict.radiusMeters, locale) }) : text.checkoutNoDeliveryHere
  return { delivery, pickup, ways, note: `${where} ${pickup ? text.checkoutOutOfRangePickup : text.checkoutOutOfRangeAddress}` }
}
