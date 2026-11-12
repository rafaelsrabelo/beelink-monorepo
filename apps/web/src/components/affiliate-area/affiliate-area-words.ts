// UI
import { formatCents } from "@harness-monorepo/ui/blocks/storefront/storefront-price"

// App
import { payoutDayFormatter } from "@/lib/affiliate-form"
import type { AreaWords } from "@/lib/affiliate-area-view"
import { affiliateDateFormatter } from "@/lib/affiliate-people"

/** How the area's sections say money, days and instants, and where links point. */
export function areaWordsOf(locale: string, origin: string): AreaWords {
  return { money: (cents: number) => formatCents(cents, locale, "BRL"), day: payoutDayFormatter(locale), date: affiliateDateFormatter(locale), locale, origin }
}
