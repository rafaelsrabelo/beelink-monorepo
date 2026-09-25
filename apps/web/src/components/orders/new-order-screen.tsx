"use client"

// Libs
import { ArrowLeftIcon } from "lucide-react"

// UI
import { OrderCustomerSection } from "@harness-monorepo/ui/blocks/orders/order-customer-section"
import { OrderDetailsFields } from "@harness-monorepo/ui/blocks/orders/order-details-fields"
import { OrderLines } from "@harness-monorepo/ui/blocks/orders/order-lines"
import { OrderProductPicker } from "@harness-monorepo/ui/blocks/orders/order-product-picker"
import { OrderSummary } from "@harness-monorepo/ui/blocks/orders/order-summary"
import { formatCents } from "@harness-monorepo/ui/blocks/storefront/storefront-price"
import { FieldError, FieldLegend, FieldSet } from "@harness-monorepo/ui/components/field"
import { defaultLocale } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import type { WebMessages } from "@/locales"
import { AppLink } from "@/components/app-link"
import { pageErrorCopy } from "@/components/design/page-error-copy"
import { useStore } from "@/services/stores/store-hooks"
import { useNewOrder } from "./use-new-order"
import { useOrderCustomer } from "./use-order-customer"

export interface NewOrderScreenProps {
  slug: string
  /** Opened from a customer's page: that customer is already chosen. */
  customerId: string | null
  messages: UiMessages
  web: WebMessages
}

const money = (cents: number) => formatCents(cents, defaultLocale, "BRL")

/**
 * Registering a sale the shopkeeper closed elsewhere — on WhatsApp, at the counter. The summary is
 * computed as the API computes it, and saving opens the order that was written.
 */
export function NewOrderScreen({ slug, customerId, messages, web }: NewOrderScreenProps) {
  const text = messages.orders.form
  const store = useStore(slug)
  const customer = useOrderCustomer(slug, customerId, messages, web)
  const order = useNewOrder(slug, customer.selected, messages)

  return (
    <form
      noValidate
      className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 lg:px-6"
      onSubmit={(event) => {
        event.preventDefault()
        order.submit()
      }}
    >
      <header className="flex flex-col gap-2">
        <AppLink
          href={`/admin/${slug}/orders`}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex w-fit items-center gap-1 rounded-sm text-sm outline-none focus-visible:ring-2"
        >
          <ArrowLeftIcon className="size-4" />
          {text.back}
        </AppLink>
        <h1 className="text-2xl font-semibold">{text.title}</h1>
        <p className="text-muted-foreground text-sm">{text.description}</p>
      </header>

      <div className="grid items-start gap-6 @4xl/main:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-8">
          <OrderCustomerSection
            selected={customer.selected}
            onSelect={customer.select}
            onClear={customer.clear}
            search={customer.search}
            create={customer.create}
            loading={customer.loading}
            error={customer.initialError ?? order.issues.customer}
            messages={messages}
          />

          <FieldSet className="flex flex-col gap-3">
            <FieldLegend className="text-base font-semibold">{text.products}</FieldLegend>
            <OrderProductPicker {...order.picker} money={money} messages={messages} />
            {order.productError ? <FieldError>{pageErrorCopy(order.productError, web)}</FieldError> : null}
            <OrderLines {...order.lines} money={money} messages={messages} />
            <FieldError>{order.issues.lines}</FieldError>
          </FieldSet>

          <OrderDetailsFields
            {...order.details}
            paymentMethods={store.data?.paymentMethods ?? []}
            issues={order.issues}
            messages={messages}
          />
        </div>

        <div className="@4xl/main:sticky @4xl/main:top-4">
          <OrderSummary
            totals={order.totals}
            money={money}
            pending={order.save.isPending}
            error={pageErrorCopy(order.save.error, web)}
            messages={messages}
          />
        </div>
      </div>
    </form>
  )
}
