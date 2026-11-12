// UI
import { Button } from "@harness-monorepo/ui/components/button"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { AffiliatePagerView } from "@harness-monorepo/ui/lib/affiliate-area"

export interface AffiliateAreaPagerProps {
  pager: AffiliatePagerView
  /** Names the list it pages. */
  label: string
  onPage: (page: number) => void
  messages?: UiMessages
}

/** Newer and older pages of one of the area's lists; nothing when one page holds it all. */
export function AffiliateAreaPager({ pager, label, onPage, messages = defaultMessages }: AffiliateAreaPagerProps) {
  const text = messages.affiliateArea.pager
  const { page, pageSize, total } = pager
  if (total <= pageSize) return null
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <nav aria-label={label} className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{format(text.range, { from: String(from), to: String(to), total: String(total) })}</span>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          {text.previous}
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={to >= total} onClick={() => onPage(page + 1)}>
          {text.next}
        </Button>
      </div>
    </nav>
  )
}
