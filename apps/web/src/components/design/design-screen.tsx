"use client"

// React
import { useEffect, useState } from "react"

// Types
import type { PublicProductCard, PublicProductCategory, PublicStore } from "@harness-monorepo/contracts"

// UI
import { BannerArrangement } from "@harness-monorepo/ui/blocks/design/banner-arrangement"
import { Badge } from "@harness-monorepo/ui/components/badge"
import { Button } from "@harness-monorepo/ui/components/button"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { useBanners, useReorderBanners, useUpdateBanner } from "@/services/banners/banner-hooks"
import { DesignPreviewPane } from "./design-preview-pane"
import { applyOrder, changesOf, orderedIdsOf, toDraft, type Draft } from "./design-draft"

export interface DesignScreenProps {
  /**
   * The shop exactly as a visitor is served it, fetched by the page through the same functions the
   * storefront itself uses. It is not the owner's `Store`: that one carries an address the window
   * would then draw, and counts the shop window never shows.
   */
  store: PublicStore
  categories: readonly PublicProductCategory[]
  products: readonly PublicProductCard[]
  year: number
  messages: UiMessages
}

/**
 * The shop on the left, its posters arranged on the right.
 *
 * **The arrangement is a draft in this browser until Publish.** That is the owner's decision, and
 * it is not a breach of "server data never enters a store": what is held here is not what the
 * server has, it is what has not been sent yet. TanStack Query stays the owner of the saved
 * arrangement; this state owns the unsent edit, and no refetch may overwrite it.
 *
 * The cost is real and is warned about rather than hidden — a reload before publishing loses it.
 */
export function DesignScreen({ store, categories, products, year, messages }: DesignScreenProps) {
  const text = messages.design
  const slug = store.slug

  const banners = useBanners(slug)
  const reorder = useReorderBanners(slug)
  const update = useUpdateBanner(slug)

  const [draft, setDraft] = useState<Draft[] | null>(null)
  const [seeded, setSeeded] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)

  // Seeded once per server answer, and never re-seeded while the arrangement is dirty: a refetch
  // landing mid-edit would otherwise throw away what the owner is in the middle of doing.
  const serverKey = banners.data?.map((banner) => banner.id).join(",") ?? null
  if (banners.data && !dirty && seeded !== serverKey) {
    setSeeded(serverKey)
    setDraft(banners.data.map(toDraft))
  }

  useEffect(() => {
    if (!dirty) return

    // The browser writes its own wording here; `text.leaveWarning` is what the screen says.
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener("beforeunload", warn)

    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  const rows = draft ?? []
  const above = rows.filter((row) => !row.belowProducts)
  const below = rows.filter((row) => row.belowProducts)

  function edit(next: Draft[]) {
    setDraft(next)
    setDirty(true)
  }

  /** Back to what the server holds. The seed key is cleared so the next render re-reads it. */
  function discard() {
    setDirty(false)
    setSeeded(null)
    setDraft(banners.data ? banners.data.map(toDraft) : null)
  }

  function publish() {
    if (!banners.data) return

    const { ids, orderChanged, changed } = changesOf(rows, banners.data)

    Promise.all([
      ...(orderChanged ? [reorder.mutateAsync(ids)] : []),
      ...changed.map((row) =>
        update.mutateAsync({
          bannerId: row.id,
          payload: {
            layout: row.layout,
            isActive: row.isActive,
            belowProducts: row.belowProducts,
          },
        }),
      ),
    ])
      .then(() => {
        setDirty(false)
        setSeeded(null)
      })
      .catch(() => {
        // The mutation's own error state is what the screen would show; the draft is kept so
        // nothing the owner arranged is lost to a failed write.
      })
  }

  const publishing = reorder.isPending || update.isPending

  return (
    <div className="flex w-full flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">{text.title}</h1>
          <p className="text-muted-foreground text-sm">{text.description}</p>
        </div>

        <div className="flex items-center gap-2">
          {dirty ? <Badge variant="outline">{text.unpublished}</Badge> : null}
          {dirty ? (
            <Button type="button" variant="ghost" disabled={publishing} onClick={discard}>
              {text.discard}
            </Button>
          ) : null}
          <Button type="button" disabled={!dirty || publishing} onClick={publish}>
            {publishing ? text.publishing : text.publish}
          </Button>
        </div>
      </header>

      {dirty ? <p className="text-muted-foreground text-sm">{text.leaveWarning}</p> : null}

      <div className="flex flex-col gap-4 @4xl/main:flex-row">
        <DesignPreviewPane
          store={store}
          categories={categories}
          products={products}
          year={year}
          above={above}
          below={below}
          saved={banners.data ?? []}
          orderedIds={orderedIdsOf(rows)}
          onReorder={(ids) => edit(applyOrder(rows, ids))}
          messages={messages}
        />

        <aside className="flex w-full shrink-0 flex-col gap-3 @4xl/main:w-96">
          <p className="text-muted-foreground text-xs">{text.previewNotice}</p>
          {banners.isPending ? (
            <>
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </>
          ) : (
            <BannerArrangement
              items={above}
              itemsBelow={below}
              onReorder={(ids) => edit(applyOrder(rows, ids))}
              onToggle={(id, isActive) =>
                edit(rows.map((row) => (row.id === id ? { ...row, isActive } : row)))
              }
              onLayoutChange={(id, layout) =>
                edit(rows.map((row) => (row.id === id ? { ...row, layout } : row)))
              }
              messages={messages}
            />
          )}
        </aside>
      </div>
    </div>
  )
}
