// Libs
import { ArrowLeftIcon, PackageIcon, PlusIcon } from "lucide-react"

// UI
import { Badge } from "@harness-monorepo/ui/components/badge"
import { Button } from "@harness-monorepo/ui/components/button"
import { Input } from "@harness-monorepo/ui/components/input"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { OrderProductOption, OrderVariantOption } from "@harness-monorepo/ui/lib/order-form"

export interface OrderProductPickerProps {
  query: string
  onQueryChange: (query: string) => void
  /** The catalogue's answer for the query — its first page when nothing is typed. */
  products: readonly OrderProductOption[]
  searching?: boolean
  onChoose: (product: OrderProductOption) => void
  /** The product whose combinations are on screen; `variants` is null while they are read. */
  chosen: { product: OrderProductOption; variants: readonly OrderVariantOption[] | null } | null
  onBack: () => void
  onAdd: (variant: OrderVariantOption) => void
  money: (cents: number) => string
  messages?: UiMessages
}

function Rows() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  )
}

/**
 * Picking what was sold in two steps: the product from the catalogue, then which of its
 * combinations, each with its own price and whether any is left. One with none left is marked and
 * still added — whether to sell it is the shopkeeper's call.
 */
export function OrderProductPicker({
  query,
  onQueryChange,
  products,
  searching = false,
  onChoose,
  chosen,
  onBack,
  onAdd,
  money,
  messages = defaultMessages,
}: OrderProductPickerProps) {
  const text = messages.orders.form

  if (chosen) {
    return (
      <div className="flex flex-col gap-3">
        <Button type="button" variant="ghost" size="sm" className="self-start" onClick={onBack}>
          <ArrowLeftIcon />
          {text.productBack}
        </Button>
        <p className="font-medium">{chosen.product.name}</p>
        {chosen.variants === null ? (
          <Rows />
        ) : (
          <ul className="divide-border flex flex-col divide-y rounded-lg border">
            {chosen.variants.map((variant) => {
              const name = variant.label ?? chosen.product.name
              return (
                <li key={variant.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-sm">{name}</span>
                    <span className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
                      <span className="tabular-nums">{money(variant.priceCents)}</span>
                      {variant.sku ? <span>{variant.sku}</span> : null}
                      {variant.outOfStock ? <Badge variant="destructive">{text.outOfStock}</Badge> : null}
                    </span>
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={format(text.variantAdd, { name })}
                    onClick={() => onAdd(variant)}
                  >
                    <PlusIcon />
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <Input
        type="search"
        aria-label={text.productSearchLabel}
        placeholder={text.productSearchPlaceholder}
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
      />
      {searching && products.length === 0 ? (
        <Rows />
      ) : products.length === 0 ? (
        <p className="text-muted-foreground text-sm">{text.productNone}</p>
      ) : (
        <ul className="divide-border flex flex-col divide-y rounded-lg border" aria-label={text.products}>
          {products.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                aria-label={format(text.productChoose, { name: product.name })}
                onClick={() => onChoose(product)}
                className="hover:bg-muted focus-visible:ring-ring flex w-full items-center gap-3 px-3 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset"
              >
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt="" className="size-10 shrink-0 rounded-md object-cover" />
                ) : (
                  <span className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-md">
                    <PackageIcon className="size-4" />
                  </span>
                )}
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">{product.name}</span>
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {[money(product.priceCents), product.sku].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
