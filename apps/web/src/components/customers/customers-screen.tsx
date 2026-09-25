"use client"

// React
import { useDeferredValue, useState } from "react"

// UI
import { TablePager } from "@harness-monorepo/ui/blocks/catalog/table-pager"
import { CustomerTable } from "@harness-monorepo/ui/blocks/customers/customer-table"
import { Input } from "@harness-monorepo/ui/components/input"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import type { WebMessages } from "@/locales"
import { pageErrorCopy } from "@/components/design/page-error-copy"
import { useStoreCustomers } from "@/services/customers/customer-hooks"

export interface CustomersScreenProps {
  slug: string
  messages: UiMessages
  web: WebMessages
}

/**
 * Who opened an account at the shop: a search over name, e-mail and phone, and the table. Everyone
 * with an account is a lead until they buy — the stage the CRM to come will build on.
 *
 * The search and the page are screen state, not the address: nobody sends a link to a search of
 * their own customers.
 */
export function CustomersScreen({ slug, messages, web }: CustomersScreenProps) {
  const text = messages.customers
  const [term, setTerm] = useState("")
  const [page, setPage] = useState(1)
  // Typed ahead of the list: each key does not wait for the request before the field shows it.
  const search = useDeferredValue(term.trim())

  const customers = useStoreCustomers(slug, { ...(search ? { q: search } : {}), page })

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 lg:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{text.title}</h1>
        <p className="text-muted-foreground text-sm">{text.description}</p>
      </header>

      <Input
        type="search"
        aria-label={text.searchLabel}
        placeholder={text.searchPlaceholder}
        value={term}
        onChange={(event) => {
          setTerm(event.target.value)
          setPage(1)
        }}
        className="max-w-sm"
      />

      {customers.error ? <p role="alert" className="text-destructive text-sm">{pageErrorCopy(customers.error, web)}</p> : null}

      {customers.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : (
        <>
          <CustomerTable customers={customers.data?.customers ?? []} searching={search !== ""} messages={messages} />
          <TablePager
            page={customers.data?.page ?? page}
            pageSize={customers.data?.pageSize ?? 20}
            total={customers.data?.total ?? 0}
            onPageChange={setPage}
            busy={customers.isFetching}
            previousLabel={text.previous}
            nextLabel={text.next}
            rangeLabel={(from, to, total) => format(text.range, { from: String(from), to: String(to), total: String(total) })}
          />
        </>
      )}
    </div>
  )
}
