// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { PaymentMethod } from "../store/store-types"

export interface StorefrontSellerTableProps {
  sellerName: string
  /** In the shopkeeper's order. */
  paymentMethods: readonly PaymentMethod[]
  messages?: UiMessages
}

const TH = "py-[3px] pr-3 text-left align-top font-medium text-shop-muted"

/**
 * The payment methods as 5b writes them: "Pix · Cartão · Dinheiro". Credit and debit are one
 * "Cartão", where the first of them sits — a shopper choosing a shop asks whether a card is taken,
 * and the kind is settled at the counter.
 */
export function paymentsLineOf(methods: readonly PaymentMethod[], labels: UiMessages["storefront"]["payments"]): string {
  const words = methods.map((method) => (method === "PIX" ? labels.pix : method === "MONEY" ? labels.money : labels.card))
  return [...new Set(words)].join(" · ")
}

/** Who sells this and how it is paid, under the buy box's hairline. A row with nothing to say is left out. */
export function StorefrontSellerTable({ sellerName, paymentMethods, messages = defaultMessages }: StorefrontSellerTableProps) {
  const text = messages.storefront
  const payments = paymentsLineOf(paymentMethods, text.payments)

  return (
    <table className="border-collapse text-[13px]">
      <tbody>
        <tr>
          <th scope="row" className={TH}>
            {text.soldBy}
          </th>
          <td className="py-[3px] font-semibold">{sellerName}</td>
        </tr>
        {payments ? (
          <tr>
            <th scope="row" className={TH}>
              {text.payment}
            </th>
            <td className="py-[3px]">{payments}</td>
          </tr>
        ) : null}
      </tbody>
    </table>
  )
}
