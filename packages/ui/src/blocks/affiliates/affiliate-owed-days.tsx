// UI
import { Badge } from "@harness-monorepo/ui/components/badge"

// Block
import type { AffiliateOwedDayView } from "@harness-monorepo/ui/lib/affiliate-money"

/** Overdue is the one that asks for the shop's attention; today is due; the rest is waiting. */
const VARIANT: Record<AffiliateOwedDayView["state"], "destructive" | "default" | "outline"> = {
  OVERDUE: "destructive",
  TODAY: "default",
  UPCOMING: "outline",
}

export interface AffiliateOwedDaysProps {
  title: string
  days: readonly AffiliateOwedDayView[]
  empty: string
}

/** What falls due on each day, across the shop's affiliates (IMPULSEIA-107): "dia 20: R$ X para N afiliados". */
export function AffiliateOwedDays({ title, days, empty }: AffiliateOwedDaysProps) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-medium">{title}</h3>
      {days.length === 0 ? (
        <p className="text-muted-foreground text-sm">{empty}</p>
      ) : (
        <ul className="divide-border flex flex-col divide-y">
          {days.map((day) => (
            <li key={day.key} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{day.label}</span>
                <Badge variant={VARIANT[day.state]}>{day.stateLabel}</Badge>
              </div>
              <div className="flex items-baseline gap-3 text-sm">
                <span className="text-muted-foreground">{day.people}</span>
                <span className="font-medium tabular-nums">{day.amount}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
