// Types
import type { PaymentMethod, PublicStore } from "@harness-monorepo/contracts"
import type { StorefrontHighlight } from "@harness-monorepo/ui/blocks/storefront/storefront-window"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

/**
 * What the shop promises, above its products — the band every shop this was measured against has.
 *
 * It is built from `paymentMethods` and from nothing else, which is the point: the reference
 * designs fill that band with free delivery, instalments and a security seal, and bee-link knows
 * none of those. A band of claims a shop never made is worse than no band, so this says the one
 * true thing the shop has already told us, and says it in the customer's words rather than in the
 * shopkeeper's — `admin.store.payment` describes a checkbox to the person ticking it.
 *
 * The API refuses an empty list, so a shop always has at least one, and the window drops the band
 * on an empty array rather than drawing an empty strip.
 */
export function paymentHighlightsOf(store: PublicStore, messages: UiMessages): StorefrontHighlight[] {
  const text = messages.storefront.payments

  const byMethod: Record<PaymentMethod, StorefrontHighlight> = {
    MONEY: { id: "MONEY", title: text.money, detail: text.moneyDetail },
    PIX: { id: "PIX", title: text.pix, detail: text.pixDetail },
    CREDIT_CARD: { id: "CREDIT_CARD", title: text.creditCard, detail: text.creditCardDetail },
    DEBIT_CARD: { id: "DEBIT_CARD", title: text.debitCard, detail: text.debitCardDetail },
  }

  // In the shopkeeper's order, not the enum's: the first one they ticked is the one they push.
  return store.paymentMethods.map((method) => byMethod[method])
}
