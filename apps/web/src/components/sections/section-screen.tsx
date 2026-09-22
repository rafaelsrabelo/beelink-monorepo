"use client"

// Next
// React
import { useState } from "react"

// Next
import { useRouter } from "next/navigation"

// Types
import type { HeroSlide, Section } from "@harness-monorepo/contracts"

// UI
import { SectionList } from "@harness-monorepo/ui/blocks/sections/section-list"
import { ConfirmDelete } from "@harness-monorepo/ui/blocks/shared/confirm-delete"
import { buttonVariants } from "@harness-monorepo/ui/components/button"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { AppLink } from "@/components/app-link"
import {
  useDeleteSection,
  useReorderSections,
  useSections,
  useUpdateSection,
} from "@/services/sections/section-hooks"
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
  const update = useUpdateSection(slug)

  // Banners, wherever they live: the ones at the top of the page and the ones in its body are the
  // same thing with the same form, and `kind` is only where it sits. The promises band, the
  // heading and the category grid are blocks the shopkeeper arranges in design mode and does not
  // create here — each wants its own fields, and one form that grew a branch per kind is the form
  // nobody can read.
  /*
    Every banner the shop has: the posters in the body, and each picture of the hero at the top.

    A hero's pictures are rows here although they are slides in the database, because this screen
    is where a shopkeeper manages banners and a picture they added has to be findable, editable and
    deletable — filtering the hero out left it visible in design mode and nowhere else, which is
    where it was reported.
  */
  const posters = (banners.data ?? []).filter((row) => row.kind === "BANNER")
  const hero = (banners.data ?? []).find((row) => row.kind === "HERO")
  const slides = (hero?.items ?? []) as HeroSlide[]
  const rows = posters

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

  /**
   * What is waiting to be deleted, and what to call it.
   *
   * State rather than a `window.confirm`, which is what this used to be. That dialog cannot be
   * styled or translated, and a browser that has offered "prevent this page from creating more
   * dialogs" stops showing it — after which the delete happens with nothing asked.
   */
  const [pendingDelete, setPendingDelete] = useState<{ id: string; slide: boolean; name: string } | null>(null)

  function runDelete() {
    if (!pendingDelete) return

    // A slide is not a row: deleting one is writing the hero's list without it.
    if (pendingDelete.slide && hero) {
      update.mutate(
        { sectionId: hero.id, payload: { items: slides.filter((one) => one.id !== pendingDelete.id) } },
        { onSuccess: () => setPendingDelete(null) },
      )
      return
    }

    remove.mutate(pendingDelete.id, { onSuccess: () => setPendingDelete(null) })
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
        <>
          {/*
            The hero's pictures, listed above the posters and named as what they are. They are
            slides in one block, not rows — the list draws them the same way because a shopkeeper
            manages a banner, and where it is stored is not their problem.
          */}
          {slides.length ? (
            <section className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold">{text.heroHeading}</h2>
              <SectionList
                banners={slides.map((slide) => ({
                  id: slide.id,
                  title: slide.title ?? "",
                  subtitle: slide.subtitle ?? null,
                  imageUrl: slide.imageUrl,
                  destination: slide.externalUrl ?? text.targetNone,
                  external: slide.target === "EXTERNAL",
                  layoutLabel: text.placementHero,
                  isActive: true,
                }))}
                onEdit={(slideId) =>
                  router.push(`/admin/${slug}/sections/${slideId}` as Parameters<typeof router.push>[0])
                }
                onDelete={(slideId) =>
                  setPendingDelete({
                    id: slideId,
                    slide: true,
                    name: slides.find((one) => one.id === slideId)?.title ?? "",
                  })
                }
                busyId={update.isPending ? (pendingDelete?.id ?? null) : null}
                messages={messages}
              />
            </section>
          ) : null}

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
          onDelete={(sectionId) =>
            setPendingDelete({
              id: sectionId,
              slide: false,
              name: rows.find((row) => row.id === sectionId)?.title ?? "",
            })
          }
          {...(rows.length > 1 ? { onMove: move } : {})}
          busyId={remove.isPending ? remove.variables : null}
          messages={messages}
          />
        </>
      )}

      <ConfirmDelete
        question={pendingDelete ? format(text.deleteConfirm, { name: pendingDelete.name }) : null}
        pending={remove.isPending || update.isPending}
        onConfirm={runDelete}
        onCancel={() => setPendingDelete(null)}
        messages={messages}
      />
    </div>
  )
}
