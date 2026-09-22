"use client"

// Libs
import { PencilIcon, Trash2Icon } from "lucide-react"

// UI
import { Badge } from "@harness-monorepo/ui/components/badge"
import { Button } from "@harness-monorepo/ui/components/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@harness-monorepo/ui/components/table"

// Locales
import { defaultLocale, defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface ProductTableItem {
  id: string
  name: string
  /** The shopkeeper's own code. Null is the normal case, not an error. */
  sku: string | null
  priceCents: number
  compareAtPriceCents: number | null
  imageUrl: string | null
  categoryName: string | null
  status: "ACTIVE" | "DRAFT"
  /** Null is a shopkeeper who has not said whether they make it or resell it. */
  origin: "IN_HOUSE" | "RESALE" | null
  /** Off means the shop does not count this product — which is not a stock of zero. */
  trackStock: boolean
  stockQuantity: number | null
}

export interface ProductTableProps {
  products: readonly ProductTableItem[]
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
 * Drafts are here, marked. This is the screen where one is published, so leaving it out would make
 * that impossible — and a row invisible to customers that looks like every other row is the kind of
 * thing found out by a phone call asking where the page went.
 *
 * A table and not a card list because these columns are read down, not across: a shopkeeper opens
 * this screen to find the one product whose stock is wrong, and scanning one column of numbers is
 * what finds it. The narrow-screen answer is the container's own horizontal scroll rather than
 * collapsing to cards, so the columns stay aligned and comparable at every width.
 */
export function ProductTable({
  products,
  onEdit,
  onDelete,
  locale = defaultLocale,
  currency = "BRL",
  busyId = null,
  messages = defaultMessages,
}: ProductTableProps) {
  const text = messages.catalog.products
  const columns = text.table
  const money = new Intl.NumberFormat(locale, { style: "currency", currency })

  if (!products.length) {
    return (
      <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed py-12 text-center">
        <p className="font-medium">{text.empty}</p>
        <p className="text-muted-foreground text-sm">{text.emptyHint}</p>
      </div>
    )
  }

  const originLabel = (origin: ProductTableItem["origin"]) => {
    if (origin === "IN_HOUSE") return text.originInHouse
    if (origin === "RESALE") return text.originResale
    return text.originUnset
  }

  return (
    <div className="rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-28">{columns.code}</TableHead>
            <TableHead>{columns.name}</TableHead>
            <TableHead className="w-28">{columns.status}</TableHead>
            <TableHead className="w-28 text-right">{columns.stock}</TableHead>
            <TableHead className="w-40">{columns.category}</TableHead>
            <TableHead className="w-32">{columns.origin}</TableHead>
            <TableHead className="w-32 text-right">{columns.price}</TableHead>
            {/* Read aloud, never drawn: a visible "Actions" over two icon buttons is a column
                heading that describes the furniture rather than the data. */}
            <TableHead className="w-24">
              <span className="sr-only">{columns.actions}</span>
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell className="text-muted-foreground font-mono text-xs tabular-nums">
                {product.sku ?? columns.noCode}
              </TableCell>

              <TableCell>
                <div className="flex items-center gap-3">
                  <span className="bg-muted flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt="" aria-hidden="true" className="size-full object-cover" />
                    ) : null}
                  </span>
                  <span className="min-w-0 truncate font-medium">{product.name}</span>
                </div>
              </TableCell>

              <TableCell>
                <Badge variant={product.status === "ACTIVE" ? "default" : "secondary"}>
                  {product.status === "ACTIVE" ? text.statusActive : text.statusDraft}
                </Badge>
              </TableCell>

              {/* "Not tracked" and "none left" are different facts, and the shop that sells made to
                  order is the first kind. Printing 0 for both is what sends someone looking for a
                  stock screen that has nothing to do with why the product is hidden. */}
              <TableCell className="text-right tabular-nums">
                {product.trackStock ? (
                  (product.stockQuantity ?? 0)
                ) : (
                  <span className="text-muted-foreground text-xs">{columns.stockUntracked}</span>
                )}
              </TableCell>

              <TableCell className="truncate">
                {product.categoryName ?? <span className="text-muted-foreground">{text.uncategorised}</span>}
              </TableCell>

              <TableCell>
                {product.origin ? (
                  originLabel(product.origin)
                ) : (
                  <span className="text-muted-foreground">{text.originUnset}</span>
                )}
              </TableCell>

              <TableCell className="text-right">
                <span className="font-medium tabular-nums">{money.format(product.priceCents / 100)}</span>
                {/* The old price is struck through here as it is in the window, so the shopkeeper
                    sees the discount the way a customer will rather than two numbers side by side. */}
                {product.compareAtPriceCents ? (
                  <span className="text-muted-foreground block text-xs line-through tabular-nums">
                    {money.format(product.compareAtPriceCents / 100)}
                  </span>
                ) : null}
              </TableCell>

              <TableCell>
                <div className="flex items-center justify-end gap-1">
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
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
