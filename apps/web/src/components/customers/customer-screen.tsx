"use client"

// UI
import { TablePager } from "@harness-monorepo/ui/blocks/catalog/table-pager"
import { CustomerOrders } from "@harness-monorepo/ui/blocks/customers/customer-orders"
import { CustomerProfile } from "@harness-monorepo/ui/blocks/customers/customer-profile"
import { CustomerRecordHeader } from "@harness-monorepo/ui/blocks/customers/customer-record-header"
import { CustomerStats } from "@harness-monorepo/ui/blocks/customers/customer-stats"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import type { WebMessages } from "@/locales"
import { AppLink } from "@/components/app-link"
import { pageErrorCopy } from "@/components/design/page-error-copy"
import { addressLineOf } from "@/lib/customer-address"
import { customerWhatsappHref } from "@/lib/whatsapp-customer"
import { useStore } from "@/services/stores/store-hooks"
import { CustomerScreenSkeleton } from "./customer-screen-skeleton"
import { useCustomerRecord } from "./use-customer-record"

export interface CustomerScreenProps {
  slug: string
  customerId: string
  messages: UiMessages
  web: WebMessages
}

/**
 * Everything the shop knows of one customer on one page: who they are and how to reach them, their
 * figures, every order they made — each leading to it — a new order already made out to them, and
 * the WhatsApp message for where they stand. Their details are corrected here, in their card.
 */
export function CustomerScreen({ slug, customerId, messages, web }: CustomerScreenProps) {
  const text = messages.customers
  const view = useCustomerRecord(slug, customerId, web)
  // Already cached by the panel's shell: the message says which shop is writing.
  const store = useStore(slug)
  const listHref = `/admin/${slug}/customers`

  if (view.record.isPending) return <CustomerScreenSkeleton />

  if (!view.record.data) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 lg:px-6">
        <p role="alert" className="text-destructive text-sm">
          {pageErrorCopy(view.record.error, web)}
        </p>
        <AppLink href={listHref} className="text-sm underline underline-offset-4">
          {text.record.back}
        </AppLink>
      </div>
    )
  }

  const customer = view.record.data
  const history = view.history.data

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 lg:px-6">
      <CustomerRecordHeader
        customer={customer}
        backHref={listHref}
        newOrderHref={`/admin/${slug}/orders/new?customer=${encodeURIComponent(customer.id)}`}
        whatsappHref={customerWhatsappHref({ shopName: store.data?.name ?? "", customer, messages })}
        linkComponent={AppLink}
        messages={messages}
      />

      <CustomerStats customer={customer} messages={messages} />

      {/* The details come first to be read, and sit in the side column where there is one. */}
      <div className="grid items-start gap-6 @4xl/main:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="@4xl/main:col-start-2 @4xl/main:row-start-1">
          <CustomerProfile customer={customer} addressLine={addressLineOf(customer.address)} {...view.profile} messages={messages} />
        </div>
        <div className="flex min-w-0 flex-col gap-3 @4xl/main:col-start-1 @4xl/main:row-start-1">
          {view.history.error ? (
            <p role="alert" className="text-destructive text-sm">
              {pageErrorCopy(view.history.error, web)}
            </p>
          ) : null}
          <CustomerOrders
            orders={history?.orders ?? []}
            loading={!history && !view.history.error}
            hrefOf={(number) => `/admin/${slug}/orders/${number}`}
            pager={
              history ? (
                <TablePager
                  page={history.page}
                  pageSize={history.pageSize}
                  total={history.total}
                  onPageChange={view.goToPage}
                  busy={view.history.isFetching}
                  previousLabel={text.previous}
                  nextLabel={text.next}
                  rangeLabel={(from, to, total) => format(text.range, { from: String(from), to: String(to), total: String(total) })}
                />
              ) : null
            }
            linkComponent={AppLink}
            messages={messages}
          />
        </div>
      </div>
    </div>
  )
}
