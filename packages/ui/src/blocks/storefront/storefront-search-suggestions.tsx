// UI
import { productImageOf } from "@harness-monorepo/ui/lib/product-image"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { StorefrontCardCartButton } from "./storefront-card-cart-button"

export interface StorefrontSuggestion {
  id: string
  label: string
  href: string
  imageUrl?: string | null
  /** Already formatted by the screen: a block does not decide what money looks like. */
  price?: string | null
  /** What it cost before, formatted the same way, drawn struck through under the price. */
  wasPrice?: string | null
  /** Known false only on a product without options: that one goes into the cart from the list. */
  hasOptions?: boolean
  /** Puts one in the cart. A product with options has no "+" — it is chosen on its page. */
  onAdd?: () => void
}

/** Whether a row has its "+": a product the cart can take as it is, with a way to put it there. */
export function canAddFromList(suggestion: StorefrontSuggestion | undefined): boolean {
  return Boolean(suggestion?.onAdd) && suggestion?.hasOptions === false
}

export interface StorefrontSearchSuggestionsProps {
  /** The grid's id, which the field names in `aria-controls`. */
  listId: string
  /** Each cell's id — the product, and its "+" — which the field names in `aria-activedescendant`. */
  cellId: (row: number, column: 0 | 1) => string
  suggestions: readonly StorefrontSuggestion[]
  pending?: boolean
  /** The row the arrow keys are on, -1 with none, and which of its two cells. */
  activeRow: number
  activeColumn: 0 | 1
  /** How many the shop has altogether, for the last row of the list. */
  total?: number
  /** Where that last row goes. Absent and the row is not drawn. */
  seeAllHref?: string
  messages?: UiMessages
}

/**
 * The list under the shop's search: what `StorefrontSearchCombobox` opens while someone types — a
 * product per row, and beside one the cart can take as it is, its "+".
 *
 * A grid and not a listbox, because a row now holds two things to do: an option may not contain a
 * button (axe's `nested-interactive`), and a grid's cells may. Focus never comes here — the field
 * keeps it and points at a cell with `aria-activedescendant`; up and down move between products,
 * right and left between a product and its "+". Every press is a `mousedown` stopped before the
 * field blurs, since a list that closed on the blur would never get the click.
 */
export function StorefrontSearchSuggestions({
  listId,
  cellId,
  suggestions,
  pending = false,
  activeRow,
  activeColumn,
  total = 0,
  seeAllHref,
  messages = defaultMessages,
}: StorefrontSearchSuggestionsProps) {
  const text = messages.storefront

  return (
    <div
      className="absolute inset-x-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-current/10 shadow-lg"
      style={{ backgroundColor: "var(--shop-background)", color: "var(--shop-text)" }}
    >
      <div id={listId} role="grid" aria-label={text.searchSuggestionsLabel}>
        {pending && !suggestions.length ? (
          <div role="row">
            <div role="gridcell" className="px-4 py-3 text-sm opacity-70">
              {text.searchLoading}
            </div>
          </div>
        ) : null}

        {suggestions.map((suggestion, row) => {
          const here = row === activeRow

          return (
            <div key={suggestion.id} role="row" className="flex items-center gap-2 pe-3 transition-colors hover:bg-black/5">
              {/*
                Not a link, for the reason the grid is a grid: the visitor's focus is in the field,
                and this cell is reached through it. What is given up is opening it in a new tab;
                the search page underneath, one Enter away, has real links.
              */}
              <div
                id={cellId(row, 0)}
                role="gridcell"
                aria-selected={here && activeColumn === 0}
                // mousedown and not click: the field blurs first on a click, and a list that has
                // closed by then never receives it.
                onMouseDown={(event) => {
                  event.preventDefault()
                  window.location.assign(suggestion.href)
                }}
                className={cn("flex min-w-0 flex-1 cursor-pointer items-center gap-3 py-2.5 ps-4 text-sm", here && activeColumn === 0 && "bg-black/5")}
              >
                <img src={productImageOf(suggestion.imageUrl)} alt="" aria-hidden="true" className="size-12 shrink-0 rounded-xl object-cover" />
                <span className="min-w-0 flex-1 truncate font-semibold">{suggestion.label}</span>
                {suggestion.price ? (
                  <span className="flex shrink-0 flex-col items-end leading-tight">
                    <span className="font-bold">{suggestion.price}</span>
                    {suggestion.wasPrice ? <s className="text-xs text-shop-muted">{suggestion.wasPrice}</s> : null}
                  </span>
                ) : null}
              </div>

              {canAddFromList(suggestion) ? (
                <div
                  id={cellId(row, 1)}
                  role="gridcell"
                  aria-selected={here && activeColumn === 1}
                  // Keeps the field's focus, so the list stays open and the "+" gets its click.
                  onMouseDown={(event) => event.preventDefault()}
                  className={cn("shrink-0 rounded-full", here && activeColumn === 1 && "outline-2 outline-offset-2 outline-shop-primary-ink")}
                >
                  <StorefrontCardCartButton name={suggestion.label} hasOptions={false} onAdd={suggestion.onAdd!} size="icon" tabIndex={-1} messages={messages} />
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      {/* The way out of a list that only ever shows the first few. */}
      {seeAllHref && total > suggestions.length ? (
        <a
          href={seeAllHref}
          // As the rows: the field would blur on the press and take the list, and this link, with it.
          onMouseDown={(event) => event.preventDefault()}
          className="block border-t border-current/10 px-4 py-3 text-center text-xs font-semibold"
          style={{ color: "var(--shop-primary-ink)" }}
        >
          {format(text.searchSeeAll, { count: String(total) })}
        </a>
      ) : null}
    </div>
  )
}
