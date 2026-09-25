// Libs
import { MinusIcon, PlusIcon, Trash2Icon } from "lucide-react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { formatCents } from "./storefront-price"

export interface StorefrontCartRow {
  key: string
  name: string
  href: string
  variantLabel: string | null
  imageUrl: string | null
  unitPriceCents: number
  qty: number
  lineTotalCents: number
  available: boolean
}

export interface StorefrontCartLineProps {
  row: StorefrontCartRow
  locale: string
  /** The most one line may hold. */
  maxQty?: number
  onQtyChange?: (key: string, qty: number) => void
  onRemove?: (key: string) => void
  linkComponent?: LinkComponent
  messages?: UiMessages
}

const STEP = "flex size-9 items-center justify-center text-shop-on-background disabled:opacity-40"

/**
 * One line of the cart: the photo, the name as a link back to its page, the combination, the unit
 * price, a − n + stepper, the line's total and a way to take it out. A sold-out line stays in view
 * and says it will not be ordered, rather than vanishing from under the shopper.
 */
export function StorefrontCartLine({ row, locale, maxQty = 99, onQtyChange, onRemove, linkComponent: Link = AnchorLink, messages = defaultMessages }: StorefrontCartLineProps) {
  const text = messages.storefront
  const money = (cents: number) => formatCents(cents, locale, "BRL")

  return (
    <li className={cn("flex gap-4 border-b border-shop-line py-4 last:border-b-0", !row.available && "opacity-70")}>
      <div className="size-20 shrink-0 overflow-hidden rounded-lg bg-shop-placeholder">
        {row.imageUrl ? <img src={row.imageUrl} alt="" className="size-full object-cover" /> : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Link href={row.href} className="line-clamp-2 text-[15px] font-medium hover:underline">
          {row.name}
        </Link>
        {row.variantLabel ? <p className="text-[13px] text-shop-muted">{row.variantLabel}</p> : null}
        <p className="text-[13px] text-shop-muted">{money(row.unitPriceCents)}</p>
        {row.available ? null : <p className="text-[13px] font-semibold text-shop-sale-ink">{text.cartUnavailable}</p>}

        <div className="mt-1 flex items-center gap-3">
          <div role="group" aria-label={`${text.cartQuantity}: ${row.name}`} className="flex items-center rounded-[10px] border border-shop-line-strong bg-shop-background">
            <button type="button" aria-label={format(text.cartDecrease, { name: row.name })} disabled={row.qty <= 1} onClick={() => onQtyChange?.(row.key, row.qty - 1)} className={STEP}>
              <MinusIcon aria-hidden="true" className="size-4" />
            </button>
            <span className="min-w-8 text-center text-sm font-semibold tabular-nums">{row.qty}</span>
            <button type="button" aria-label={format(text.cartIncrease, { name: row.name })} disabled={row.qty >= maxQty || !row.available} onClick={() => onQtyChange?.(row.key, row.qty + 1)} className={STEP}>
              <PlusIcon aria-hidden="true" className="size-4" />
            </button>
          </div>
          <button type="button" aria-label={format(text.cartRemove, { name: row.name })} onClick={() => onRemove?.(row.key)} className="flex size-9 items-center justify-center rounded-md text-shop-muted hover:text-shop-on-background">
            <Trash2Icon aria-hidden="true" className="size-4" />
          </button>
        </div>
      </div>

      <p className={cn("shrink-0 text-[15px] font-bold tabular-nums", !row.available && "line-through")}>{money(row.lineTotalCents)}</p>
    </li>
  )
}
