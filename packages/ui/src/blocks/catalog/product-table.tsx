"use client"

// Libs
import { EyeIcon, PencilIcon, Trash2Icon } from "lucide-react"

// UI
import { Badge } from "@harness-monorepo/ui/components/badge"
import { Button, buttonVariants } from "@harness-monorepo/ui/components/button"
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
  /**
   * The shelf is empty. Derived by the API, not recomputed here: the same fact decides whether the
   * shop window shows the product, and two implementations of one rule is one rule too many.
   */
  soldOut: boolean
  /** Null is a shopkeeper who has not said whether they make it or resell it. */
  origin: "IN_HOUSE" | "RESALE" | null
  /** Off means the shop does not count this product — which is not a stock of zero. */
  trackStock: boolean
  stockQuantity: number | null
  /**
   * The product's own page on the shop window, or null when it has none — a draft is not published,
   * so an eye pointing at it would open a 404.
   */
  viewHref?: string | null
}

export interface ProductTableProps {
  products: readonly ProductTableItem[]
  onEdit: (productId: string) => void
  onDelete: (productId: string) => void
  /**
   * What to say when there is nothing to show. It is a prop because "no products yet" and "no
   * product matches this filter" are different facts, and telling a shopkeeper with 200 products
   * to "cadastre o primeiro" because they mistyped a search is the worse of the two mistakes.
   */
  emptyTitle?: string
  emptyHint?: string
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
  emptyTitle,
  emptyHint,
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
        <p className="font-medium">{emptyTitle ?? text.empty}</p>
        <p className="text-muted-foreground text-sm">{emptyHint ?? text.emptyHint}</p>
      </div>
    )
  }

  const originLabel = (origin: ProductTableItem["origin"]) => {
    if (origin === "IN_HOUSE") return text.originInHouse
    if (origin === "RESALE") return text.originResale
    return text.originUnset
  }

  const statusOf = (product: ProductTableItem): { label: string; variant: "outline" | "default"; tone?: string } => {
    // A draft wins over an empty shelf: the shopkeeper's intention is the headline, and a product
    // that was never published is not "sold out" — nobody could have bought it.
    if (product.status === "DRAFT") return { label: text.statusDraft, variant: "outline" as const }
    // Outline with a red border and red text, not the tinted `destructive` pill: that pill puts
    // the destructive token on a 10% wash of itself and measures 3.99:1, under the 4.5:1 this
    // package's own axe run enforces — so the one state a shopkeeper is scanning for would have
    // been the only one they could not read. On the table's white surface the same red is 4.77:1.
    // (No literal colour here, even in a comment: `web/no-hex-colors` is a raw grep at zero.)
    if (product.soldOut) {
      return { label: text.statusSoldOut, variant: "outline" as const, tone: "border-destructive/40 text-destructive" }
    }
    return { label: text.statusActive, variant: "default" as const }
  }

  return (
    // A card, like every other slab in this panel. Without a surface of its own the table was the
    // page colour with a border drawn round it, and the screen read as one flat sheet.
    <div className="bg-shell-surface border-shell-border rounded-xl border shadow-xs">
      <Table>
        <TableHeader className="bg-muted/40">
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
            <TableHead className="w-32">
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
                {/*
                  Three states, because two were a lie on screen: a row marked "Ativo" with a stock
                  of zero is not on sale, and reading it was what sent a shopkeeper looking for a
                  bug that was in the words rather than in the shop.

                  `outline` and not `secondary` for a draft: secondary is near-white on this
                  surface, and a draft is the row a shopkeeper is scanning for.
                */}
                <Badge variant={statusOf(product).variant} className={statusOf(product).tone}>
                  {statusOf(product).label}
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
                  {/*
                    An anchor, not a button calling `window.open`. This navigates, so it belongs in
                    the tab order as a link, opens on a middle click and offers "copy address" on a
                    right click — none of which a button does. It opens elsewhere because the shop
                    window is elsewhere: a shopkeeper checking a page wants their list still behind
                    it.
                  */}
                  {product.viewHref ? (
                    <a
                      href={product.viewHref}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`${text.view}: ${product.name}`}
                      className={buttonVariants({ variant: "ghost", size: "icon" })}
                    >
                      <EyeIcon aria-hidden="true" className="size-4" />
                    </a>
                  ) : (
                    // Kept in place rather than left out: a column that loses a control on some
                    // rows moves the two beside it, and the name says why this one does nothing.
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled
                      // The reason comes from the row, not from the missing address. A published
                      // product whose shop has not loaded yet also has no href, and announcing it
                      // as a draft tells a screen reader the one thing about it that is false.
                      aria-label={`${product.status === "DRAFT" ? text.viewDraft : text.view}: ${product.name}`}
                    >
                      <EyeIcon aria-hidden="true" className="size-4" />
                    </Button>
                  )}
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
