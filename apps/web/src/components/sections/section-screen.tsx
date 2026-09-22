"use client"

// Next
import { useRouter } from "next/navigation"

// Types
import type { Section } from "@harness-monorepo/contracts"

// UI
import { SectionList } from "@harness-monorepo/ui/blocks/sections/section-list"
import { buttonVariants } from "@harness-monorepo/ui/components/button"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { AppLink } from "@/components/app-link"
import { useSections, useDeleteSection, useReorderSections } from "@/services/sections/section-hooks"
import { useProductCategories, useProducts } from "@/services/catalog/catalog-hooks"

export interface SectionScreenProps {
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
export function SectionScreen({ slug, messages }: SectionScreenProps) {
  const router = useRouter()
  const text = messages.banners

  const banners = useSections(slug)
  // Only to turn a slug into a name the shopkeeper recognises. The list says where each banner
  // goes, and "blusas" on its own does not say it is a category.
  const categories = useProductCategories(slug)
  const products = useProducts(slug, { pageSize: 96 })

  const remove = useDeleteSection(slug)
  const reorder = useReorderSections(slug)

  // Posters only, for now. The other four kinds are blocks the shopkeeper arranges in design mode
  // and does not create here; each wants its own form, and one that grew a branch per kind is the
  // form nobody can read.
  const rows = (banners.data ?? []).filter((row) => row.kind === "BANNER")

  const layoutLabel = (layout: Section["layout"]) =>
    layout === "HALVES" ? text.layoutHalves : layout === "THIRDS" ? text.layoutThirds : text.layoutFull

  const destinationOf = (banner: Section) => {
    if (banner.target === "NONE") return text.targetNone
    if (banner.target === "EXTERNAL") return banner.externalUrl ?? ""

    if (banner.target === "CATEGORY") {
      const name = categories.data?.find((row) => row.slug === banner.categorySlug)?.name
      return `${text.targetCategory} · ${name ?? banner.categorySlug ?? ""}`
    }

    const name = products.data?.products.find((row) => row.slug === banner.productSlug)?.name
    return `${text.targetProduct} · ${name ?? banner.productSlug ?? ""}`
  }

  function confirmDelete(sectionId: string) {
    const banner = rows.find((row) => row.id === sectionId)
    if (!banner) return
    if (!window.confirm(format(text.deleteConfirm, { name: banner.title ?? "" }))) return

    remove.mutate(sectionId)
  }

  /** Swaps two neighbours and sends the whole list, which is the only order the API accepts. */
  function move(sectionId: string, direction: -1 | 1) {
    const at = rows.findIndex((row) => row.id === sectionId)
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
        <div className="flex items-center gap-2">
          {/* Where a banner is arranged, said on the screen where one is made: the order and the
              size are not decided here, and a shopkeeper who does not know that looks for them. */}
          <AppLink href={`/admin/${slug}/design`} className={buttonVariants({ variant: "outline" })}>
            {messages.design.title}
          </AppLink>
          {/* A link and not a button: making a banner is a place, and a place has an address. */}
          <AppLink href={`/admin/${slug}/sections/new`} className={buttonVariants()}>
            {text.create}
          </AppLink>
        </div>
      </header>

      {banners.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <SectionList
          banners={rows.map((banner) => ({
            id: banner.id,
            // A poster always has both — the form requires them — but the column they live in is
            // nullable now, because three of the five kinds have neither.
            title: banner.title ?? "",
            subtitle: banner.subtitle,
            imageUrl: banner.imageUrl ?? "",
            destination: destinationOf(banner),
            external: banner.target === "EXTERNAL",
            layoutLabel: layoutLabel(banner.layout),
            isActive: banner.isActive,
          }))}
          onEdit={(sectionId) => router.push(`/admin/${slug}/sections/${sectionId}` as Parameters<typeof router.push>[0])}
          onDelete={confirmDelete}
          {...(rows.length > 1 ? { onMove: move } : {})}
          busyId={remove.isPending ? remove.variables : null}
          messages={messages}
        />
      )}
    </div>
  )
}
