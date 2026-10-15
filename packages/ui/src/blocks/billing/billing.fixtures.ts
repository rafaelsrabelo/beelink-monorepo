// UI
import { periodFiguresOf } from "@harness-monorepo/ui/lib/plan-figures"
import type { SubscriptionAccountView, SubscriptionCycleValue, SubscriptionOfferView, SubscriptionPaidView } from "@harness-monorepo/ui/lib/subscription"

/*
  Prices and days for the stories and the tests — not Beelink's, on purpose, as the landing's
  (`landing-plans.fixtures.ts`): a figure written by hand in a block or a dictionary would stand
  beside these and be found, and nothing here goes stale the day a real price changes. The screen
  reads Beelink's from the API's catalogue.
*/

const MONTHLY_CENTS = 10000

function offer(cycle: SubscriptionCycleValue, months: number, totalCents: number, renewsOn: string | null): SubscriptionOfferView {
  return { cycle, months, totalCents, ...periodFiguresOf(totalCents, months, MONTHLY_CENTS), renewsOn }
}

/** R$ 100,00 a month; R$ 540,00 for six (R$ 90,00 a month, 10% less); R$ 960,00 a year (R$ 80,00, 20% less). Chosen on 15/10/2026. */
export const exampleOffers: SubscriptionOfferView[] = [
  offer("MONTHLY", 1, MONTHLY_CENTS, "15/11/2026"),
  offer("SEMIANNUAL", 6, 54000, "15/04/2027"),
  offer("ANNUAL", 12, 96000, "15/10/2027"),
]

/** The same, with the six months' invoice already open: its renewal counts from that invoice's due day. */
export const offersWithOpenInvoice: SubscriptionOfferView[] = exampleOffers.map((each) => (each.cycle === "SEMIANNUAL" ? { ...each, renewsOn: null } : each))

/** Who is charged, as the API reads it back: the document masked. A CPF that checks out and is nobody's. */
export const exampleAccount: SubscriptionAccountView = { name: "Maria Souza Lima", document: "***.982.247-**", documentType: "CPF" }

/** Typed whole, for the tests: the account above, and a CNPJ that checks out. */
export const TYPED_CPF = "52998224725"
export const TYPED_CNPJ = "11222333000181"

export const INVOICE_URL = "https://sandbox.asaas.com/i/exemplo"

export const paidByCard: SubscriptionPaidView = {
  cycle: "ANNUAL",
  priceCents: 96000,
  paidUntil: "15/10/2027",
  method: "CREDIT_CARD",
  card: { brand: "VISA", last4: "4242" },
  renewalInvoiceUrl: null,
}

export const paidByPix: SubscriptionPaidView = {
  cycle: "MONTHLY",
  priceCents: MONTHLY_CENTS,
  paidUntil: "15/11/2026",
  method: "PIX",
  card: null,
  renewalInvoiceUrl: INVOICE_URL,
}
