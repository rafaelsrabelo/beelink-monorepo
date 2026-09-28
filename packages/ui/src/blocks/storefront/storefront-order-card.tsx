// React
import type { ReactNode } from "react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface StorefrontOrderCardItem {
  name: string
  /** The product's page; null once the product is gone, and the name is only text. */
  href: string | null
  imageUrl: string | null
  /** "Sabor: Uva · Qtd. 1", already in words. */
  meta: string
}

export interface StorefrontOrderCardProps {
  number: number
  /** Every line already in the shopper's words and language: the block formats nothing. */
  placedOn: string
  total: string
  /** Who receives it, or the pick-up; null hides the column. */
  shipTo: string | null
  headline: string
  detail: string | null
  /** How the headline reads: on its way, arrived, or called off. */
  tone: "progress" | "done" | "cancelled"
  items: readonly StorefrontOrderCardItem[]
  /** Lines past the ones shown: "+ N itens". */
  moreItems: number
  /** What can be done with it now — each action arrives with its own ticket. */
  actions?: ReactNode
  linkComponent?: LinkComponent
  messages?: UiMessages
}

const TONE = {
  progress: "text-shop-on-background",
  done: "text-shop-positive-ink",
  cancelled: "text-shop-muted",
} as const

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-[11px] font-bold tracking-[0.04em] text-shop-muted uppercase">{label}</span>
      <span className="truncate text-sm font-semibold">{children}</span>
    </div>
  )
}

/**
 * One order as 6d draws it: a grey header of facts — when, how much and how, for whom, its number —
 * then where it stands, its first lines with their photos, and what can be done with it. On a phone
 * the facts stack.
 */
export function StorefrontOrderCard({
  number,
  placedOn,
  total,
  shipTo,
  headline,
  detail,
  tone,
  items,
  moreItems,
  actions,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: StorefrontOrderCardProps) {
  const text = messages.storefront

  return (
    <article aria-label={format(text.orderNumber, { number: String(number) })} className="overflow-hidden rounded-2xl border border-shop-line bg-shop-background text-shop-on-background">
      <header className="grid gap-3 border-b border-shop-line bg-shop-fill px-5 py-3.5 shop-md:grid-cols-[1fr_1fr_1fr_auto] shop-md:items-center shop-md:gap-6">
        <Fact label={text.orderPlacedOn}>{placedOn}</Fact>
        <Fact label={text.orderTotalLabel}>{total}</Fact>
        {shipTo ? <Fact label={text.orderShipTo}>{shipTo}</Fact> : <div className="hidden shop-md:block" />}
        <span className="text-sm font-bold shop-md:text-right">{format(text.orderNumber, { number: String(number) })}</span>
      </header>

      <div className="flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-0.5">
          <p className={cn("text-lg font-extrabold", TONE[tone])}>{headline}</p>
          {detail ? <p className="text-sm text-shop-muted">{detail}</p> : null}
        </div>

        <ul className="flex flex-col gap-3">
          {items.map((item, index) => (
            <li key={`${item.name}-${index}`} className="flex items-center gap-3">
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- the shop's own photo, sized by the card
                <img src={item.imageUrl} alt="" className="size-14 shrink-0 rounded-[10px] border border-shop-line object-cover" />
              ) : (
                <span aria-hidden="true" className="size-14 shrink-0 rounded-[10px] bg-shop-fill" />
              )}
              <div className="flex min-w-0 flex-col gap-0.5">
                {item.href ? (
                  <Link href={item.href} className="truncate text-sm font-medium hover:underline">
                    {item.name}
                  </Link>
                ) : (
                  <span className="truncate text-sm font-medium">{item.name}</span>
                )}
                <span className="text-xs text-shop-muted">
                  {item.meta}
                  {index === items.length - 1 && moreItems > 0 ? ` · ${format(moreItems === 1 ? text.orderMoreItem : text.orderMoreItems, { count: String(moreItems) })}` : ""}
                </span>
              </div>
            </li>
          ))}
        </ul>

        {actions ? <div className="flex flex-wrap gap-2 pt-1">{actions}</div> : null}
      </div>
    </article>
  )
}
