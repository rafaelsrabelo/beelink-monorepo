"use client"

// React
import { useState } from "react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { FieldError, FieldLegend, FieldSet } from "@harness-monorepo/ui/components/field"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { OrderCustomerCreate } from "./order-customer-create"
import type { OrderCustomerCreateProps } from "./order-customer-create"
import { OrderCustomerSearch } from "./order-customer-search"
import type { OrderCustomerSearchProps } from "./order-customer-search"
import type { OrderCustomerOption } from "@harness-monorepo/ui/lib/order-form"

export interface OrderCustomerSectionProps {
  selected: OrderCustomerOption | null
  onSelect: (customer: OrderCustomerOption) => void
  onClear: () => void
  search: Pick<OrderCustomerSearchProps, "query" | "onQueryChange" | "results" | "searching">
  create: Pick<OrderCustomerCreateProps, "onSubmit" | "pending" | "error" | "existing"> & { onCancel?: () => void }
  /** The customer the page was opened for is still on its way. */
  loading?: boolean
  error?: string
  messages?: UiMessages
}

/** A search that is only digits was a phone; anything else was the start of a name. */
function initialOf(query: string): { name?: string; phone?: string } {
  const typed = query.trim()
  if (typed === "") return {}
  return /^[\d\s()+-]+$/.test(typed) ? { phone: typed } : { name: typed }
}

/** Who the order is for: the chosen customer, a search among the shop's, or a new one. */
export function OrderCustomerSection({
  selected,
  onSelect,
  onClear,
  search,
  create,
  loading = false,
  error,
  messages = defaultMessages,
}: OrderCustomerSectionProps) {
  const text = messages.orders.form
  const [creating, setCreating] = useState(false)

  function choose(customer: OrderCustomerOption) {
    setCreating(false)
    onSelect(customer)
  }

  return (
    <FieldSet className="flex flex-col gap-3">
      <FieldLegend className="text-base font-semibold">{text.customer}</FieldLegend>

      {loading ? (
        <Skeleton className="h-16 w-full" />
      ) : selected ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
          <div className="flex min-w-0 flex-col">
            <span className="font-medium">{selected.name}</span>
            <span className="text-muted-foreground text-sm tabular-nums">
              {[selected.phone, selected.email].filter(Boolean).join(" · ")}
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              // A customer just registered here lands on the card; changing them starts from the search.
              setCreating(false)
              onClear()
            }}
          >
            {text.customerChange}
          </Button>
        </div>
      ) : creating ? (
        <OrderCustomerCreate
          initial={initialOf(search.query)}
          onSubmit={create.onSubmit}
          pending={create.pending}
          error={create.error}
          existing={create.existing}
          onUseExisting={choose}
          onCancel={() => {
            setCreating(false)
            create.onCancel?.()
          }}
          messages={messages}
        />
      ) : (
        <OrderCustomerSearch {...search} onSelect={choose} onCreate={() => setCreating(true)} messages={messages} />
      )}

      {!selected ? <FieldError>{error}</FieldError> : null}
    </FieldSet>
  )
}
