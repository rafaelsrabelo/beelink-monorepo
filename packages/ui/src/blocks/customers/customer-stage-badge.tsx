// UI
import { Badge } from "@harness-monorepo/ui/components/badge"

// Locales
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { CustomerListItem, CustomerStageValue } from "./customer-types"

/** Filled for who buys now, muted for who never did, outlined for who stopped. */
const STAGE_VARIANT: Record<CustomerStageValue, "default" | "secondary" | "outline"> = {
  CUSTOMER: "default",
  LEAD: "secondary",
  INACTIVE: "outline",
}

export interface CustomerStageBadgeProps {
  customer: Pick<CustomerListItem, "stage" | "daysSinceLastOrder">
  messages: UiMessages
}

/**
 * Where the customer stands, and — for one who stopped — for how long: "Inativo · há 74 dias". The
 * days are the API's, counted with the same cut as the stage, so the two never disagree.
 */
export function CustomerStageBadge({ customer, messages }: CustomerStageBadgeProps) {
  const text = messages.customers

  return (
    <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
      <Badge variant={STAGE_VARIANT[customer.stage]}>{text.stages[customer.stage]}</Badge>
      {customer.stage === "INACTIVE" && customer.daysSinceLastOrder !== null ? (
        <span className="text-muted-foreground text-xs whitespace-nowrap tabular-nums">{format(text.inactiveFor, { days: String(customer.daysSinceLastOrder) })}</span>
      ) : null}
    </span>
  )
}
