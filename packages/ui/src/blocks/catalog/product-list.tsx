"use client"

// Libs
import { PencilIcon, Trash2Icon } from "lucide-react"

// UI
import { Badge } from "@harness-monorepo/ui/components/badge"
import { Button } from "@harness-monorepo/ui/components/button"

// Locales
import { defaultLocale, defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface ProductListItem {
  id: string
  name: string
  priceCents: number
  compareAtPriceCents: number | null
  imageUrl: string | null
  categoryName: string | null
  isAvailable: boolean
}

export interface ProductListProps {
  products: readonly ProductListItem[]
  onEdit: (productId: string) => void
  onDelete: (productId: string) => void
  locale?: string
  currency?: string
  busyId?: string | null
  messages?: UiMessages
}

/**
 * What the shop sells, as its owner sees it.
 *
 * The ones taken off sale are here, marked. This is the screen where one is put back on, so
 * leaving it out would make that impossible — and a row invisible to customers that looks like
 * every other row is the kind of thing found out by a phone call asking where the page went.
 */
export function ProductList({
  products,
  onEdit,
  onDelete,
  locale = defaultLocale,
  currency = "BRL",
  busyId = null,
  messages = defaultMessages,
}: ProductListProps) {
  const text = messages.catalog.products
  const money = new Intl.NumberFormat(locale, { style: "currency", currency })

  if (!products.length) {
    return (
      <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed py-12 text-center">
        <p className="font-medium">{text.empty}</p>
        <p className="text-muted-foreground text-sm">{text.emptyHint}</p>
      </div>
    )
  }

  return (
    <ul className="divide-y rounded-xl border px-3">
      {products.map((product) => (
        <li key={product.id} className="flex items-center gap-3 py-2">
          <span className="bg-muted flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt="" aria-hidden="true" className="size-full object-cover" />
            ) : null}
          </span>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center gap-2">
              <p className="truncate font-medium">{product.name}</p>
              {product.isAvailable ? null : <Badge variant="secondary">{text.unavailable}</Badge>}
            </div>
            <p className="text-muted-foreground truncate text-xs">
              {product.categoryName ?? text.uncategorised}
            </p>
          </div>

          <div className="shrink-0 text-right">
            <p className="font-medium tabular-nums">{money.format(product.priceCents / 100)}</p>
            {/* The old price is struck through here as it is in the window, so the shopkeeper sees
                the discount the way a customer will rather than two numbers side by side. */}
            {product.compareAtPriceCents ? (
              <p className="text-muted-foreground text-xs line-through tabular-nums">
                {money.format(product.compareAtPriceCents / 100)}
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`${text.edit}: ${product.name}`}
              onClick={() => onEdit(product.id)}
              disabled={busyId === product.id}
            >
              <PencilIcon aria-hidden="true" className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`${text.delete}: ${product.name}`}
              onClick={() => onDelete(product.id)}
              disabled={busyId === product.id}
            >
              <Trash2Icon aria-hidden="true" className="size-4" />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  )
}
