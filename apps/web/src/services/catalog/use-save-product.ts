// Libs
import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query"

// Types
import type { ProductDetail, ProductImagePayload, UpdateProductPayload } from "@harness-monorepo/contracts"

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
    /**
     * The gallery with what each photo is of, built from the saved options for the same reason as
     * the variants. It goes last, in place of the photos the first request would have carried.
     */
    images: (saved: ProductDetail) => ProductImagePayload[]
  }
}

/** A save that failed after the product was created: the screen must not create it twice. */
export class SaveProductError extends Error {
  constructor(
    readonly cause: unknown,
    /** The product as the last step that went through left it. */
    readonly saved: ProductDetail,
    /**
     * Whether the options were saved before the step that failed. Only then do `saved`'s options
     * answer the draft's: before that they are the ones the draft is replacing, and matching new
     * values to them by place would hand a new value the id of one that was removed.
     */
    readonly optionsSaved = false,
  ) {
    super("The product was saved, and a later step of the save was not")
  }

  get productId(): string {
    return this.saved.id
  }

  get errorCode(): string | undefined {
    return typeof this.cause === "object" && this.cause !== null && "errorCode" in this.cause
      ? String(this.cause.errorCode)
      : undefined
  }
}

/**
 * One press of "Salvar", which is up to four requests.
 *
 * The product's per-unit fields go with the product only while it sells one thing: once it has
 * options the API refuses them there, and they go to each variant instead, after the options are
 * saved and the new combinations have ids. A product whose last option is removed gets its price
 * back on the product, after the options have collapsed it to one variant.
 *
 * On the way through the options the photos go last, because a photo can name a value that has no
 * id until the options are saved. Sent first as well, they would replace a gallery whose marks the
 * last request then writes again — and a save stopped between the two would leave them off.
 */
export async function saveProduct(
  slug: string,
  { productId, fields, perUnit, hadOptions, variations }: SaveProductVariables,
): Promise<ProductDetail> {
  const sellsOne = !hadOptions
  const throughOptions = variations !== undefined && (variations.hasCombinations || hadOptions)
  // Undefined is left out of the body, so the first request leaves the gallery as it is. A product
  // being created still gets its photos, unmarked: if a later step fails it exists, and with them.
  const described: UpdateProductPayload = throughOptions && productId ? { ...fields, images: undefined } : fields

  let saved = productId
    ? await updateProduct(slug, productId, sellsOne ? { ...described, ...perUnit } : described)
    : await createProduct(slug, { ...described, ...perUnit } as Parameters<typeof createProduct>[1])

  if (!variations || !throughOptions) return saved

  let optionsSaved = false
  try {
    saved = await replaceProductOptions(slug, saved.id, variations.options)
    optionsSaved = true
    if (variations.hasCombinations) {
      saved = await updateProductVariants(slug, saved.id, { variants: variations.variants(saved) })
      saved = await updateProduct(slug, saved.id, { images: variations.images(saved) })
    } else {
      saved = await updateProduct(slug, saved.id, { ...perUnit, images: variations.images(saved) })
    }
    return saved
  } catch (error) {
    throw new SaveProductError(error, saved, optionsSaved)
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
