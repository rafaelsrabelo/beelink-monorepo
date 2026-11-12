// UI
import { Badge } from "@harness-monorepo/ui/components/badge"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { AffiliateStatusValue } from "@harness-monorepo/ui/lib/affiliates"

/** Filled for who sells now, muted for who has not started, outlined for who stopped. */
const VARIANT: Record<AffiliateStatusValue, "success" | "secondary" | "outline"> = {
  ACTIVE: "success",
  INVITED: "secondary",
  PAUSED: "outline",
  ENDED: "outline",
}

export interface AffiliateStatusBadgeProps {
  status: AffiliateStatusValue
  messages?: UiMessages
}

/** Where an affiliate stands with the shop (IMPULSEIA-104), in one word. */
export function AffiliateStatusBadge({ status, messages = defaultMessages }: AffiliateStatusBadgeProps) {
  return <Badge variant={VARIANT[status]}>{messages.affiliates.list.status[status]}</Badge>
}
