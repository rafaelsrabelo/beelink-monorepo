// Locales
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { CustomerListItem } from "./customer-types"

export interface CustomerContactProps {
  customer: Pick<CustomerListItem, "email" | "emailVerified" | "phone">
  messages: UiMessages
}

/**
 * The line under the name: the e-mail, marked when never confirmed — or the phone, for a customer
 * registered from an order, who has no e-mail at all. Nothing when there is neither.
 */
export function CustomerContact({ customer, messages }: CustomerContactProps) {
  if (customer.email) {
    return (
      <span className="text-muted-foreground truncate text-xs" title={customer.email}>
        {customer.email}
        {customer.emailVerified ? null : <> · {messages.customers.unverified}</>}
      </span>
    )
  }

  return customer.phone ? <span className="text-muted-foreground text-xs tabular-nums">{customer.phone}</span> : null
}
