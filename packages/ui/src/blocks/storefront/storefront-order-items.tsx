// React
import type { ReactNode } from "react"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface StorefrontOrderItemLine {
  name: string
  /** The product's page while it is on sale; null and the name is only text. */
  href: string | null
  imageUrl: string | null
  /** "Sabor: Uva · Qtd. 2 · R$ 59,90 cada", already in words. */
  meta: string
  /** The line at the price of the day it was ordered. */
  price: string
  /** "★ Avaliar produto" (J18): on a delivered order's line, where it is rated. */
  reviewHref?: string | null
}

export interface StorefrontOrderItemsProps {
  items: readonly StorefrontOrderItemLine[]
  /** Units across the lines, for the title. */
  count: number
  /** What can be done with the lines — buying them again joins with its ticket. */
  actions?: ReactNode
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/** What was bought (6e, 6f): every line with its photo, what it was, and what it cost then. */
export function StorefrontOrderItems({ items, count, actions, linkComponent: Link = AnchorLink, messages = defaultMessages }: StorefrontOrderItemsProps) {
  const text = messages.storefront

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-shop-line bg-shop-background p-5 text-shop-on-background">
      <h2 className="text-[17px] font-extrabold">{format(text.orderItemsTitle, { count: String(count) })}</h2>
      <ul className="flex flex-col gap-3">
        {items.map((item, index) => (
          <li key={`${item.name}-${index}`} className="flex gap-3">
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- the shop's own photo, sized by the line
              <img src={item.imageUrl} alt="" className="size-16 shrink-0 rounded-[10px] border border-shop-line object-cover" />
            ) : (
              <span aria-hidden="true" className="size-16 shrink-0 rounded-[10px] bg-shop-fill" />
            )}
            <div className="flex min-w-0 grow flex-col gap-0.5">
              {item.href ? (
                <Link href={item.href} className="text-sm hover:underline">
                  {item.name}
                </Link>
              ) : (
                <span className="text-sm">{item.name}</span>
              )}
              <span className="text-xs text-shop-muted">{item.meta}</span>
              <span className="text-sm font-bold">{item.price}</span>
              {item.reviewHref ? (
                <Link href={item.reviewHref} className="inline-flex min-h-11 w-fit items-center text-xs font-semibold text-shop-primary-ink hover:underline">
                  <span aria-hidden="true">★&nbsp;</span>
                  {text.orderReviewProduct}
                  {/* Every line says the same words: the product's name tells a reader which. */}
                  <span className="sr-only">: {item.name}</span>
                </Link>
              ) : null}

            </div>
          </li>
        ))}
      </ul>
      {actions}
    </section>
  )
}
