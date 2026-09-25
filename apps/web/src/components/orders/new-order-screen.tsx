"use client"

// React
import { useRef } from "react"
import type { KeyboardEvent } from "react"

// Libs
import { ArrowLeftIcon } from "lucide-react"

// UI
import { OrderCustomerSection } from "@harness-monorepo/ui/blocks/orders/order-customer-section"
import { OrderDetailsFields } from "@harness-monorepo/ui/blocks/orders/order-details-fields"
import { OrderLines } from "@harness-monorepo/ui/blocks/orders/order-lines"
import { OrderProductPicker } from "@harness-monorepo/ui/blocks/orders/order-product-picker"
import { OrderSummary } from "@harness-monorepo/ui/blocks/orders/order-summary"
import { formatCents } from "@harness-monorepo/ui/blocks/storefront/storefront-price"
import { FieldError } from "@harness-monorepo/ui/components/field"
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

const CARD = "bg-shell-surface border-shell-border flex flex-col gap-4 rounded-xl border p-5 shadow-xs"

/**
 * Enter in a one-line box would press "Registrar pedido" for whoever was only searching or typing
 * a fee. The order is registered by its button; the note, a textarea, keeps its new lines.
 */
function holdEnter(event: KeyboardEvent<HTMLFormElement>) {
  if (event.key === "Enter" && event.target instanceof HTMLInputElement) event.preventDefault()
}

/** A refused save points at what refused it: the first section with an error takes the focus. */
function focusFirstRefusal(form: HTMLFormElement | null) {
  const error = form?.querySelector<HTMLElement>('[data-slot="field-error"]')
  if (!error) return
  const control = error.closest("section")?.querySelector<HTMLElement>("input:not([type=hidden]), button:not([disabled])")
  error.scrollIntoView({ block: "center" })
  control?.focus({ preventScroll: true })
}

/**
 * Registering a sale the shopkeeper closed elsewhere — on WhatsApp, at the counter. The summary is
 * computed as the API computes it, and saving opens the order that was written.
 */
export function NewOrderScreen({ slug, customerId, messages, web }: NewOrderScreenProps) {
  const text = messages.orders.form
  const store = useStore(slug)
  const customer = useOrderCustomer(slug, customerId, messages, web)
  const order = useNewOrder(slug, customer.selected, messages)
  const form = useRef<HTMLFormElement>(null)

  return (
    <form
      ref={form}
      noValidate
      className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 lg:px-6"
      onKeyDown={holdEnter}
      onSubmit={(event) => {
        event.preventDefault()
        if (!order.submit()) requestAnimationFrame(() => focusFirstRefusal(form.current))
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
        <div className="flex min-w-0 flex-col gap-6">
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

          <section aria-labelledby="new-order-products" className={CARD}>
            <h2 id="new-order-products" className="font-semibold">
              {text.products}
            </h2>
            <OrderProductPicker {...order.picker} money={money} messages={messages} />
            {order.productError ? <FieldError>{pageErrorCopy(order.productError, web)}</FieldError> : null}
            <h3 id="new-order-lines" className="text-muted-foreground text-sm font-medium">
              {text.linesTitle}
            </h3>
            <OrderLines {...order.lines} labelledBy="new-order-lines" money={money} messages={messages} />
            <FieldError>{order.issues.lines}</FieldError>
            <p role="status" className="sr-only">
              {order.announcement}
            </p>
          </section>

          <section aria-labelledby="new-order-details" className={CARD}>
            <h2 id="new-order-details" className="font-semibold">
              {text.detailsTitle}
            </h2>
            <OrderDetailsFields {...order.details} paymentMethods={store.data?.paymentMethods ?? []} issues={order.issues} messages={messages} />
          </section>
        </div>

        {/* Below the panel's fixed header, not under it. */}
        <div className="@4xl/main:sticky @4xl/main:top-[calc(var(--spacing-header)+1rem)]">
          <OrderSummary
            totals={order.totals}
            money={money}
            // Still disabled once saved: the page is on its way to the order, and a second press would be a second order.
            pending={order.save.isPending || order.save.isSuccess}
            error={pageErrorCopy(order.save.error, web)}
            messages={messages}
          />
        </div>
      </div>
    </form>
  )
}
