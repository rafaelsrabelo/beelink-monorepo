"use client"

// Libs
import { PencilIcon, Trash2Icon } from "lucide-react"

// UI
import { Badge } from "@harness-monorepo/ui/components/badge"
import { Button } from "@harness-monorepo/ui/components/button"

// Locales
import { defaultLocale, defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"
import { cn } from "@harness-monorepo/ui/lib/utils"

export interface CategoryListItem {
  id: string
  slug: string
  name: string
  imageUrl: string | null
  parentSlug: string | null
  productCount: number
  isActive: boolean
}

export interface CategoryListProps {
  categories: readonly CategoryListItem[]
  onEdit: (categoryId: string) => void
  onDelete: (categoryId: string) => void
  locale?: string
  busyId?: string | null
  messages?: UiMessages
}

/** One letter, so a category with no photograph is a mark rather than an empty hole. */
function initialOf(name: string): string {
  return name.trim().slice(0, 1).toUpperCase()
}

/**
 * Every category the shop has, parents with their children under them.
 *
 * A tree and not a flat table, because the nesting is the thing being edited: a shopkeeper who has
 * just put `Whey` inside `Proteínas` needs to see that it went there, and a `parentSlug` column in
 * a row of thirty is not seeing it.
 *
 * The hidden ones are here — this is the screen where a shopkeeper turns one back on, so leaving
 * them out would make that impossible. They carry a badge instead, because a row that looks like
 * every other row while being invisible to customers is the kind of thing found out by a phone
 * call asking where the page went.
 */
export function CategoryList({
  categories,
  onEdit,
  onDelete,
  locale = defaultLocale,
  busyId = null,
  messages = defaultMessages,
}: CategoryListProps) {
  const text = messages.catalog.categories
  const number = new Intl.NumberFormat(locale)

  if (!categories.length) {
    return (
      <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed py-12 text-center">
        <p className="font-medium">{text.empty}</p>
        <p className="text-muted-foreground text-sm">{text.emptyHint}</p>
      </div>
    )
  }

  const tops = categories.filter((category) => !category.parentSlug)
  const childrenOf = (slug: string) => categories.filter((category) => category.parentSlug === slug)

  // A subcategory whose parent is not in the list would otherwise never be drawn. It should not
  // happen — the API answers the whole shop — but a row that silently vanishes is the worst way to
  // find out that it did.
  const orphans = categories.filter(
    (category) => category.parentSlug && !categories.some((entry) => entry.slug === category.parentSlug),
  )

  const row = (category: CategoryListItem, nested: boolean) => (
    <li key={category.id} className={cn(nested && "ml-6 border-l pl-4")}>
      <div className="flex items-center gap-3 py-2">
        <span className="bg-muted flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg text-sm font-semibold">
          {category.imageUrl ? (
            <img src={category.imageUrl} alt="" aria-hidden="true" className="size-full object-cover" />
          ) : (
            <span aria-hidden="true">{initialOf(category.name)}</span>
          )}
        </span>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium">{category.name}</p>
            {category.isActive ? null : <Badge variant="secondary">{text.hidden}</Badge>}
          </div>
          <p className="text-muted-foreground text-xs">
            {category.productCount === 1
              ? text.productCountOne
              : format(text.productCount, { count: number.format(category.productCount) })}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`${text.edit}: ${category.name}`}
            onClick={() => onEdit(category.id)}
            disabled={busyId === category.id}
          >
            <PencilIcon aria-hidden="true" className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`${text.delete}: ${category.name}`}
            onClick={() => onDelete(category.id)}
            disabled={busyId === category.id}
          >
            <Trash2Icon aria-hidden="true" className="size-4" />
          </Button>
        </div>
      </div>

      {childrenOf(category.slug).length ? (
        <ul>{childrenOf(category.slug).map((child) => row(child, true))}</ul>
      ) : null}
    </li>
  )

  return (
    <ul className="divide-y rounded-xl border px-3">
      {tops.map((category) => row(category, false))}
      {orphans.map((category) => row(category, false))}
    </ul>
  )
}
