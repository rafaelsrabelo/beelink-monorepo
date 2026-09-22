"use client"

// React
import { useEffect, useState } from "react"

// Next
import { useRouter, useSearchParams } from "next/navigation"

// UI
import { buttonVariants } from "@harness-monorepo/ui/components/button"
import { ProductTable } from "@harness-monorepo/ui/blocks/catalog/product-table"
import {
  EMPTY_PRODUCT_FILTERS,
  ProductToolbar,
  type ProductFilters,
} from "@harness-monorepo/ui/blocks/catalog/product-toolbar"
import { TablePager } from "@harness-monorepo/ui/blocks/catalog/table-pager"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { AppLink } from "@/components/app-link"
import { useDebouncedValue } from "@/services/addresses/use-debounced-value"
import {
  useDeleteProduct,
  useProductCategories,
  useProducts,
} from "@/services/catalog/catalog-hooks"

export interface ProductScreenProps {
  slug: string
  messages: UiMessages
}

/** A beat after the last keystroke. Long enough that typing a name is one request, not eleven. */
const SEARCH_DEBOUNCE_MS = 350

/** Reads the filters the address carries. The URL is the source of truth, not a copy of state. */
function filtersFrom(params: URLSearchParams): ProductFilters {
  return {
    search: params.get("search") ?? "",
    status: (params.get("status") ?? "") as ProductFilters["status"],
    categoryId: params.get("categoryId") ?? "",
    origin: (params.get("origin") ?? "") as ProductFilters["origin"],
    stock: (params.get("stock") ?? "") as ProductFilters["stock"],
  }
}

/**
 * What a shopkeeper sells, as a table they can search, filter and page through.
 *
 * The filters live in the address rather than in component state. That is what makes a filtered
 * list a place: the back button undoes a filter, the view survives a reload, and "the products
 * with no stock" is a link that can be sent to someone. It also means the query the server answers
 * and the query the screen shows cannot drift apart, because there is only one of them.
 *
 * It used to carry the form too, in a panel that opened above it. Writing a product means
 * uploading photographs and writing a description, and a form that big inside a list is a form a
 * click outside can throw away — so it moved to `products/new` and `products/<id>`, which are
 * addresses you can open in a tab and come back to.
 */
export function ProductScreen({ slug, messages }: ProductScreenProps) {
  const router = useRouter()
  const params = useSearchParams()
  const text = messages.catalog.products

  const filters = filtersFrom(new URLSearchParams(params.toString()))
  const page = Math.max(Number(params.get("page") ?? 1) || 1, 1)

  // The search box is the one filter held locally as well: writing every keystroke to the address
  // would put a history entry behind each letter, and reading it back from there would make the
  // field lag a slow render. The address still wins — see the adjustment below.
  const [typed, setTyped] = useState(filters.search)
  const [lastSeen, setLastSeen] = useState(filters.search)

  if (filters.search !== lastSeen) {
    // The address changed from somewhere else — the back button, or a cleared filter. Adjusting
    // during render rather than in an effect: an effect would paint the stale text first.
    setLastSeen(filters.search)
    setTyped(filters.search)
  }

  const settled = useDebouncedValue(typed, SEARCH_DEBOUNCE_MS)

  useEffect(() => {
    // `settled === typed` is what keeps the back button working. Without it, arriving at an older
    // address leaves a debounce still holding the text that was in the box a moment ago, and the
    // first tick after the navigation writes that text straight back over the address.
    if (settled === typed && settled !== filters.search) apply({ ...filters, search: settled })
    // `apply` and `filters` are rebuilt every render; listing them would run this on every render.
    // What this effect is about is the search text settling, and those are the three values that
    // say whether it has.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settled, typed, filters.search])

  const products = useProducts(slug, {
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.origin ? { origin: filters.origin } : {}),
    ...(filters.stock ? { stock: filters.stock } : {}),
    page,
  })
  const categories = useProductCategories(slug)
  const remove = useDeleteProduct(slug)

  const rows = products.data?.products ?? []
  const total = products.data?.total ?? 0
  const pageSize = products.data?.pageSize ?? rows.length
  const nameById = new Map((categories.data ?? []).map((row) => [row.id, row.name]))
  const filtered = filters !== EMPTY_PRODUCT_FILTERS && Object.values(filters).some((value) => value !== "")

  /** Writes the filters into the address. Any change but the page itself returns to page one. */
  function apply(next: ProductFilters, nextPage = 1) {
    const search = new URLSearchParams()
    for (const [key, value] of Object.entries(next)) {
      if (value !== "") search.set(key, value)
    }
    if (nextPage > 1) search.set("page", String(nextPage))

    const query = search.toString()
    router.replace(`/admin/${slug}/products${query ? `?${query}` : ""}` as Parameters<typeof router.replace>[0])
  }

  function confirmDelete(productId: string) {
    const product = rows.find((row) => row.id === productId)
    if (!product) return
    if (!window.confirm(format(text.deleteConfirm, { name: product.name }))) return

    remove.mutate(productId, {
      // The last row of a page that is not the first leaves a page with nothing on it, and a pager
      // pointing at it. Stepping back is what the person was about to do anyway.
      onSuccess: () => {
        if (rows.length === 1 && page > 1) apply(filters, page - 1)
      },
    })
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

      <div className="flex flex-col gap-3">
        <ProductToolbar
          value={{ ...filters, search: typed }}
          onChange={(next) => {
            setTyped(next.search)

            // A select has no settling to wait for, and a filter that lags a third of a second
            // reads as a filter that broke — so only the typed box waits, in the effect above.
            if (next.search === typed) apply(next)
          }}
          categories={(categories.data ?? []).map((row) => ({ id: row.id, name: row.name }))}
          messages={messages}
        />

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
            {...(filtered
              ? { emptyTitle: text.filters.noResults, emptyHint: text.filters.noResultsHint }
              : {})}
            messages={messages}
          />
        )}

        <TablePager
          page={page}
          pageSize={pageSize}
          total={total}
          busy={products.isFetching}
          previousLabel={text.pager.previous}
          nextLabel={text.pager.next}
          rangeLabel={(from, to, count) =>
            format(text.pager.range, { from: String(from), to: String(to), total: String(count) })
          }
          onPageChange={(next) => apply(filters, next)}
        />
      </div>
    </div>
  )
}
