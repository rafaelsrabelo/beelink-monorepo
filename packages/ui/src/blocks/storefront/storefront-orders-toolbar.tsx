// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface StorefrontOrdersToolbarProps {
  /** Where the form goes: the orders tab, its query in the address. */
  action: string
  /** The search key and the period key, as the screen spells them in the address. */
  names: { search: string; period: string }
  value: { search: string; period: string }
  /** The periods on offer: the last three months, then each year with an order. */
  periods: readonly { value: string; label: string }[]
  /** Carried along, so filtering keeps the tab chosen. */
  hidden?: Readonly<Record<string, string>>
  messages?: UiMessages
}

const FIELD = "h-11 rounded-[10px] border border-shop-line-strong bg-shop-background px-3 text-sm text-shop-on-background"

/** The search and the period over the list, as 6d places them beside the title. A GET form: no script, and the address says what it shows. */
export function StorefrontOrdersToolbar({ action, names, value, periods, hidden = {}, messages = defaultMessages }: StorefrontOrdersToolbarProps) {
  const text = messages.storefront

  return (
    <form action={action} method="get" role="search" className="flex flex-wrap items-center gap-2">
      {Object.entries(hidden).map(([name, hiddenValue]) => (
        <input key={name} type="hidden" name={name} value={hiddenValue} />
      ))}
      <label className="flex min-w-0 flex-1 basis-56 flex-col gap-1 text-xs font-medium">
        <span className="sr-only">{text.ordersSearchLabel}</span>
        <input type="search" name={names.search} defaultValue={value.search} placeholder={text.ordersSearchPlaceholder} className={FIELD} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium">
        <span className="sr-only">{text.ordersPeriod}</span>
        <select name={names.period} defaultValue={value.period} className={FIELD}>
          {periods.map((period) => (
            <option key={period.value || "all"} value={period.value}>
              {period.label}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="h-11 rounded-[10px] bg-shop-primary px-4 text-sm font-semibold text-shop-on-primary">
        {text.ordersFilter}
      </button>
    </form>
  )
}
