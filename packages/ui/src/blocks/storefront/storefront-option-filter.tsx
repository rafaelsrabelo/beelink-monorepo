// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { StorefrontFilterCheckbox } from "./storefront-filter-checkbox"
import { StorefrontFilterSection } from "./storefront-filter-section"

export interface StorefrontFilterValue {
  value: string
  label: string
  /** The shelf with this value toggled. */
  href: string
  count: number
  selected: boolean
  /** A colour value's swatch, from the shop's own data. */
  colorHex?: string | null
}

export interface StorefrontOptionFilterProps {
  /** The option's name as the shop wrote it: "Sabor", "Tamanho". */
  title: string
  values: readonly StorefrontFilterValue[]
  locale: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/** How many a list shows before "Ver mais". */
const VISIBLE = 5

/** Pills when every value is a colour or a short size — "P", "300 g" — and a list otherwise, as 5a does. */
export function drawsAsPills(values: readonly StorefrontFilterValue[]): boolean {
  return values.some((entry) => entry.colorHex) || (values.length <= 6 && values.every((entry) => entry.label.length <= 5))
}

/**
 * One option of the shelf as a filter group: "Sabor" as a list of boxes with counts, "Tamanho" as
 * pills. Values of one option widen the shelf; different options narrow it, as the API reads them.
 *
 * Past five values the rest folds under "Ver mais" — a native `<details>`, so it opens with
 * scripting off — and it starts open when something folded away is chosen.
 */
export function StorefrontOptionFilter({ title, values, locale, linkComponent: Link = AnchorLink, messages = defaultMessages }: StorefrontOptionFilterProps) {
  if (!values.length) return null

  if (drawsAsPills(values)) {
    return (
      <StorefrontFilterSection title={title}>
        <div className="flex flex-wrap gap-1.5">
          {values.map((entry) => (
            <Link
              key={entry.value}
              href={entry.href}
              // A combination of filters is not a page to crawl: the shelf without them is.
              rel="nofollow"
              role="checkbox"
              aria-checked={entry.selected}
              className={cn(
                "inline-flex h-9 min-w-[58px] items-center justify-center gap-1.5 rounded-[10px] bg-shop-background px-3 text-sm",
                entry.selected
                  ? "border-2 border-shop-primary bg-[color-mix(in_oklab,var(--shop-primary)_6%,var(--shop-background))] font-bold text-shop-primary-ink"
                  : "border border-shop-line-strong hover:border-shop-primary",
              )}
            >
              {entry.colorHex ? (
                <span aria-hidden="true" className="size-3 rounded-full border border-shop-line" style={{ backgroundColor: entry.colorHex }} />
              ) : null}
              {entry.label}
            </Link>
          ))}
        </div>
      </StorefrontFilterSection>
    )
  }

  const shown = values.slice(0, VISIBLE)
  const folded = values.slice(VISIBLE)
  const item = (entry: StorefrontFilterValue) => (
    <li key={entry.value}>
      <StorefrontFilterCheckbox label={entry.label} href={entry.href} count={entry.count} selected={entry.selected} locale={locale} linkComponent={Link} />
    </li>
  )

  return (
    <StorefrontFilterSection title={title}>
      <ul className="flex flex-col gap-2">{shown.map(item)}</ul>
      {folded.length ? (
        <details open={folded.some((entry) => entry.selected)} className="group">
          <summary className="cursor-pointer list-none text-[13px] font-semibold text-shop-primary-ink group-open:hidden [&::-webkit-details-marker]:hidden">
            {messages.storefront.filterShowMore} ▾
          </summary>
          <ul className="flex flex-col gap-2">{folded.map(item)}</ul>
        </details>
      ) : null}
    </StorefrontFilterSection>
  )
}
