"use client"

// Next
import { useRouter } from "next/navigation"

// UI
import { buttonVariants } from "@harness-monorepo/ui/components/button"
import { ProductTable } from "@harness-monorepo/ui/blocks/catalog/product-table"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { AppLink } from "@/components/app-link"
import {
  useDeleteProduct,
  useProductCategories,
  useProducts,
} from "@/services/catalog/catalog-hooks"

export interface ProductScreenProps {
  slug: string
  messages: UiMessages
}

/**
 * What a shopkeeper sells, as a list.
 *
 * It used to carry the form too, in a panel that opened above it. Writing a product means
 * uploading photographs and writing a description, and a form that big inside a list is a form a
 * click outside can throw away — so it moved to `products/new` and `products/<id>`, which are
 * addresses you can open in a tab and come back to.
 */
export function ProductScreen({ slug, messages }: ProductScreenProps) {
  const router = useRouter()
  const text = messages.catalog.products

  const products = useProducts(slug)
  const categories = useProductCategories(slug)
  const remove = useDeleteProduct(slug)

  const rows = products.data ?? []
  const nameById = new Map((categories.data ?? []).map((row) => [row.id, row.name]))

  function confirmDelete(productId: string) {
    const product = rows.find((row) => row.id === productId)
    if (!product) return
    if (!window.confirm(format(text.deleteConfirm, { name: product.name }))) return

    remove.mutate(productId)
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">{text.title}</h1>
          <p className="text-muted-foreground text-sm">{text.description}</p>
        </div>
        {/*
          A link and not a button: writing a product is a place, and a place has an address that
          can be opened in a tab, bookmarked and returned to.
        */}
        <AppLink href={`/admin/${slug}/products/new`} className={buttonVariants()}>
          {text.create}
        </AppLink>
      </header>

      {products.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <ProductTable
          products={rows.map((product) => ({
            id: product.id,
            name: product.name,
            sku: product.sku,
            priceCents: product.priceCents,
            compareAtPriceCents: product.compareAtPriceCents,
            imageUrl: product.images[0]?.url ?? null,
            categoryName: product.category
              ? (nameById.get(product.category.id) ?? product.category.name)
              : null,
            status: product.status,
            origin: product.origin,
            trackStock: product.trackStock,
            stockQuantity: product.stockQuantity,
          }))}
          onEdit={(productId) => router.push(`/admin/${slug}/products/${productId}`)}
          onDelete={confirmDelete}
          busyId={remove.isPending ? remove.variables : null}
          messages={messages}
        />
      )}
    </div>
  )
}
