"use client"

// React
import { useState } from "react"

// Types
import type { Banner } from "@harness-monorepo/contracts"

// UI
import { BannerForm, EMPTY_BANNER, type BannerFormValues } from "@harness-monorepo/ui/blocks/banners/banner-form"
import { BannerList } from "@harness-monorepo/ui/blocks/banners/banner-list"
import { Button } from "@harness-monorepo/ui/components/button"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import {
  useBanners,
  useCreateBanner,
  useDeleteBanner,
  useReorderBanners,
  useUpdateBanner,
} from "@/services/banners/banner-hooks"
import { useProductCategories, useProducts } from "@/services/catalog/catalog-hooks"
import { useImageUpload } from "@/services/uploads/upload-hooks"

export interface BannerScreenProps {
  slug: string
  messages: UiMessages
}

/** Wire nulls become `""`, because a select and an input cannot hold null. */
function toForm(banner: Banner): BannerFormValues {
  return {
    title: banner.title,
    subtitle: banner.subtitle ?? "",
    imageUrl: banner.imageUrl,
    layout: banner.layout,
    target: banner.target,
    categorySlug: banner.categorySlug ?? "",
    productSlug: banner.productSlug ?? "",
    externalUrl: banner.externalUrl ?? "",
    isActive: banner.isActive,
  }
}

/**
 * Only the destination the target names is sent.
 *
 * The form holds all three so a shopkeeper who changes their mind does not lose what they picked;
 * the API keeps one and clears the others, and the database refuses the row if they disagree. So
 * the two the target does not name are dropped here rather than sent as empty strings, which the
 * API would read as "a destination that is blank" and reject.
 */
function toPayload(value: BannerFormValues) {
  return {
    title: value.title.trim(),
    subtitle: value.subtitle.trim() || null,
    imageUrl: value.imageUrl,
    layout: value.layout,
    target: value.target,
    categorySlug: value.target === "CATEGORY" ? value.categorySlug : null,
    productSlug: value.target === "PRODUCT" ? value.productSlug : null,
    externalUrl: value.target === "EXTERNAL" ? value.externalUrl.trim() : null,
    isActive: value.isActive,
  }
}

/**
 * The shop's posters.
 *
 * This is the screen the panel's home card points at, and it replaced the categories screen in that
 * role: a poster used to be a category with a shape marked on it, which could not point at one
 * product or out of the shop.
 */
export function BannerScreen({ slug, messages }: BannerScreenProps) {
  const text = messages.banners

  const banners = useBanners(slug)
  const categories = useProductCategories(slug)
  // One page is enough to choose from, and the ceiling is the API's. A shop past it picks the
  // product from a list that is missing some — which is a search box, and another ticket.
  const products = useProducts(slug, { pageSize: 96 })
  const image = useImageUpload()

  const create = useCreateBanner(slug)
  const update = useUpdateBanner(slug)
  const remove = useDeleteBanner(slug)
  const reorder = useReorderBanners(slug)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState<BannerFormValues>(EMPTY_BANNER)

  const rows = banners.data ?? []
  const layoutLabel = (layout: Banner["layout"]) =>
    layout === "HALVES" ? text.layoutHalves : layout === "THIRDS" ? text.layoutThirds : text.layoutFull

  /** A sentence, because "blusas" on its own does not say it is a category. */
  const destinationOf = (banner: Banner) => {
    if (banner.target === "EXTERNAL") return banner.externalUrl ?? ""

    if (banner.target === "CATEGORY") {
      const name = categories.data?.find((row) => row.slug === banner.categorySlug)?.name
      return `${text.targetCategory} · ${name ?? banner.categorySlug ?? ""}`
    }

    const name = products.data?.products.find((row) => row.slug === banner.productSlug)?.name
    return `${text.targetProduct} · ${name ?? banner.productSlug ?? ""}`
  }

  function startCreate() {
    setEditingId(null)
    setValue(EMPTY_BANNER)
    setOpen(true)
  }

  function startEdit(bannerId: string) {
    const banner = rows.find((row) => row.id === bannerId)
    if (!banner) return

    setEditingId(bannerId)
    setValue(toForm(banner))
    setOpen(true)
  }

  function save() {
    const payload = toPayload(value)
    const done = { onSuccess: () => setOpen(false) }

    if (editingId) update.mutate({ bannerId: editingId, payload }, done)
    else create.mutate(payload, done)
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

  const pending = create.isPending || update.isPending

  return (
    <div className="flex w-full flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">{text.title}</h1>
          <p className="text-muted-foreground text-sm">{text.description}</p>
        </div>
        {open ? null : <Button onClick={startCreate}>{text.create}</Button>}
      </header>

      {open ? (
        <BannerForm
          value={value}
          onChange={setValue}
          categories={(categories.data ?? []).map((row) => ({ slug: row.slug, name: row.name }))}
          products={(products.data?.products ?? []).map((row) => ({ slug: row.slug, name: row.name }))}
          onUploadImage={image.upload}
          imagePending={image.pending}
          onSubmit={save}
          onCancel={() => setOpen(false)}
          pending={pending}
          messages={messages}
        />
      ) : null}

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
          onEdit={startEdit}
          onDelete={confirmDelete}
          {...(rows.length > 1 ? { onMove: move } : {})}
          busyId={remove.isPending ? remove.variables : reorder.isPending ? "" : null}
          messages={messages}
        />
      )}
    </div>
  )
}
