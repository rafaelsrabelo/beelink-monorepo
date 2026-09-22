"use client"

// Libs
import { SearchIcon, XIcon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Input } from "@harness-monorepo/ui/components/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@harness-monorepo/ui/components/select"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { ProductCategoryOption } from "./product-form-types"

/** What the table is narrowed by. `""` is "all" in every field — the screen's opening state. */
export interface ProductFilters {
  search: string
  status: "" | "ACTIVE" | "DRAFT"
  categoryId: string
  origin: "" | "IN_HOUSE" | "RESALE"
  stock: "" | "IN_STOCK" | "OUT_OF_STOCK" | "UNTRACKED"
}

export const EMPTY_PRODUCT_FILTERS: ProductFilters = {
  search: "",
  status: "",
  categoryId: "",
  origin: "",
  stock: "",
}

export interface ProductToolbarProps {
  value: ProductFilters
  onChange: (value: ProductFilters) => void
  categories: readonly ProductCategoryOption[]
  messages?: UiMessages
}

/**
 * `""` is how this block spells "no filter", and `"all"` is how Base UI has to spell it.
 *
 * The two cannot be the same string: an empty value is what Base UI means by "nothing chosen", so
 * an item carrying one can never be chosen back once something else has been — the filter would
 * stick on the first thing picked. The same sentinel the category field uses, for the same reason.
 */
const ALL = "all"

export function ProductToolbar({
  value,
  onChange,
  categories,
  messages = defaultMessages,
}: ProductToolbarProps) {
  const text = messages.catalog.products
  const filters = text.filters

  const dirty =
    value.search !== "" ||
    value.status !== "" ||
    value.categoryId !== "" ||
    value.origin !== "" ||
    value.stock !== ""

  /** Base UI hands back `null` on a clear, and the sentinel on "all". Both mean no filter. */
  const picked = (next: string | null) => (!next || next === ALL ? "" : next)

  return (
    <div className="flex flex-col gap-2 @3xl/main:flex-row @3xl/main:items-center">
      <div className="relative @3xl/main:max-w-xs @3xl/main:flex-1">
        <SearchIcon
          aria-hidden="true"
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
        />
        <Input
          type="search"
          autoComplete="off"
          className="w-full pl-8"
          aria-label={filters.searchLabel}
          placeholder={filters.searchPlaceholder}
          value={value.search}
          onChange={(event) => onChange({ ...value, search: event.target.value })}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={value.status === "" ? ALL : value.status}
          onValueChange={(next: string | null) =>
            onChange({ ...value, status: picked(next) as ProductFilters["status"] })
          }
        >
          <SelectTrigger aria-label={text.statusLabel}>
            <SelectValue>
              {(selected: string) =>
                selected === "ACTIVE"
                  ? text.statusActive
                  : selected === "DRAFT"
                    ? text.statusDraft
                    : text.statusLabel
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{filters.anyStatus}</SelectItem>
            <SelectItem value="ACTIVE">{text.statusActive}</SelectItem>
            <SelectItem value="DRAFT">{text.statusDraft}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={value.categoryId === "" ? ALL : value.categoryId}
          onValueChange={(next: string | null) => onChange({ ...value, categoryId: picked(next) })}
        >
          <SelectTrigger aria-label={text.categoryLabel}>
            <SelectValue>
              {(selected: string) =>
                selected === ALL || !selected
                  ? text.categoryLabel
                  : (categories.find((category) => category.id === selected)?.name ?? text.categoryLabel)
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{filters.anyCategory}</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.parentName ? `${category.parentName} › ${category.name}` : category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={value.origin === "" ? ALL : value.origin}
          onValueChange={(next: string | null) =>
            onChange({ ...value, origin: picked(next) as ProductFilters["origin"] })
          }
        >
          <SelectTrigger aria-label={text.originLabel}>
            <SelectValue>
              {(selected: string) =>
                selected === "IN_HOUSE"
                  ? text.originInHouse
                  : selected === "RESALE"
                    ? text.originResale
                    : text.originLabel
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{filters.anyOrigin}</SelectItem>
            <SelectItem value="IN_HOUSE">{text.originInHouse}</SelectItem>
            <SelectItem value="RESALE">{text.originResale}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={value.stock === "" ? ALL : value.stock}
          onValueChange={(next: string | null) =>
            onChange({ ...value, stock: picked(next) as ProductFilters["stock"] })
          }
        >
          <SelectTrigger aria-label={text.table.stock}>
            <SelectValue>
              {(selected: string) =>
                selected === "IN_STOCK"
                  ? filters.inStock
                  : selected === "OUT_OF_STOCK"
                    ? filters.outOfStock
                    : selected === "UNTRACKED"
                      ? filters.untracked
                      : text.table.stock
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{filters.anyStock}</SelectItem>
            <SelectItem value="IN_STOCK">{filters.inStock}</SelectItem>
            <SelectItem value="OUT_OF_STOCK">{filters.outOfStock}</SelectItem>
            <SelectItem value="UNTRACKED">{filters.untracked}</SelectItem>
          </SelectContent>
        </Select>

        {/* Shown only once something is set. A permanent "clear" beside empty filters is a button
            that does nothing, and a row of controls where one is always dead reads as broken. */}
        {dirty ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(EMPTY_PRODUCT_FILTERS)}>
            <XIcon aria-hidden="true" className="size-4" />
            {filters.clear}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
