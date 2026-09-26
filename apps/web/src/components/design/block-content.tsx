"use client"

// Types
import type { ComponentDisplay, StoreComponent } from "@harness-monorepo/contracts"

// UI
import { ComponentContentFields } from "@harness-monorepo/ui/blocks/design/component-content-fields"
import type { ComponentFormValues, SlideTargetOption } from "@harness-monorepo/ui/blocks/design/component-content-fields"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { useProductCategories, useProducts } from "@/services/catalog/catalog-hooks"
import type { ImageUploadHandle } from "@/services/uploads/upload-hooks"
import { readsCatalog } from "./design-kinds"
import { emptyStateOf } from "./empty-state"
import { EmptyStateNote } from "./empty-state-note"

export interface BlockContentProps {
  slug: string
  component: StoreComponent
  value: ComponentFormValues
  onChange: (value: ComponentFormValues) => void
  /** How a banner's pictures sit, from the Layout tab: the hint under them follows it. */
  display: ComponentDisplay | null
  /** Held by the panel, whose Salvar waits for a picture on its way. */
  image: ImageUploadHandle
  /** How many categories the shop window shows, and whether this showcase's shelf came back empty. */
  categoriesShown: number
  shelfEmpty: boolean
  messages: UiMessages
}

/**
 * The Conteúdo tab: what the block says, and — above it — why the shop window draws nothing for
 * it, when it does not.
 *
 * Its own component because the panel had passed the line limit, and the seam falls here: the
 * categories and products a block points at are read only by what it says.
 */
export function BlockContent({
  slug,
  component,
  value,
  onChange,
  display,
  image,
  categoriesShown,
  shelfEmpty,
  messages,
}: BlockContentProps) {
  const points = readsCatalog(component.kind)
  const categories = useProductCategories(points ? slug : "")
  // The admin list's own ceiling (PRODUCTS_PAGE_SIZE_MAX): asking for more answers this many anyway.
  const products = useProducts(points ? slug : "", { pageSize: 96 })
  const optionsState =
    categories.isError || products.isError ? "failed" : categories.isPending || products.isPending ? "loading" : "ready"

  const page = products.data
  const onShelf = page?.products.filter((row) => row.status === "ACTIVE" && !row.soldOut).length ?? 0
  const empty = emptyStateOf(component.kind, {
    categoriesShown,
    categories: categories.data ?? null,
    products: page
      ? // Beyond the page loaded, a page with none on the shelf says nothing about the rest.
        { total: page.total, onShelf: onShelf > 0 || page.total <= page.products.length ? onShelf : null }
      : null,
    shelfEmpty,
  })

  const categoryOptions: SlideTargetOption[] = (categories.data ?? []).map((row) => ({ id: row.id, name: row.name }))
  const productOptions: SlideTargetOption[] = (page?.products ?? []).map((row) => ({ id: row.id, name: row.name }))

  return (
    <>
      {empty ? <EmptyStateNote state={empty} slug={slug} messages={messages} /> : null}
      <ComponentContentFields
        value={value}
        onChange={onChange}
        display={display}
        categories={categoryOptions}
        products={productOptions}
        optionsState={points ? optionsState : "ready"}
        onUploadImage={image.upload}
        imagePending={image.pending}
        // Minted here and not in the block: the design system has no clock and no randomness,
        // and an id it invented would be one two open tabs could invent twice.
        newItemId={() => crypto.randomUUID()}
        messages={messages}
      />
    </>
  )
}
