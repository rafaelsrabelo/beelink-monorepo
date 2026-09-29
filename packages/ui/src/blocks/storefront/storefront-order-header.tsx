// React
import type { ReactNode } from "react"

// Libs
import { ChevronLeftIcon } from "lucide-react"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { StorefrontBreadcrumb, type StorefrontCrumb } from "./storefront-breadcrumb"

export interface StorefrontOrderHeaderProps {
  number: number
  /** Who placed it and when, already a sentence: "Feito por você na loja em 21 de set. de 2026, 14:02." */
  placed: string
  /** The trail from the account to the list; the order itself is its last crumb, added here. */
  trail: readonly StorefrontCrumb[]
  homeHref: string
  /** Meus pedidos: the phone's way back, where the trail has no room. */
  backHref: string
  /** The order as a document to print: "Ver comprovante". */
  receiptHref: string
  /** What else can be done with it now — each action arrives with its own ticket. */
  actions?: ReactNode
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * The top of an order's page (6e): the trail, the order's number and who placed it when, and what
 * can be done with it. On a phone the trail becomes the way back to the list (6f).
 */
export function StorefrontOrderHeader({
  number,
  placed,
  trail,
  homeHref,
  backHref,
  receiptHref,
  actions,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: StorefrontOrderHeaderProps) {
  const text = messages.storefront
  const title = format(text.orderNumber, { number: String(number) })

  return (
    <header className="flex flex-col gap-3 text-shop-on-background">
      <div className="hidden shop-md:block">
        <StorefrontBreadcrumb items={[...trail, { label: title }]} homeHref={homeHref} linkComponent={Link} messages={messages} />
      </div>
      <Link href={backHref} className="flex w-fit items-center gap-1 text-sm font-semibold text-shop-primary-ink hover:underline shop-md:hidden">
        <ChevronLeftIcon aria-hidden="true" className="size-4" />
        {text.accountOrders}
      </Link>
      <div className="flex flex-col gap-3 shop-md:flex-row shop-md:items-end">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-2xl font-extrabold shop-lg:text-3xl">{title}</h1>
          <p className="text-sm text-shop-muted">{placed}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shop-md:ml-auto">
          {actions}
          <Link href={receiptHref} className="flex h-10 items-center rounded-full border border-shop-line-strong bg-shop-background px-4 text-sm font-semibold hover:bg-shop-fill">
            {text.orderReceipt}
          </Link>
        </div>
      </div>
    </header>
  )
}
