"use client"

// React
import { useEffect, useState } from "react"

// Next
import { useRouter } from "next/navigation"

// UI
import { PRODUCT_CASHBACK_FIELD_ID } from "@harness-monorepo/ui/blocks/catalog/product-cashback-field"
import { ProductEditor } from "@harness-monorepo/ui/blocks/catalog/product-editor"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import { centsFrom } from "@harness-monorepo/ui/lib/money"
import { EMPTY_VARIATIONS, type VariationsValue } from "@harness-monorepo/ui/lib/variations"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Types
import type { WebMessages } from "@/locales"

// App
import { storeErrorCopy } from "@/components/store/store-error-copy"
import { useGivesCashbackByProduct } from "@/services/cashback/cashback-hooks"
import { useCreateProductCategory, useProduct, useProductCategories } from "@/services/catalog/catalog-hooks"
import { SaveProductError, useSaveProduct } from "@/services/catalog/use-save-product"
import { useStore } from "@/services/stores/store-hooks"
import { useImageUpload } from "@/services/uploads/upload-hooks"
import { cashbackRateOf, EMPTY_FORM, fieldsOf, perUnitOf, toForm, type FormIssues, type FormValues } from "./product-form-mapping"
import {
  hasCombinations,
  imagesPayloadOf,
  optionsPayloadOf,
  rekeyDraft,
  toVariationsDraft,
  variantsPayloadOf,
  variationIssuesOf,
} from "./variations-mapping"

export interface ProductEditorScreenProps {
  slug: string
  /** Absent means a product that does not exist yet. */
  productId?: string
  ui: UiMessages
  web: WebMessages
}

/**
 * One product, on its own page: loaded, saved, and then back to the list.
 *
 * The form and the variations are two drafts of one save. What was loaded is kept beside them, so
 * the page knows when something is unsaved: the footer says so, Cancel asks, and closing the tab
 * gets the browser's own warning.
 */
export function ProductEditorScreen({ slug, productId, ui, web }: ProductEditorScreenProps) {
  const router = useRouter()
  const store = useStore(slug)
  const categories = useProductCategories(slug)
  const existing = useProduct(slug, productId ?? "", { enabled: Boolean(productId) })
  const save = useSaveProduct(slug)
  const createCategory = useCreateProductCategory(slug)
  const image = useImageUpload()
  const byProduct = useGivesCashbackByProduct(slug)

  const [value, setValue] = useState<FormValues>(EMPTY_FORM)
  const [variations, setVariations] = useState<VariationsValue>(EMPTY_VARIATIONS)
  const [loaded, setLoaded] = useState({ value: EMPTY_FORM, variations: EMPTY_VARIATIONS })
  const [errors, setErrors] = useState<FormIssues>({})
  const [showIssues, setShowIssues] = useState(false)
  const [seeded, setSeeded] = useState<string | null>(null)
  /**
   * A product this screen created whose save then stopped at a later step. The screen stays where
   * it is, with the refusal and everything typed, and the next save updates this product.
   */
  const [created, setCreated] = useState<{ id: string; hasOptions: boolean } | null>(null)

  /*
    Seeded during render, once per product, and not in an effect: an effect runs after the empty
    form has painted, and the fields would visibly fill in a beat later. Keyed by id rather than by
    the object, so a background refetch of the same product does not overwrite what is being typed.
  */
  if (existing.data && seeded !== existing.data.id) {
    const form = toForm(existing.data)
    const draft = toVariationsDraft(existing.data, ui)
    setSeeded(existing.data.id)
    setValue(form)
    setVariations(draft)
    setLoaded({ value: form, variations: draft })
  }

  const dirty =
    JSON.stringify(value) !== JSON.stringify(loaded.value) ||
    JSON.stringify(variations) !== JSON.stringify(loaded.variations)

  useEffect(() => {
    if (!dirty) return
    // The browser writes its own wording here; the footer says it in ours.
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  const loading = Boolean(productId) && existing.isPending

  // The list's "Adicionar cashback" lands here with the field's id as the hash. The form is drawn
  // after the product is read, later than the browser looks for the anchor, so the field is found here.
  useEffect(() => {
    if (!byProduct || loading || window.location.hash !== `#${PRODUCT_CASHBACK_FIELD_ID}`) return
    document.getElementById(PRODUCT_CASHBACK_FIELD_ID)?.focus()
  }, [byProduct, loading])

  const list = `/admin/${slug}/products` as Parameters<typeof router.push>[0]
  const text = ui.catalog.products
  const base = { isActive: true, price: value.price, stock: value.stock, sku: value.sku, weight: value.weight }
  const combinations = hasCombinations(variations)
  const issues = variationIssuesOf(variations, base, ui)

  /** A refusal is of what was typed then: typing again answers it, rather than leave a corrected field marked. */
  function change(next: FormValues) {
    if (Object.keys(errors).length > 0) setErrors({})
    setValue(next)
  }

  function submit() {
    const priceCents = centsFrom(value.price)
    // With combinations the price is theirs, and each row is checked on its own.
    if (priceCents === null && !combinations) {
      setErrors({ price: { message: text.priceInvalid } })
      return
    }
    // Refused only where it is asked: hidden, the field holds what was loaded, which the API took once.
    if (byProduct && cashbackRateOf(value.cashback) === undefined) {
      setErrors({ cashback: { message: text.cashbackInvalid } })
      return
    }
    setErrors({})
    setShowIssues(true)
    if (issues.blocked) return

    save.mutate(
      {
        productId: productId ?? created?.id,
        fields: fieldsOf(value),
        perUnit: perUnitOf(value, priceCents ?? 0),
        hadOptions: created ? created.hasOptions : (existing.data?.options.length ?? 0) > 0,
        variations: {
          options: optionsPayloadOf(variations),
          variants: (saved) => variantsPayloadOf(variations, saved, base, value),
          images: (saved) => imagesPayloadOf(value.imageUrls, variations, saved),
          hasCombinations: combinations,
        },
      },
      {
        onSuccess: () => router.push(list),
        // Saved in part, then refused: stay here with the refusal and the draft, and save next time
        // onto what went through — the product it created, the options it named.
        onError: (error) => {
          if (!(error instanceof SaveProductError)) return
          setCreated({ id: error.saved.id, hasOptions: error.saved.options.length > 0 })
          if (error.optionsSaved) setVariations((draft) => rekeyDraft(draft, error.saved))
        },
      },
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  return (
    <div className="flex w-full max-w-5xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">{productId ? text.edit : text.create}</h1>

      <ProductEditor
        value={value}
        onChange={change}
        categories={(categories.data ?? []).map((category) => ({
          id: category.id,
          name: category.name,
          parentName: null,
        }))}
        shopSlug={slug}
        productsWord={store.data?.routeWords.products ?? "produtos"}
        errors={errors}
        error={storeErrorCopy(save.error ?? image.error, web)}
        onUploadImage={image.upload}
        imagePending={image.pending}
        onCreateCategory={async (name) => (await createCategory.mutateAsync({ name })).id}
        creatingCategory={createCategory.isPending}
        onSubmit={submit}
        onCancel={() => router.push(list)}
        pending={save.isPending}
        submitLabel={text.save}
        variations={{
          value: variations,
          onChange: setVariations,
          errors: showIssues ? issues : undefined,
        }}
        cashback={byProduct}
        dirty={dirty && !save.isSuccess}
        messages={ui}
      />
    </div>
  )
}
