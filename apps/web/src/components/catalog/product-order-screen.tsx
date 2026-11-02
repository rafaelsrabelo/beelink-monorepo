"use client"

// React
import { useState } from "react"

// Next
import { useRouter, useSearchParams } from "next/navigation"

// Libs
import { LayoutGridIcon, ListIcon } from "lucide-react"

// UI
import { ProductOrderFooter } from "@harness-monorepo/ui/blocks/catalog/product-order-footer"
import { ProductOrderList } from "@harness-monorepo/ui/blocks/catalog/product-order-list"
import { ProductOrderShelf } from "@harness-monorepo/ui/blocks/catalog/product-order-shelf"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@harness-monorepo/ui/components/toggle-group"
import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"
import { cn } from "@harness-monorepo/ui/lib/utils"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Types
import type { WebMessages } from "@/locales"

// App
import { AppLink } from "@/components/app-link"
import { InertLink } from "@/components/design/inert-link"
import { useLeaveGuard } from "@/components/design/use-leave-guard"
import { figtree, shopFontStyle } from "@/components/storefront/shop-font"
import { storeErrorCopy } from "@/components/store/store-error-copy"
import { useReorderProducts, useWholeProductList } from "@/services/catalog/catalog-hooks"
import { useStore } from "@/services/stores/store-hooks"
import { reconciledOrder, sameOrder } from "./product-order"

export interface ProductOrderScreenProps {
  slug: string
  ui: UiMessages
  web: WebMessages
}

/** Below this there is no order to choose. */
const FEWEST_TO_ORDER = 2

const SHELF = "shelf"

/** The toggle's own pressed state is a tint this surface all but hides, and here it says which view is on. */
const VIEW_ON = "aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary aria-pressed:hover:text-primary-foreground"

/**
 * The order the shop window shows the products in, on a page of its own and not as a drag in the
 * list: the list is paged and filtered, and an order only means something among all the products.
 *
 * Saved with a button, because each save rewrites every product's position and drops the shop's
 * cached catalogue: moved one at a time, ten moves would be ten of each, with the shop changing
 * under its visitors halfway through.
 *
 * The state is only the ids the shopkeeper arranged, read over the list as the API has it. A refetch
 * that changes the list therefore changes the screen without losing the arrangement, and the two
 * views draw that one arrangement, so changing view loses nothing either. Which view is in the
 * address, so a reload or a shared link opens the same one.
 */
export function ProductOrderScreen({ slug, ui, web }: ProductOrderScreenProps) {
  const text = ui.catalog.products.order
  const router = useRouter()
  const shelf = useSearchParams().get("view") === SHELF
  const products = useWholeProductList(slug)
  const store = useStore(slug)
  const save = useReorderProducts(slug)
  const [draft, setDraft] = useState<readonly string[] | null>(null)

  const rows = products.data ?? []
  const saved = rows.map((row) => row.id)
  const order = draft ? reconciledOrder(draft, saved) : saved
  const dirty = !sameOrder(order, saved)
  const guard = useLeaveGuard(dirty)
  const byId = new Map(rows.map((row) => [row.id, row]))
  const list = `/admin/${slug}/products`
  const here = `${list}/order`

  const items = order.flatMap((id) => {
    const row = byId.get(id)
    return row
      ? [{ id, name: row.name, slug: row.slug, priceCents: row.priceCents, compareAtPriceCents: row.compareAtPriceCents, imageUrl: row.images[0]?.url ?? null, status: row.status, soldOut: row.soldOut }]
      : []
  })

  /** A new arrangement answers whatever the last save said of the old one. */
  function arrange(next: readonly string[] | null) {
    setDraft(next)
    save.reset()
  }

  function show(next: string[]) {
    const chosen = next[0]
    if (!chosen) return
    router.replace((chosen === SHELF ? `${here}?view=${SHELF}` : here) as Parameters<typeof router.replace>[0], { scroll: false })
  }

  return (
    <div className={cn("flex w-full flex-col gap-6", shelf ? "max-w-6xl" : "max-w-3xl")}>
      <header className="flex flex-col gap-1">
        <AppLink href={list} onClick={guard.onLeave} className="text-muted-foreground w-fit text-sm hover:underline">
          ← {text.back}
        </AppLink>
        <h1 className="text-2xl font-semibold">{text.title}</h1>
        <p className="text-muted-foreground text-sm">{text.description}</p>
        <p className="text-muted-foreground text-xs">{text.scope}</p>
      </header>

      {products.isPending || (shelf && store.isPending) ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : products.isError ? (
        <p role="alert" className="text-destructive text-sm">
          {storeErrorCopy(products.error, web)}
        </p>
      ) : rows.length < FEWEST_TO_ORDER ? (
        <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed py-12 text-center">
          <p className="font-medium">{text.empty}</p>
          <p className="text-muted-foreground text-sm">{text.emptyHint}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <ToggleGroup multiple={false} aria-label={text.viewLabel} variant="outline" value={[shelf ? SHELF : "list"]} onValueChange={show} className="w-fit">
            <ToggleGroupItem value="list" className={VIEW_ON}>
              <ListIcon aria-hidden="true" className="size-4" />
              {text.viewList}
            </ToggleGroupItem>
            <ToggleGroupItem value={SHELF} className={VIEW_ON}>
              <LayoutGridIcon aria-hidden="true" className="size-4" />
              {text.viewShelf}
            </ToggleGroupItem>
          </ToggleGroup>

          {shelf && store.data ? (
            // The shop's paint and typeface, here and nowhere else on the panel's page.
            <div
              data-shop-window=""
              style={{ ...shopFontStyle, ...shopPaletteStyle(store.data.colors), fontFamily: "var(--font-shop, inherit)" }}
              className={cn(figtree.variable, "border-shell-border rounded-xl border p-4")}
            >
              <ProductOrderShelf items={items} onReorder={arrange} linkComponent={InertLink} disabled={save.isPending} messages={ui} />
            </div>
          ) : (
            <ProductOrderList items={items} onReorder={arrange} disabled={save.isPending} messages={ui} />
          )}

          <ProductOrderFooter
            dirty={dirty}
            pending={save.isPending}
            saved={save.isSuccess}
            error={storeErrorCopy(save.error, web)}
            onSave={() => save.mutate(order, { onSuccess: () => setDraft(null) })}
            onUndo={() => arrange(null)}
            leaving={guard.asking}
            onStay={guard.stay}
            onLeave={guard.leave}
            messages={ui}
          />
        </div>
      )}
    </div>
  )
}
