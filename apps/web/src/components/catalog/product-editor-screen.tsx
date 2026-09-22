"use client"

// React
import { useState } from "react"
import type { ComponentProps } from "react"

// Next
import { useRouter } from "next/navigation"

// Types
import type { Product } from "@harness-monorepo/contracts"

// UI
import { ProductEditor } from "@harness-monorepo/ui/blocks/catalog/product-editor"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import { centsFrom, reaisFrom } from "@harness-monorepo/ui/lib/money"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Types
import type { WebMessages } from "@/locales"

// App
import { storeErrorCopy } from "@/components/store/store-error-copy"
import {
  useCreateProduct,
  useCreateProductCategory,
  useProduct,
  useProductCategories,
  useUpdateProduct,
} from "@/services/catalog/catalog-hooks"
import { useStore } from "@/services/stores/store-hooks"
import { useImageUpload } from "@/services/uploads/upload-hooks"

/**
 * Read off the block rather than imported: `@harness-monorepo/ui/blocks/*` serves `.tsx`, so the
 * types beside a block are not reachable from here — and deriving them means this file cannot
 * drift from what the editor actually accepts.
 */
type FormValues = ComponentProps<typeof ProductEditor>["value"]
type FormIssues = NonNullable<ComponentProps<typeof ProductEditor>["errors"]>

/** What "new" looks like. It belongs to the screen: the design system has no empty product. */
const EMPTY: FormValues = {
  name: "",
  slug: "",
  description: "",
  price: "",
  compareAtPrice: "",
  cost: "",
  categoryId: "",
  isAvailable: true,
  imageUrls: [],
  sku: "",
  barcode: "",
  trackStock: false,
  stock: "",
  weight: "",
  length: "",
  width: "",
  height: "",
}

/** Centimetres as a person types them, millimetres on the wire. Null for an empty field. */
function millimetres(typed: string): number | null {
  const value = Number(typed.replace(",", "."))
  return typed.trim() && Number.isFinite(value) ? Math.round(value * 10) : null
}

function whole(typed: string): number | null {
  const value = Number(typed.replace(/\D/g, ""))
  return typed.trim() && Number.isFinite(value) ? value : null
}

function toForm(product: Product): FormValues {
  return {
    name: product.name,
    slug: product.slug,
    description: product.description ?? "",
    price: reaisFrom(product.priceCents),
    compareAtPrice: reaisFrom(product.compareAtPriceCents),
    cost: reaisFrom(product.costCents),
    categoryId: product.category?.id ?? "",
    isAvailable: product.isAvailable,
    imageUrls: product.images.map((image) => image.url),
    sku: product.sku ?? "",
    barcode: product.barcode ?? "",
    trackStock: product.trackStock,
    stock: product.stockQuantity === null ? "" : String(product.stockQuantity),
    weight: product.weightGrams === null ? "" : String(product.weightGrams),
    length: product.lengthMm === null ? "" : String(product.lengthMm / 10),
    width: product.widthMm === null ? "" : String(product.widthMm / 10),
    height: product.heightMm === null ? "" : String(product.heightMm / 10),
  }
}

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
 * It replaces a panel that opened above the list. A product has photographs to upload and a
 * description to write, and a form that big inside a list is a form a stray click can lose.
 */
export function ProductEditorScreen({ slug, productId, ui, web }: ProductEditorScreenProps) {
  const router = useRouter()
  const store = useStore(slug)
  const categories = useProductCategories(slug)
  const existing = useProduct(slug, productId ?? "", { enabled: Boolean(productId) })
  const create = useCreateProduct(slug)
  const update = useUpdateProduct(slug)
  const createCategory = useCreateProductCategory(slug)
  const image = useImageUpload()

  const [value, setValue] = useState<FormValues>(EMPTY)
  const [errors, setErrors] = useState<FormIssues>({})
  const [seeded, setSeeded] = useState<string | null>(null)

  /*
    Seeded during render, once per product, and not in an effect.

    An effect that calls setState runs *after* the browser has already painted the empty form, so
    the fields visibly fill in a beat later — and React's own rule against it is about the
    cascading render that causes. Adjusting state during render is the documented way to reset a
    form when what it is editing changes: React throws away this render and redoes it before
    anything reaches the screen.

    Keyed by id rather than by the object, so a background refetch that answers the same product
    does not overwrite what is being typed.
  */
  if (existing.data && seeded !== existing.data.id) {
    setSeeded(existing.data.id)
    setValue(toForm(existing.data))
  }

  const list = `/admin/${slug}/products`
  const text = ui.catalog.products
  const loading = Boolean(productId) && existing.isPending

  function submit() {
    const priceCents = centsFrom(value.price)
    if (priceCents === null) {
      setErrors({ price: { message: text.priceInvalid } })
      return
    }

    setErrors({})
    const payload = {
      name: value.name.trim(),
      slug: value.slug.trim() || undefined,
      description: value.description.trim() || null,
      priceCents,
      compareAtPriceCents: centsFrom(value.compareAtPrice),
      costCents: centsFrom(value.cost),
      categoryId: value.categoryId || null,
      isAvailable: value.isAvailable,
      sku: value.sku.trim() || null,
      barcode: value.barcode.trim() || null,
      trackStock: value.trackStock,
      stockQuantity: value.trackStock ? whole(value.stock) : null,
      weightGrams: whole(value.weight),
      lengthMm: millimetres(value.length),
      widthMm: millimetres(value.width),
      heightMm: millimetres(value.height),
      images: value.imageUrls.map((url: string) => ({ url })),
    }

    const done = { onSuccess: () => router.push(list as Parameters<typeof router.push>[0]) }
    if (productId) update.mutate({ productId, payload }, done)
    else create.mutate(payload, done)
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
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{productId ? text.edit : text.create}</h1>

      <ProductEditor
        value={value}
        onChange={setValue}
        categories={(categories.data ?? []).map((category) => ({
          id: category.id,
          name: category.name,
          parentName: null,
        }))}
        shopSlug={slug}
        productsWord={store.data?.routeWords.products ?? "produtos"}
        errors={errors}
        error={storeErrorCopy(create.error ?? update.error ?? image.error, web)}
        onUploadImage={image.upload}
        imagePending={image.pending}
        onCreateCategory={async (name) => (await createCategory.mutateAsync({ name })).id}
        creatingCategory={createCategory.isPending}
        onSubmit={submit}
        onCancel={() => router.push(list as Parameters<typeof router.push>[0])}
        pending={create.isPending || update.isPending}
        submitLabel={text.save}
        messages={ui}
      />
    </div>
  )
}
