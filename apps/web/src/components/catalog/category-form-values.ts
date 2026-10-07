// Types
import type { CreateProductCategoryPayload, ProductCategory } from "@harness-monorepo/contracts"

// UI
import type { CategoryFormValues } from "@harness-monorepo/ui/blocks/catalog/category-form"

export const EMPTY_CATEGORY: CategoryFormValues = {
  name: "",
  slug: "",
  description: "",
  imageUrl: "",
  bannerUrl: "",
  parentId: "",
  isActive: true,
}

/** The wire's nulls become the form's empty strings, which is the only shape an input can hold. */
export function categoryToForm(category: ProductCategory, parentId: string): CategoryFormValues {
  return {
    name: category.name,
    slug: category.slug,
    description: category.description ?? "",
    imageUrl: category.imageUrl ?? "",
    // The category's own, never its parent's: the form saves what it shows.
    bannerUrl: category.bannerUrl ?? "",
    parentId,
    isActive: category.isActive,
  }
}

/** And back: an empty string is "no value", which on the wire is null and not `""`. */
export function categoryToPayload(value: CategoryFormValues) {
  return {
    name: value.name.trim(),
    slug: value.slug.trim() || undefined,
    description: value.description.trim() || null,
    imageUrl: value.imageUrl.trim() || null,
    bannerUrl: value.bannerUrl.trim() || null,
    parentId: value.parentId || null,
    isActive: value.isActive,
  } satisfies CreateProductCategoryPayload
}
