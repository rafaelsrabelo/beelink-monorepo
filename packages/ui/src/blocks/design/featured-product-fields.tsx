"use client"

// UI
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { OptionSearch } from "./option-search"
import type { ShowcasePick } from "./showcase-picks-field"
import type { TargetOption } from "./target-fields"

export interface FeaturedProductFieldsProps {
  /** The pick, as a showcase's: none yet, or one. */
  value: readonly ShowcasePick[]
  onChange: (next: ShowcasePick[]) => void
  products: readonly TargetOption[]
  newItemId: () => string
  optionsState?: "ready" | "loading" | "failed"
  /** What is typed, for a shop with more products than the list holds: the screen asks the API. */
  onQueryChange?: (query: string) => void
  messages?: UiMessages
}

/**
 * Which product is featured: one, searched for by name. The pick keeps its id when the product
 * changes, so the block is the same block with another product in it.
 *
 * A pick the list does not have — deleted, or past what was loaded — is said by name as unknown
 * rather than left blank: blank would read as "none chosen", and the block draws nothing either way.
 */
export function FeaturedProductFields({
  value,
  onChange,
  products,
  newItemId,
  optionsState = "ready",
  onQueryChange,
  messages = defaultMessages,
}: FeaturedProductFieldsProps) {
  const text = messages.design.featured
  const [pick] = value
  const known = pick ? products.find((product) => product.id === pick.productId)?.name : undefined
  // Unknown only once the list has arrived: while it loads, a pick is not yet "não encontrado".
  const waiting = pick && !known && optionsState === "loading"

  return (
    <>
      <p className="text-sm">
        <span className="text-muted-foreground">{text.chosen} </span>
        {waiting ? (
          <Skeleton className="inline-block h-4 w-32 align-middle" />
        ) : (
          <span className="font-medium">{pick ? (known ?? text.unknown) : text.none}</span>
        )}
      </p>
      <OptionSearch
        id="featured-product-search"
        label={text.search}
        placeholder={text.search}
        options={products}
        {...(pick ? { selectedId: pick.productId } : {})}
        emptyText={messages.design.showcase.searchEmpty}
        state={optionsState}
        {...(onQueryChange ? { onQueryChange } : {})}
        messages={messages}
        onPick={(productId) => onChange([{ id: pick?.id ?? newItemId(), productId }])}
      />
    </>
  )
}
