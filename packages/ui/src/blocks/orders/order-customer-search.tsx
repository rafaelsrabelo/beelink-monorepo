// Libs
import { UserPlusIcon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Input } from "@harness-monorepo/ui/components/input"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { OrderCustomerOption } from "@harness-monorepo/ui/lib/order-form"

export interface OrderCustomerSearchProps {
  query: string
  onQueryChange: (query: string) => void
  /** What the screen's search answered for the query; the block does not search. */
  results: readonly OrderCustomerOption[]
  searching?: boolean
  onSelect: (customer: OrderCustomerOption) => void
  onCreate: () => void
  messages?: UiMessages
}

/** Finding the customer among the shop's, by name, phone or e-mail — or registering one. */
export function OrderCustomerSearch({
  query,
  onQueryChange,
  results,
  searching = false,
  onSelect,
  onCreate,
  messages = defaultMessages,
}: OrderCustomerSearchProps) {
  const text = messages.orders.form
  const typed = query.trim() !== ""

  return (
    <div className="flex flex-col gap-3">
      <Input
        type="search"
        aria-label={text.customerSearchLabel}
        placeholder={text.customerSearchPlaceholder}
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
      />

      {typed && searching && results.length === 0 ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : null}

      {typed && !searching && results.length === 0 ? <p className="text-muted-foreground text-sm">{text.customerNone}</p> : null}

      {typed && results.length > 0 ? (
        <ul className="divide-border flex flex-col divide-y rounded-lg border" aria-label={text.customerSearchLabel}>
          {results.map((customer) => (
            <li key={customer.id}>
              <button
                type="button"
                onClick={() => onSelect(customer)}
                className="hover:bg-muted focus-visible:ring-ring flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset"
              >
                <span className="text-sm font-medium">{customer.name}</span>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {[customer.phone, customer.email].filter(Boolean).join(" · ")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <Button type="button" variant="outline" className="self-start" onClick={onCreate}>
        <UserPlusIcon />
        {text.customerCreate}
      </Button>
    </div>
  )
}
