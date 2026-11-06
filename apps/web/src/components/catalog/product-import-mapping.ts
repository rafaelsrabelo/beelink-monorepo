// UI
import { categoryKeyOf, NEW_CATEGORY, type ProductImportRow } from "@harness-monorepo/ui/blocks/catalog/product-import-review"
import { centsFrom, reaisFrom } from "@harness-monorepo/ui/lib/money"

// Types
import type {
  ProductCategory,
  ProductImportDraft,
  ProductImportItemPayload,
  ProductImportPayload,
} from "@harness-monorepo/contracts"

/**
 * The drafts the reader answered, as rows of the review. A draft's category is matched to one of
 * the shop's by the segment the two names would share — case, accents and spaces aside — which is
 * the same key the API matches by before it creates one, so the review never offers to create a
 * category the import would then reuse.
 */
export function rowsFrom(drafts: readonly ProductImportDraft[], categories: readonly Pick<ProductCategory, "id" | "name">[]): ProductImportRow[] {
  const byKey = new Map(categories.map((category) => [categoryKeyOf(category.name), category.id]))

  return drafts.map((draft, index) => {
    const known = draft.categoryName ? byKey.get(categoryKeyOf(draft.categoryName)) : undefined
    const unknownName = draft.categoryName && !known ? draft.categoryName : null

    return {
      key: `draft-${index}`,
      include: true,
      name: draft.name,
      price: draft.priceCents === null ? "" : reaisFrom(draft.priceCents),
      categoryId: known ?? (unknownName ? NEW_CATEGORY : ""),
      newCategoryName: unknownName,
      description: draft.description,
      option: draft.option,
    }
  })
}

/**
 * The ticked rows, as the import takes them; null while one of them has no price the money
 * parser can read, which is the state the review already refuses to submit.
 */
export function payloadFrom(rows: readonly ProductImportRow[]): ProductImportPayload | null {
  const products: ProductImportItemPayload[] = []

  for (const row of rows) {
    if (!row.include) continue

    const priceCents = centsFrom(row.price)
    if (priceCents === null) return null

    products.push({
      name: row.name.trim(),
      description: row.description,
      priceCents,
      ...(row.categoryId === NEW_CATEGORY
        ? { newCategoryName: row.newCategoryName }
        : row.categoryId !== ""
          ? { categoryId: row.categoryId }
          : {}),
      option: row.option
        ? { name: row.option.name, values: row.option.values.map((value) => ({ name: value.name, priceCents: value.priceCents })) }
        : null,
    })
  }

  return products.length > 0 ? { products } : null
}
