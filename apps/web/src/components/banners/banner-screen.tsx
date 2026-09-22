"use client"

// Next
import { useRouter } from "next/navigation"

// Types
import type { Banner } from "@harness-monorepo/contracts"

// UI
import { BannerList } from "@harness-monorepo/ui/blocks/banners/banner-list"
import { buttonVariants } from "@harness-monorepo/ui/components/button"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { AppLink } from "@/components/app-link"
import { useBanners, useDeleteBanner, useReorderBanners } from "@/services/banners/banner-hooks"
import { useProductCategories, useProducts } from "@/services/catalog/catalog-hooks"

export interface BannerScreenProps {
  slug: string
  messages: UiMessages
}

/**
 * The shop's posters, as a list and nothing else.
 *
 * The form used to open above this list, and it moved out for the reason the product form did:
 * a banner means uploading a picture and choosing where it goes, and a form that size inside a
 * list is a form a click outside can throw away. `banners/new` and `banners/<id>` are addresses
 * that can be opened in a tab and returned to.
 */
export function BannerScreen({ slug, messages }: BannerScreenProps) {
  const router = useRouter()
  const text = messages.banners

  const banners = useBanners(slug)
  // Only to turn a slug into a name the shopkeeper recognises. The list says where each banner
  // goes, and "blusas" on its own does not say it is a category.
  const categories = useProductCategories(slug)
  const products = useProducts(slug, { pageSize: 96 })

  const remove = useDeleteBanner(slug)
  const reorder = useReorderBanners(slug)

  const rows = banners.data ?? []

  const layoutLabel = (layout: Banner["layout"]) =>
    layout === "HALVES" ? text.layoutHalves : layout === "THIRDS" ? text.layoutThirds : text.layoutFull

  const destinationOf = (banner: Banner) => {
    if (banner.target === "NONE") return text.targetNone
    if (banner.target === "EXTERNAL") return banner.externalUrl ?? ""

    if (banner.target === "CATEGORY") {
      const name = categories.data?.find((row) => row.slug === banner.categorySlug)?.name
      return `${text.targetCategory} · ${name ?? banner.categorySlug ?? ""}`
    }

    const name = products.data?.products.find((row) => row.slug === banner.productSlug)?.name
    return `${text.targetProduct} · ${name ?? banner.productSlug ?? ""}`
  }

  function confirmDelete(bannerId: string) {
    const banner = rows.find((row) => row.id === bannerId)
    if (!banner) return
    if (!window.confirm(format(text.deleteConfirm, { name: banner.title }))) return

    remove.mutate(bannerId)
  }

  /** Swaps two neighbours and sends the whole list, which is the only order the API accepts. */
  function move(bannerId: string, direction: -1 | 1) {
    const at = rows.findIndex((row) => row.id === bannerId)
    const to = at + direction
    if (at < 0 || to < 0 || to >= rows.length) return

    const ids = rows.map((row) => row.id)
    const [moved] = ids.splice(at, 1)
    if (moved) ids.splice(to, 0, moved)

    reorder.mutate(ids)
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">{text.title}</h1>
          <p className="text-muted-foreground text-sm">{text.description}</p>
        </div>
        {/* A link and not a button: making a banner is a place, and a place has an address. */}
        <AppLink href={`/admin/${slug}/banners/new`} className={buttonVariants()}>
          {text.create}
        </AppLink>
      </header>

      {banners.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <BannerList
          banners={rows.map((banner) => ({
            id: banner.id,
            title: banner.title,
            subtitle: banner.subtitle,
            imageUrl: banner.imageUrl,
            destination: destinationOf(banner),
            external: banner.target === "EXTERNAL",
            layoutLabel: layoutLabel(banner.layout),
            isActive: banner.isActive,
          }))}
          onEdit={(bannerId) => router.push(`/admin/${slug}/banners/${bannerId}` as Parameters<typeof router.push>[0])}
          onDelete={confirmDelete}
          {...(rows.length > 1 ? { onMove: move } : {})}
          busyId={remove.isPending ? remove.variables : null}
          messages={messages}
        />
      )}
    </div>
  )
}
