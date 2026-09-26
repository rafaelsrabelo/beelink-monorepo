"use client"

// UI
import { TablePager } from "@harness-monorepo/ui/blocks/catalog/table-pager"
import { CustomerList } from "@harness-monorepo/ui/blocks/customers/customer-list"
import { CustomerStageTabs } from "@harness-monorepo/ui/blocks/customers/customer-stage-tabs"
import { CustomerToolbar } from "@harness-monorepo/ui/blocks/customers/customer-toolbar"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import type { WebMessages } from "@/locales"
import { AppLink } from "@/components/app-link"
import { pageErrorCopy } from "@/components/design/page-error-copy"
import { customerWhatsappHref } from "@/lib/whatsapp-customer"
import { useStoreCustomers } from "@/services/customers/customer-hooks"
import { useStore } from "@/services/stores/store-hooks"
import { useCustomerListAddress } from "./use-customer-list-address"

export interface CustomersScreenProps {
  slug: string
  messages: UiMessages
  web: WebMessages
}

/**
 * The shop's customers as the CRM: who never bought, who buys and who stopped, in tabs that say how
 * many; the search and the order; and on every row the way to the record and a WhatsApp message
 * ready for where that customer stands. Tab, order, search and page live in the address.
 */
export function CustomersScreen({ slug, messages, web }: CustomersScreenProps) {
  const text = messages.customers
  const list = useCustomerListAddress(slug)

  const customers = useStoreCustomers(slug, {
    ...(list.stage ? { stage: list.stage } : {}),
    ...(list.sort !== "RECENT" ? { sort: list.sort } : {}),
    ...(list.q ? { q: list.q } : {}),
    page: list.page,
  })
  // Already cached by the panel's shell: the message says which shop is writing.
  const store = useStore(slug)
  const shopName = store.data?.name ?? ""

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 lg:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{text.title}</h1>
        <p className="text-muted-foreground text-sm">{text.description}</p>
      </header>

      <CustomerToolbar
        search={list.typed}
        onSearchChange={list.setTyped}
        sort={list.sort}
        onSortChange={(sort) => list.apply({ sort })}
        messages={messages}
      />

      {customers.error ? <p role="alert" className="text-destructive text-sm">{pageErrorCopy(customers.error, web)}</p> : null}

      <CustomerStageTabs value={list.stage} onValueChange={(stage) => list.apply({ stage })} counts={customers.data?.stageCounts} messages={messages}>
        {customers.isPending ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : customers.data ? (
          <>
            <CustomerList
              customers={customers.data.customers}
              searching={list.q !== ""}
              stage={list.stage}
              hrefOf={(id) => `/admin/${slug}/customers/${id}`}
              whatsappHrefOf={(customer) => customerWhatsappHref({ shopName, customer, messages })}
              linkComponent={AppLink}
              messages={messages}
            />
            <TablePager
              page={customers.data.page}
              pageSize={customers.data.pageSize}
              total={customers.data.total}
              onPageChange={(page) => list.apply({}, page)}
              busy={customers.isFetching}
              previousLabel={text.previous}
              nextLabel={text.next}
              rangeLabel={(from, to, total) => format(text.range, { from: String(from), to: String(to), total: String(total) })}
            />
          </>
        ) : null}
      </CustomerStageTabs>
    </div>
  )
}
