// Libs
import { ChevronLeftIcon } from "lucide-react"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { StorefrontPrintButton } from "./storefront-print-button"

export interface StorefrontOrderReceiptProps {
  shop: { name: string }
  number: number
  /** "21 de set. de 2026, 14:02". Every value arrives in words: the block formats nothing. */
  placedOn: string
  customer: string
  /** "Endereço de entrega" with who receives it and where, or "Retirada na loja" with the shop's address; null for a delivery that recorded none. */
  handover: { title: string; lines: readonly string[] } | null
  items: readonly { name: string; meta: string; price: string }[]
  rows: readonly { label: string; value: string }[]
  total: string
  method: string
  /** What the order earns in cashback, in words; none, and nothing is said (BEELINK-243). */
  cashback?: string | null
  /** Said over the order when it did not stand — "Cancelado em …" — so the paper never reads as a sale. */
  note?: string | null
  /** The order's page, the way back from the document. It and "Imprimir" stay on the screen, never on the paper. */
  backHref: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * The order as a document to print or keep (J5): the shop, the order, what was bought and what it
 * cost, and where it went — and the line saying it is not a tax invoice, which the platform never
 * issues. The shop's WhatsApp and phone stay off it: its name says who sold it.
 */
export function StorefrontOrderReceipt({
  shop,
  number,
  placedOn,
  customer,
  handover,
  items,
  rows,
  total,
  cashback = null,
  method,
  note,
  backHref,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: StorefrontOrderReceiptProps) {
  const text = messages.storefront

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6 text-shop-on-background print:max-w-none print:p-0">
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <Link href={backHref} className="flex items-center gap-1 text-sm font-semibold text-shop-primary-ink hover:underline">
          <ChevronLeftIcon aria-hidden="true" className="size-4" />
          {text.receiptBack}
        </Link>
        <span className="ml-auto">
          <StorefrontPrintButton messages={messages} />
        </span>
      </div>
      <article className="flex flex-col gap-6 rounded-2xl border border-shop-line bg-shop-background p-6 text-sm print:rounded-none print:border-0 print:p-0">
        <header className="flex flex-col gap-1 border-b border-shop-line pb-4">
          <p className="text-[11px] font-bold tracking-[0.04em] text-shop-muted uppercase">{text.receiptShop}</p>
          <p className="text-lg font-extrabold">{shop.name}</p>
        </header>

        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-extrabold">{format(text.receiptTitle, { number: String(number) })}</h1>
          {note ? <p className="text-base font-extrabold">{note}</p> : null}
        </div>

        <dl className="grid gap-4 shop-md:grid-cols-3">
          <div className="flex flex-col gap-0.5">
            <dt className="text-[11px] font-bold tracking-[0.04em] text-shop-muted uppercase">{text.receiptDate}</dt>
            <dd className="font-semibold">{placedOn}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-[11px] font-bold tracking-[0.04em] text-shop-muted uppercase">{text.receiptCustomer}</dt>
            <dd className="font-semibold">{customer}</dd>
          </div>
          {handover ? (
            <div className="flex flex-col gap-0.5">
              <dt className="text-[11px] font-bold tracking-[0.04em] text-shop-muted uppercase">{handover.title}</dt>
              {handover.lines.map((line) => (
                <dd key={line}>{line}</dd>
              ))}
            </div>
          ) : null}
        </dl>

        <ul className="flex flex-col divide-y divide-shop-line border-y border-shop-line">
          {items.map((item, index) => (
            <li key={`${item.name}-${index}`} className="flex gap-4 py-3">
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="font-semibold">{item.name}</span>
                <span className="text-xs text-shop-muted">{item.meta}</span>
              </div>
              <span className="ml-auto shrink-0 font-semibold">{item.price}</span>
            </li>
          ))}
        </ul>

        <dl className="ml-auto flex w-full max-w-xs flex-col gap-1.5">
          {rows.map((row) => (
            <div key={row.label} className="flex gap-3">
              <dt>{row.label}</dt>
              <dd className="ml-auto">{row.value}</dd>
            </div>
          ))}
          <div className="flex gap-3 border-t border-shop-line pt-1.5 text-base font-extrabold">
            <dt>{text.orderTotalRow}</dt>
            <dd className="ml-auto">{total}</dd>
          </div>
        </dl>

        <p className="text-shop-muted">{method}</p>
        {cashback ? <p className="font-semibold">{cashback}</p> : null}
        <p className="border-t border-shop-line pt-4 text-xs font-semibold text-shop-muted">{text.receiptNotInvoice}</p>
      </article>
    </div>
  )
}
