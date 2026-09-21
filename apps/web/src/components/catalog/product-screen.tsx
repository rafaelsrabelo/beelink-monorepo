"use client"

// React
import { useState } from "react"

// Types
import type { Product } from "@harness-monorepo/contracts"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { centsFrom, reaisFrom } from "@harness-monorepo/ui/lib/money"
import { ProductForm, type ProductFormValues } from "@harness-monorepo/ui/blocks/catalog/product-form"
import { ProductList } from "@harness-monorepo/ui/blocks/catalog/product-list"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import {
  useCreateProduct,
  useDeleteProduct,
  useProductCategories,
  useProducts,
  useUpdateProduct,
} from "@/services/catalog/catalog-hooks"
import { useImageUpload } from "@/services/uploads/upload-hooks"

/**
 * What the form's `errors` prop takes. Declared here rather than imported: the type lives in a `.ts`
 * beside the blocks, and `@harness-monorepo/ui/blocks/*` exports `.tsx` only. Structural typing
 * makes the two the same thing, and the form checks it at the call site.
 */
type FormIssues = Partial<Record<keyof ProductFormValues, { message?: string } | undefined>>

const EMPTY: ProductFormValues = {
  name: "",
  slug: "",
  description: "",
  price: "",
  compareAtPrice: "",
  categoryId: "",
  isAvailable: true,
  imageUrls: [],
}

function toForm(product: Product): ProductFormValues {
  return {
    name: product.name,
    slug: product.slug,
    description: product.description ?? "",
    price: reaisFrom(product.priceCents),
    compareAtPrice: reaisFrom(product.compareAtPriceCents),
    categoryId: product.category?.id ?? "",
    isAvailable: product.isAvailable,
    imageUrls: product.images.map((image) => image.url),
  }
}

export interface ProductScreenProps {
  slug: string
  /** The shop's own word for products, so the address the form shows is the real one. */
  productsWord: string
  messages: UiMessages
}

/**
 * Where a shopkeeper puts what they sell.
 *
 * The price crosses from reais to whole cents here and nowhere else — `money.ts` does the reading,
 * and this screen refuses what it could not read rather than sending a zero. The legacy's version
 * of this guessed, and a product could be sold for a hundredth of its price.
 */
export function ProductScreen({ slug, productsWord, messages }: ProductScreenProps) {
  const text = messages.catalog.products

  const products = useProducts(slug)
  const categories = useProductCategories(slug)
  const create = useCreateProduct(slug)
  const update = useUpdateProduct(slug)
  const remove = useDeleteProduct(slug)
  const image = useImageUpload()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState<ProductFormValues>(EMPTY)
  const [errors, setErrors] = useState<FormIssues>({})

  const rows = products.data ?? []
  const categoryRows = categories.data ?? []
  const nameById = new Map(categoryRows.map((row) => [row.id, row.name]))
  const bySlug = new Map(categoryRows.map((row) => [row.slug, row]))

  const options = categoryRows.map((row) => ({
    id: row.id,
    name: row.name,
    parentName: row.parentSlug ? (bySlug.get(row.parentSlug)?.name ?? null) : null,
  }))

  const pending = create.isPending || update.isPending

  function openNew() {
    setEditingId(null)
    setValue(EMPTY)
    setErrors({})
    setOpen(true)
  }

  function openEdit(productId: string) {
    const product = rows.find((row) => row.id === productId)
    if (!product) return

    setEditingId(productId)
    setValue(toForm(product))
    setErrors({})
    setOpen(true)
  }

  function save() {
    const priceCents = centsFrom(value.price)
    const compareCents = value.compareAtPrice.trim() ? centsFrom(value.compareAtPrice) : null

    // Refused here and not sent as a zero. A price the field could not read is a typo the
    // shopkeeper can fix in a second; a zero is a product given away.
    const next: FormIssues = {}
    if (priceCents === null || priceCents <= 0) next.price = { message: text.priceInvalid }
    if (value.compareAtPrice.trim() && (compareCents === null || compareCents <= (priceCents ?? 0))) {
      next.compareAtPrice = { message: text.compareInvalid }
    }

    setErrors(next)
    if (Object.keys(next).length) return

    const payload = {
      name: value.name.trim(),
      slug: value.slug.trim() || undefined,
      description: value.description.trim() || null,
      priceCents: priceCents as number,
      compareAtPriceCents: compareCents,
      categoryId: value.categoryId || null,
      isAvailable: value.isAvailable,
      images: value.imageUrls.map((url) => ({ url })),
    }

    const done = () => {
      setOpen(false)
      setEditingId(null)
      setValue(EMPTY)
    }

    if (editingId) update.mutate({ productId: editingId, payload }, { onSuccess: done })
    else create.mutate(payload, { onSuccess: done })
  }

  function confirmDelete(productId: string) {
    const product = rows.find((row) => row.id === productId)
    if (!product) return

    if (!window.confirm(format(text.deleteConfirm, { name: product.name }))) return

    remove.mutate(productId, {
      onSuccess: () => {
        if (editingId === productId) {
          setOpen(false)
          setEditingId(null)
        }
      },
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 lg:px-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">{text.title}</h1>
          <p className="text-muted-foreground text-sm">{text.description}</p>
        </div>
        {open ? null : <Button onClick={openNew}>{text.create}</Button>}
      </header>

      {open ? (
        <section className="rounded-xl border p-4 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold">{editingId ? text.edit : text.create}</h2>
          <ProductForm
            value={value}
            onChange={setValue}
            categories={options}
            shopSlug={slug}
            productsWord={productsWord}
            errors={errors}
            onUploadImage={image.upload}
            imagePending={image.pending}
            onSubmit={save}
            onCancel={() => {
              setOpen(false)
              setEditingId(null)
            }}
            pending={pending}
            messages={messages}
          />
        </section>
      ) : null}

      {products.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <ProductList
          products={rows.map((product) => ({
            id: product.id,
            name: product.name,
            priceCents: product.priceCents,
            compareAtPriceCents: product.compareAtPriceCents,
            imageUrl: product.images[0]?.url ?? null,
            categoryName: product.category ? (nameById.get(product.category.id) ?? product.category.name) : null,
            isAvailable: product.isAvailable,
          }))}
          onEdit={openEdit}
          onDelete={confirmDelete}
          busyId={remove.isPending ? remove.variables : null}
          messages={messages}
        />
      )}
    </div>
  )
}
