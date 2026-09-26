// Libs
import { UsersIcon } from "lucide-react"

// UI
import { Badge } from "@harness-monorepo/ui/components/badge"

// Locales
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface CustomerDuplicateBadgeProps {
  messages: UiMessages
}

/**
 * "Possível duplicado", under the stage: another record of the shop may be the same person. Only a
 * flag — the record says which and offers the merge, since the shopkeeper is the one who knows.
 */
export function CustomerDuplicateBadge({ messages }: CustomerDuplicateBadgeProps) {
  return (
    <Badge variant="outline">
      <UsersIcon aria-hidden="true" data-icon="inline-start" />
      {messages.customers.possibleDuplicate}
    </Badge>
  )
}
