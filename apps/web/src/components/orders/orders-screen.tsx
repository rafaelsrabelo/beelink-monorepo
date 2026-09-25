"use client"

// React
import { useEffect, useState } from "react"

// Next
import { useRouter, useSearchParams } from "next/navigation"

// Types
import type { OrderStatus } from "@harness-monorepo/contracts"

// UI
import { TablePager } from "@harness-monorepo/ui/blocks/catalog/table-pager"
import { OrderList } from "@harness-monorepo/ui/blocks/orders/order-list"
import { Input } from "@harness-monorepo/ui/components/input"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@harness-monorepo/ui/components/toggle-group"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import type { WebMessages } from "@/locales"
import { AppLink } from "@/components/app-link"
import { pageErrorCopy } from "@/components/design/page-error-copy"
import { useDebouncedValue } from "@/services/addresses/use-debounced-value"
import { useOrders } from "@/services/orders/order-hooks"

const STATUSES = ["RECEIVED", "ACCEPTED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"] as const satisfies readonly OrderStatus[]

const SEARCH_DEBOUNCE_MS = 350

function statusOf(raw: string | null): OrderStatus | null {
  return STATUSES.find((status) => status === raw) ?? null
}

export interface OrdersScreenProps {
  slug: string
  messages: UiMessages
  web: WebMessages
}

/**
 * A shop's orders: a status filter, a search over number, name and phone, and the list.
 *
 * The filter, the search and the page live in the address, as the product list's do: an order
 * opened from here and closed with Back lands on the same filtered page, and "the orders out for
 * delivery" is a link a shopkeeper can keep.
 */
export function OrdersScreen({ slug, messages, web }: OrdersScreenProps) {
  const router = useRouter()
  const params = useSearchParams()
  const text = messages.orders

  const status = statusOf(params.get("status"))
  const q = params.get("q") ?? ""
  const page = Math.max(Number(params.get("page") ?? 1) || 1, 1)

  // The box is held locally too: a history entry behind every letter would be noise, and reading
  // it back from the address would make the field lag. The address wins when it changes elsewhere.
  const [typed, setTyped] = useState(q)
  const [lastSeen, setLastSeen] = useState(q)
  if (q !== lastSeen) {
    setLastSeen(q)
    setTyped(q)
  }
  const settled = useDebouncedValue(typed, SEARCH_DEBOUNCE_MS)

  /** Writes the address. Any change but the page itself returns to page one. */
  function apply(next: { status: OrderStatus | null; q: string }, nextPage = 1) {
    const search = new URLSearchParams()
    if (next.status) search.set("status", next.status)
    if (next.q.trim()) search.set("q", next.q.trim())
    if (nextPage > 1) search.set("page", String(nextPage))
    const query = search.toString()
    router.replace(`/admin/${slug}/orders${query ? `?${query}` : ""}` as Parameters<typeof router.replace>[0])
  }

  useEffect(() => {
    // `settled === typed`: a debounce still holding the text from before a Back must not write it
    // back over the address the Back just restored.
    if (settled === typed && settled.trim() !== q) apply({ status, q: settled })
    // What this is about is the text settling; `apply` and `status` are read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settled, typed, q])

  const orders = useOrders(slug, { ...(status ? { status } : {}), ...(q ? { q } : {}), page })

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 lg:px-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">{text.title}</h1>
          <p className="text-muted-foreground text-sm">{text.description}</p>
        </div>
        <AppLink
          href={`/admin/${slug}/orders/new`}
          className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring inline-flex h-9 items-center rounded-lg px-4 text-sm font-medium outline-none focus-visible:ring-2"
        >
          {text.newOrder}
        </AppLink>
      </header>

      <div className="flex flex-col gap-3">
        <Input
          type="search"
          aria-label={text.searchLabel}
          placeholder={text.searchPlaceholder}
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          className="max-w-sm"
        />
        <ToggleGroup
          aria-label={text.filterLabel}
          value={[status ?? "ALL"]}
          onValueChange={(next: string[]) => apply({ status: statusOf(next[0] ?? null), q })}
          className="flex-wrap"
        >
          <ToggleGroupItem value="ALL" variant="outline">
            {text.all}
          </ToggleGroupItem>
          {STATUSES.map((option) => (
            <ToggleGroupItem key={option} value={option} variant="outline">
              {text.statuses[option]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {orders.error ? <p role="alert" className="text-destructive text-sm">{pageErrorCopy(orders.error, web)}</p> : null}

      {orders.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : (
        <>
          <OrderList
            orders={orders.data?.orders ?? []}
            filtered={status !== null || q !== ""}
            hrefOf={(number) => `/admin/${slug}/orders/${number}`}
            newHref={`/admin/${slug}/orders/new`}
            linkComponent={AppLink}
            messages={messages}
          />
          <TablePager
            page={orders.data?.page ?? page}
            pageSize={orders.data?.pageSize ?? 20}
            total={orders.data?.total ?? 0}
            onPageChange={(next) => apply({ status, q }, next)}
            busy={orders.isFetching}
            previousLabel={text.previous}
            nextLabel={text.next}
            rangeLabel={(from, to, total) => format(text.range, { from: String(from), to: String(to), total: String(total) })}
          />
        </>
      )}
    </div>
  )
}
