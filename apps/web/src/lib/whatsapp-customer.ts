// UI
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Types
import type { StoreCustomer } from "@harness-monorepo/contracts"

// App
import { whatsappOrderHref } from "./whatsapp-order"

export interface CustomerMessageInput {
  shopName: string
  customer: Pick<StoreCustomer, "name" | "stage">
  messages: UiMessages
}

/** A chat opens on the first name: "Olá, Bia Souza!" reads like a bill, not a conversation. */
function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name
}

/**
 * What the shop says to a customer from the list: a greeting from the shop, then the sentence for
 * where they stand — an invitation to a lead, a thank-you to a customer, a "faz tempo" to one who
 * stopped buying. Fixed per stage; the shopkeeper does not write it.
 */
export function customerMessageOf({ shopName, customer, messages }: CustomerMessageInput): string {
  const text = messages.customers.message

  return [format(text.greeting, { name: firstNameOf(customer.name), shop: shopName }), "", text[customer.stage]].join("\n")
}

/** The conversation already typed, on the customer's phone as stored; null with no phone to open it on. */
export function customerWhatsappHref({ customer, ...rest }: CustomerMessageInput & { customer: Pick<StoreCustomer, "name" | "stage" | "phone"> }): string | null {
  return customer.phone ? whatsappOrderHref(customer.phone, customerMessageOf({ customer, ...rest })) : null
}
