// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { StorefrontFilterCheckbox } from "./storefront-filter-checkbox"
import { StorefrontFilterSection } from "./storefront-filter-section"

export interface StorefrontDiscountRangeEntry {
  percent: number
  href: string
  count: number
  selected: boolean
}

export interface StorefrontDiscountFilterProps {
  /** Anything on sale at all — `desconto=1`. Null when nothing on the shelf is. */
  onSale?: { href: string; count: number; selected: boolean } | null
  /** "10% ou mais", "20% ou mais"… — one cut at a time, so these are links and not boxes. */
  ranges: readonly StorefrontDiscountRangeEntry[]
  locale: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/** 5a's "Desconto" group: on sale as a box, then the minimum cuts, each with how many it leaves. */
export function StorefrontDiscountFilter({ onSale, ranges, locale, linkComponent: Link = AnchorLink, messages = defaultMessages }: StorefrontDiscountFilterProps) {
  const text = messages.storefront
  const number = new Intl.NumberFormat(locale)

  if (!onSale && !ranges.length) return null

  return (
    <StorefrontFilterSection title={text.filterDiscount}>
      {onSale ? (
        <StorefrontFilterCheckbox label={text.filterOnSale} href={onSale.href} count={onSale.count} selected={onSale.selected} locale={locale} linkComponent={Link} />
      ) : null}
      {ranges.length ? (
        <ul className="flex flex-col gap-1.5 text-sm">
          {ranges.map((range) => (
            <li key={range.percent}>
              <Link href={range.href} aria-current={range.selected ? "true" : undefined} className={cn("hover:underline", range.selected && "font-bold")}>
                {format(text.filterDiscountAtLeast, { percent: String(range.percent) })}{" "}
                <span className="text-shop-muted">({number.format(range.count)})</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </StorefrontFilterSection>
  )
}
