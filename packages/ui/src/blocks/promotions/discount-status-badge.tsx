// UI
import { Badge } from "@harness-monorepo/ui/components/badge"

// Utils
import { cn } from "@harness-monorepo/ui/lib/utils"

// Block
import type { DiscountStatusValue } from "@harness-monorepo/ui/lib/discount-form"

export interface DiscountStatusBadgeProps {
  status: DiscountStatusValue
  /** In the screen's own words: a promotion is "Ativa", a coupon "Ativo". */
  label: string
}

/** Running reads as the one that counts; the others are told apart by their words, never by colour alone. */
const TONE: Record<DiscountStatusValue, string> = {
  ACTIVE: "border-transparent bg-primary text-primary-foreground",
  SCHEDULED: "",
  PAUSED: "text-muted-foreground",
  ENDED: "text-muted-foreground",
  EXHAUSTED: "text-muted-foreground",
}

/** Where a promotion or a coupon stands, as a row's badge. */
export function DiscountStatusBadge({ status, label }: DiscountStatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn(TONE[status])}>
      {label}
    </Badge>
  )
}
