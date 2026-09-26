// Libs
import { ArrowLeftIcon, PlusIcon } from "lucide-react"

// UI
import { buttonVariants } from "@harness-monorepo/ui/components/button"

// Locales
import { defaultLocale, defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { CustomerStageBadge } from "./customer-stage-badge"
import type { CustomerRecordView } from "./customer-types"
import { CustomerWhatsApp } from "./customer-whatsapp"

export interface CustomerRecordHeaderProps {
  customer: Pick<CustomerRecordView, "name" | "stage" | "daysSinceLastOrder" | "createdAt">
  /** Where the list is, for the way back. */
  backHref: string
  /** The new order, opened with this customer already chosen. */
  newOrderHref: string
  /** The conversation already typed for where the customer stands; null with no phone. */
  whatsappHref: string | null
  locale?: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * The top of a customer's record: who they are, where they stand — for one who stopped, since
 * when — how long they have been on the shop's list, and the two things a shopkeeper does next: a
 * new order already made out to them, and a message on WhatsApp.
 */
export function CustomerRecordHeader({
  customer,
  backHref,
  newOrderHref,
  whatsappHref,
  locale = defaultLocale,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: CustomerRecordHeaderProps) {
  const text = messages.customers.record
  const since = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(new Date(customer.createdAt))

  return (
    <header className="flex flex-col gap-3">
      <Link
        href={backHref}
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex w-fit items-center gap-1 rounded-sm text-sm outline-none focus-visible:ring-2"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        {text.back}
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold break-words">{customer.name}</h1>
            <CustomerStageBadge customer={customer} messages={messages} />
          </div>
          <p className="text-muted-foreground text-sm">{format(text.since, { date: since })}</p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <Link href={newOrderHref} className={buttonVariants()}>
            <PlusIcon aria-hidden="true" />
            {text.newOrder}
          </Link>
          <CustomerWhatsApp name={customer.name} href={whatsappHref} label={messages.customers.whatsapp} size="default" messages={messages} />
        </div>
      </div>
    </header>
  )
}
