"use client"

// React
import { useEffect, useState, type ComponentProps } from "react"

// Types
import type { Banner, PublicProductCard, PublicProductCategory, PublicStore } from "@harness-monorepo/contracts"

// UI
import {
  BannerArrangement,
  type ArrangementLayout,
} from "@harness-monorepo/ui/blocks/design/banner-arrangement"
import { DesignPreview } from "@harness-monorepo/ui/blocks/design/design-preview"
import { StorefrontProductRail } from "@harness-monorepo/ui/blocks/storefront/storefront-product-rail"
import { StorefrontShowcase } from "@harness-monorepo/ui/blocks/storefront/storefront-showcase"
import { Badge } from "@harness-monorepo/ui/components/badge"
import { Button } from "@harness-monorepo/ui/components/button"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { StorefrontFrame } from "@/components/storefront/storefront-frame"
import { useBanners, useReorderBanners, useUpdateBanner } from "@/services/banners/banner-hooks"
import { storefrontRoutes } from "@/lib/storefront-routes"

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

/** One banner as the editor holds it while it is being arranged. */
interface Draft {
  id: string
  title: string
  imageUrl: string
  layout: ArrangementLayout
  isActive: boolean
}

/** An anchor with no `href` navigates nowhere and takes no tab stop. */
function InertLink({ href: _href, ...props }: ComponentProps<"a"> & { href: string }) {
  return <a {...props} />
}

function toDraft(banner: Banner): Draft {
  return {
    id: banner.id,
    title: banner.title,
    imageUrl: banner.imageUrl,
    layout: banner.layout,
    isActive: banner.isActive,
  }
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
  const byId = new Map((banners.data ?? []).map((banner) => [banner.id, banner]))
  const routes = storefrontRoutes(store)

  /**
   * The address of a poster, rebuilt here.
   *
   * It is a second implementation of what the API does in `banners.mapper.ts`, and it is on
   * purpose: the preview draws the *draft*, which the server has not seen, so there is no answer
   * to read a resolved href out of. It goes through `storefrontRoutes` — the one module in this
   * app allowed to spell a storefront segment — so the two cannot disagree about the shape of an
   * address, only ever about a slug that changed between them.
   */
  function hrefOf(banner: Banner): string | undefined {
    if (banner.target === "CATEGORY" && banner.categorySlug) return routes.category(banner.categorySlug)
    if (banner.target === "PRODUCT" && banner.productSlug) return routes.product(banner.productSlug)
    if (banner.target === "EXTERNAL" && banner.externalUrl) return banner.externalUrl

    return undefined
  }

  const showcases = rows
    .filter((row) => row.isActive)
    .map((row) => {
      const banner = byId.get(row.id)

      return {
        id: row.id,
        title: row.title,
        subtitle: banner?.subtitle ?? null,
        imageUrl: row.imageUrl,
        layout: row.layout,
        ...(banner ? { href: hrefOf(banner), external: banner.target === "EXTERNAL" } : {}),
      }
    })

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

    // The order goes as the whole list, because the API refuses anything less — a partial one
    // leaves the rows it omits holding positions that now collide.
    const ids = rows.map((row) => row.id)
    const orderChanged = banners.data.some((banner, at) => banner.id !== ids[at])

    // One patch per banner whose size or visibility moved, and none for the ones that did not:
    // a write per row would touch `updatedAt` on posters nobody edited.
    const changed = rows.filter((row) => {
      const saved = byId.get(row.id)
      return saved && (saved.layout !== row.layout || saved.isActive !== row.isActive)
    })

    Promise.all([
      ...(orderChanged ? [reorder.mutateAsync(ids)] : []),
      ...changed.map((row) =>
        update.mutateAsync({ bannerId: row.id, payload: { layout: row.layout, isActive: row.isActive } }),
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
        {/*
          Nothing in the preview navigates. The inert link component covers what the blocks inject;
          the capture handlers cover the three anchors and the one form that bypass it — the
          WhatsApp button, the social icons and the search. Together they also catch a middle
          click and an Enter inside the form.
        */}
        <div
          className="border-shell-border min-w-0 flex-1 overflow-hidden rounded-xl border"
          onClickCapture={(event) => event.preventDefault()}
          onSubmitCapture={(event) => event.preventDefault()}
        >
          <DesignPreview>
            <StorefrontFrame
              store={store}
              categories={categories}
              year={year}
              showBanner
              showHighlights
              searchSlot={null}
              linkComponent={InertLink}
              messages={messages}
            >
              <StorefrontShowcase items={showcases} linkComponent={InertLink} />
              <StorefrontProductRail
                products={products}
                productHref={routes.product}
                title={messages.storefront.catalogTitle}
                seeAllHref={routes.catalog()}
                locale="pt-BR"
                linkComponent={InertLink}
                messages={messages}
              />
            </StorefrontFrame>
          </DesignPreview>
        </div>

        <aside className="flex w-full shrink-0 flex-col gap-3 @4xl/main:w-96">
          <p className="text-muted-foreground text-xs">{text.previewNotice}</p>
          {banners.isPending ? (
            <>
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </>
          ) : (
            <BannerArrangement
              items={rows}
              onReorder={(ids) => edit(ids.map((id) => rows.find((row) => row.id === id)).filter((row) => !!row))}
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
