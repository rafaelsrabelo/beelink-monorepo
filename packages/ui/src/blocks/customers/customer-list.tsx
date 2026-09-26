// Locales
import { defaultLocale, defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { formatCents } from "../storefront/storefront-price"
import { CustomerCards } from "./customer-cards"
import { CustomerTable } from "./customer-table"
import type { CustomerListItem, CustomerStageValue } from "./customer-types"

export interface CustomerListProps {
  customers: readonly CustomerListItem[]
  /** Where a customer's record opens. */
  hrefOf: (id: string) => string
  /** The conversation already typed, per stage; null when the customer has no phone. */
  whatsappHrefOf: (customer: CustomerListItem) => string | null
  /** A search is on, so an empty list means "no one matches", not "no one yet". */
  searching?: boolean
  /** The tab the list is under; an empty one means "no one at this stage". */
  stage?: CustomerStageValue | null
  locale?: string
  currency?: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * A shop's customers as the CRM sees them: a table where there is room, cards on a phone. The two
 * are drawn by CSS, not by measuring, so the server sends the right one and nothing jumps on
 * arrival. Room is the panel's main column (`@container/main`), not the window: the rail takes its
 * share.
 */
export function CustomerList({
  customers,
  hrefOf,
  whatsappHrefOf,
  searching = false,
  stage = null,
  locale = defaultLocale,
  currency = "BRL",
  linkComponent = AnchorLink,
  messages = defaultMessages,
}: CustomerListProps) {
  const text = messages.customers

  if (!customers.length) {
    const sentence = searching ? text.emptySearch : stage ? text.emptyStage : text.empty

    return (
      <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed px-4 py-12 text-center">
        <p className="font-medium">{sentence}</p>
        {searching || stage ? null : <p className="text-muted-foreground max-w-md text-sm">{text.emptyHint}</p>}
      </div>
    )
  }

  const thisYear = new Date().getFullYear()
  const date = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short" })
  // An order from another year says so; this year's would only be longer for it.
  const dated = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" })
  const rows = {
    customers,
    hrefOf,
    whatsappHrefOf,
    money: (cents: number) => formatCents(cents, locale, currency),
    when: (iso: string) => {
      const at = new Date(iso)
      return (at.getFullYear() === thisYear ? date : dated).format(at)
    },
    linkComponent,
    messages,
  }

  return (
    <>
      <div className="hidden @4xl/main:block">
        <CustomerTable {...rows} />
      </div>
      <div className="@4xl/main:hidden">
        <CustomerCards {...rows} />
      </div>
    </>
  )
}
