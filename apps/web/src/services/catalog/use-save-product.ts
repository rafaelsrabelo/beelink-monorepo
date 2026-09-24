// Libs
import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query"

// Types
import type { ProductDetail, UpdateProductPayload } from "@harness-monorepo/contracts"

// App
import { catalogKeys } from "./catalog-hooks"
import { createProduct, replaceProductOptions, updateProduct, updateProductVariants } from "./catalog-requests"

export interface SaveProductVariables {
  /** Absent creates the product first. */
  productId?: string
  /** What describes the product, whatever its variations. */
  fields: UpdateProductPayload
  /** Price, stock, codes and box — for a product that sells one thing. */
  perUnit: UpdateProductPayload
  /** Whether the product had options when the editor opened it. */
  hadOptions: boolean
  /** The variations to save, or absent when the product has none and had none. */
  variations?: {
    options: Parameters<typeof replaceProductOptions>[2]
    /** Built from the saved options, because a new value has no id until they are saved. */
    variants: (saved: ProductDetail) => Parameters<typeof updateProductVariants>[2]["variants"]
    /** Whether the draft sells combinations, or goes back to one default variant. */
    hasCombinations: boolean
  }
}

/** A save that failed after the product was created: the screen must not create it twice. */
export class SaveProductError extends Error {
  constructor(
    readonly cause: unknown,
    readonly productId: string,
  ) {
    super("The product was saved, and a later step of the save was not")
  }

  get errorCode(): string | undefined {
    return typeof this.cause === "object" && this.cause !== null && "errorCode" in this.cause
      ? String(this.cause.errorCode)
      : undefined
  }
}

/**
 * One press of "Salvar", which is up to three requests.
 *
 * The product's per-unit fields go with the product only while it sells one thing: once it has
 * options the API refuses them there, and they go to each variant instead, after the options are
 * saved and the new combinations have ids. A product whose last option is removed gets its price
 * back on the product, after the options have collapsed it to one variant.
 */
export async function saveProduct(
  slug: string,
  { productId, fields, perUnit, hadOptions, variations }: SaveProductVariables,
): Promise<ProductDetail> {
  const sellsOne = !hadOptions
  let saved = productId
    ? await updateProduct(slug, productId, sellsOne ? { ...fields, ...perUnit } : fields)
    : await createProduct(slug, { ...fields, ...perUnit } as Parameters<typeof createProduct>[1])

  if (!variations || (!variations.hasCombinations && !hadOptions)) return saved

  try {
    saved = await replaceProductOptions(slug, saved.id, variations.options)
    saved = variations.hasCombinations
      ? await updateProductVariants(slug, saved.id, { variants: variations.variants(saved) })
      : await updateProduct(slug, saved.id, perUnit)
    return saved
  } catch (error) {
    throw new SaveProductError(error, saved.id)
  }
}

/** The editor's save, with the product lists refreshed whether it went through or not. */
export function useSaveProduct(slug: string): UseMutationResult<ProductDetail, Error, SaveProductVariables> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (variables: SaveProductVariables) => saveProduct(slug, variables),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: catalogKeys.products(slug) })
      queryClient.invalidateQueries({ queryKey: catalogKeys.categories(slug) })
    },
  })
}
