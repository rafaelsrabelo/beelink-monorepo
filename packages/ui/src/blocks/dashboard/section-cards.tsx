// Libs
import { TrendingDownIcon, TrendingUpIcon } from "lucide-react"

// UI
import { Badge } from "@harness-monorepo/ui/components/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@harness-monorepo/ui/components/card"

// Block
import type { DashboardCard } from "./dashboard-types"

export interface SectionCardsProps {
  cards: DashboardCard[]
}

/** A number is falling when its trend starts with a minus sign; nothing else here knows the domain. */
function isFalling(trend?: string): boolean {
  return trend?.trimStart().startsWith("-") ?? false
}

export function SectionCards({ cards }: SectionCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      {cards.map((card) => {
        const falling = isFalling(card.trend)
        const TrendIcon = falling ? TrendingDownIcon : TrendingUpIcon

        return (
          <Card key={card.label} className="@container/card">
            <CardHeader>
              <CardDescription>{card.label}</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {card.value}
              </CardTitle>
              {card.trend ? (
                <CardAction>
                  <Badge variant="outline">
                    <TrendIcon />
                    {card.trend}
                  </Badge>
                </CardAction>
              ) : null}
            </CardHeader>
            {card.footnote ? (
              <CardFooter className="flex-col items-start gap-1.5 text-sm">
                <div className="text-muted-foreground">{card.footnote}</div>
              </CardFooter>
            ) : null}
          </Card>
        )
      })}
    </div>
  )
}
