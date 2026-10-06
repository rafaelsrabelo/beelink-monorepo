// Types
import type { OnlinePaymentMethod, OrderPaymentChannel, PaymentMethod, PlaceCustomerOrderPayload, StorefrontPaymentOptions } from "@harness-monorepo/contracts"
import type { StorefrontCheckoutOnline } from "@harness-monorepo/ui/blocks/storefront/storefront-checkout"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { format } from "@harness-monorepo/ui/locales/index"

/** What the cart's total says to the payment: how much, and whether it can still grow. */
export interface CheckoutTotal {
  /** The total as the API priced it; null while there is no price. */
  cents: number | null
  /** False while a delivery's fee is to be agreed: the total is not what will be charged. */
  closed: boolean
}

/** How the cart's order can be paid right now, as the checkout draws it. */
export interface CheckoutPaymentPlan {
  /** The shop's own labels, settled on delivery or at pickup; none when the shop turned that off. */
  offlineMethods: readonly PaymentMethod[]
  /** What is charged online, already in words; null when the shop charges nothing online. The CPF is the screen's to add. */
  online: Omit<StorefrontCheckoutOnline, "document"> | null
  /** The order has nothing to pay: it is settled with the shop, and nothing is asked. */
  nothingToPay: string | null
}

/** The payment as the shopper picked it, before it is held to what the shop takes now. */
export interface PickedPayment {
  paymentChannel?: OrderPaymentChannel
  paymentMethod: PaymentMethod | null
  installments?: number
}

export interface CheckoutPaymentContext {
  money: (cents: number) => string
  text: UiMessages["storefront"]
}

/**
 * What the checkout offers for this cart (BEELINK-205), from what the shop takes and the cart's
 * total. Asaas's least amounts come with the shop's options and are never spelled here.
 *
 * - A closed total of zero has nothing to pay: no way is asked, and the order is settled with the shop.
 * - A closed total under the least charge switches the online ways off, saying why.
 * - A card splits into as many instalments as the shop offers and the total holds, each at its amount.
 * - A total still open — a fee to be agreed — can be paid online, afterwards: the instalments promise
 *   no amount, and the least charge is checked when the charge is made, as the API does.
 */
export function checkoutPaymentOf(options: StorefrontPaymentOptions, shopMethods: readonly PaymentMethod[], total: CheckoutTotal, { money, text }: CheckoutPaymentContext): CheckoutPaymentPlan {
  const offlineMethods = options.offline ? shopMethods : []
  const takes = options.online
  if (!takes) return { offlineMethods, online: null, nothingToPay: null }
  if (total.closed && total.cents === 0) return { offlineMethods, online: null, nothingToPay: text.checkoutNothingToPay }

  const priced = total.closed && total.cents !== null ? total.cents : null
  const methods: OnlinePaymentMethod[] = [...(takes.pix ? (["PIX"] as const) : []), ...(takes.card ? (["CREDIT_CARD"] as const) : [])]
  const short = priced !== null && priced < takes.minimumChargeCents
  const room = priced === null ? takes.maxInstallments : Math.floor(priced / takes.minimumInstallmentCents)
  const most = short ? 0 : Math.max(1, Math.min(takes.maxInstallments, room))
  const installments = Array.from({ length: most }, (_, index) => {
    const count = index + 1
    if (priced === null) return { count, label: count === 1 ? text.checkoutInstallmentOpenFull : format(text.checkoutInstallmentOpen, { count: String(count) }) }
    // Asaas puts what the division leaves on the last instalment: the amount shown is never more than is charged.
    return { count, label: count === 1 ? format(text.checkoutInstallmentFull, { amount: money(priced) }) : format(text.checkoutInstallmentOption, { count: String(count), amount: money(Math.floor(priced / count)) }) }
  })

  return {
    offlineMethods,
    online: {
      methods,
      unavailable: short ? format(options.offline ? text.checkoutOnlineBelowMinimum : text.checkoutOnlineOnlyBelowMinimum, { minimum: money(takes.minimumChargeCents) }) : null,
      installments,
      note: total.closed ? null : text.checkoutOnlineFeeLater,
    },
    nothingToPay: null,
  }
}

/**
 * The payment held to what the checkout offers now: a way the shop stopped taking, an online way
 * the total no longer reaches, or more instalments than it holds is never what gets sent. The only
 * way there is stands chosen already; with several, none is the shopper's to assume.
 */
export function heldPaymentOf(picked: PickedPayment, plan: CheckoutPaymentPlan): Required<PickedPayment> {
  const none = { paymentChannel: "OFFLINE", paymentMethod: null, installments: 1 } as const
  // Nothing to pay is settled with the shop, by any of its labels: there is nothing to choose.
  if (plan.nothingToPay) return none

  const online = plan.online && !plan.online.unavailable ? plan.online : null
  const most = online?.installments.length ?? 1
  if (picked.paymentChannel === "ONLINE") {
    const method = online?.methods.find((each) => each === picked.paymentMethod)
    if (method) return { paymentChannel: "ONLINE", paymentMethod: method, installments: method === "CREDIT_CARD" ? Math.max(1, Math.min(picked.installments ?? 1, most)) : 1 }
  } else if (picked.paymentMethod && plan.offlineMethods.includes(picked.paymentMethod)) {
    return { paymentChannel: "OFFLINE", paymentMethod: picked.paymentMethod, installments: 1 }
  }

  const onlineMethods = online?.methods ?? []
  if (onlineMethods.length + plan.offlineMethods.length !== 1) return none
  return onlineMethods[0] ? { paymentChannel: "ONLINE", paymentMethod: onlineMethods[0], installments: 1 } : { paymentChannel: "OFFLINE", paymentMethod: plan.offlineMethods[0]!, installments: 1 }
}

/**
 * How the payment goes with the order. Settled with the shop, it goes as it always did — the label
 * alone; the channel absent is offline. With nothing to pay it goes by the shop's first label: the
 * API takes it even where paying on delivery is off, and there is no amount for the label to settle.
 */
export function paymentPayloadOf(held: Required<PickedPayment>, plan: CheckoutPaymentPlan, shopMethods: readonly PaymentMethod[]): Pick<PlaceCustomerOrderPayload, "paymentMethod" | "paymentChannel" | "installments"> | null {
  if (plan.nothingToPay) return shopMethods[0] ? { paymentMethod: shopMethods[0] } : null
  if (!held.paymentMethod) return null
  if (held.paymentChannel === "OFFLINE") return { paymentMethod: held.paymentMethod }
  return { paymentMethod: held.paymentMethod, paymentChannel: "ONLINE", ...(held.installments > 1 ? { installments: held.installments } : {}) }
}

/**
 * Whether the product page says the order is finished on the shop's WhatsApp. True only of a shop
 * that has one and charges nothing online: where Pix or card is taken, the order is paid on the
 * site and opens no WhatsApp, and the sentence sent shoppers looking for a conversation that never
 * comes — whether or not paying on delivery is still offered beside it.
 */
export function finishesOnWhatsAppOf(whatsapp: string | null | undefined, options: StorefrontPaymentOptions): boolean {
  return Boolean(whatsapp) && options.online === null
}
