"use client"

// React
import { useState } from "react"

// Next
import { useRouter } from "next/navigation"

// Types
import type { CreateSectionPayload, HeroSlide, Section } from "@harness-monorepo/contracts"

// UI
import {
  SectionForm,
  EMPTY_BANNER,
  type SectionFormValues,
  type SectionFormWidth,
} from "@harness-monorepo/ui/blocks/sections/section-form"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { useSections, useCreateSection, useUpdateSection } from "@/services/sections/section-hooks"
import { useProductCategories, useProducts } from "@/services/catalog/catalog-hooks"
import { useImageUpload } from "@/services/uploads/upload-hooks"

export interface SectionEditorScreenProps {
  slug: string
  /** Absent means a banner that does not exist yet. */
  sectionId?: string
  messages: UiMessages
}

/**
 * A slide of the hero, as this form holds it.
 *
 * Its own mapping and not `toForm`'s, because a slide keeps its picture, its words and its
 * destination in itself — the block above it keeps none of them. Reading a slide through the
 * block's own columns gave a form with no picture and no title beside a page that had both, which
 * is how this was reported.
 *
 * The destination arrives as an id and the form speaks in slugs, so the two lists it was loaded
 * with are what translate. A slide pointing at something that has since been deleted comes back
 * with no destination rather than with a stale one.
 */
function slideToForm(
  slide: HeroSlide,
  width: SectionFormWidth,
  categories: readonly { id: string; slug: string }[],
  products: readonly { id: string; slug: string }[],
): SectionFormValues {
  return {
    placement: "HERO",
    width,
    title: slide.title ?? "",
    subtitle: slide.subtitle ?? "",
    imageUrl: slide.imageUrl,
    layout: "FULL",
    target: slide.target,
    categorySlug: categories.find((row) => row.id === slide.categoryId)?.slug ?? "",
    productSlug: products.find((row) => row.id === slide.productId)?.slug ?? "",
    externalUrl: slide.externalUrl ?? "",
    // A slide has no visibility of its own: the hero is shown or hidden as one block.
    isActive: true,
  }
}

/** Wire nulls become `""`, because a select and an input cannot hold null. */
function toForm(banner: Section): SectionFormValues {
  return {
    // The kind IS where it lives. The form asks the question in the shopkeeper's words — top of
    // the page, or body — and the screen turns the answer back into the kind.
    placement: banner.kind === "HERO" ? "HERO" : "BANNER",
    width: banner.width,
    title: banner.title ?? "",
    subtitle: banner.subtitle ?? "",
    imageUrl: banner.imageUrl ?? "",
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
 * the API keeps one and clears the others, and the database refuses the row if they disagree. The
 * two the target does not name go as null rather than as empty strings, which the API would read
 * as "a destination that is blank" and reject.
 */
function toPayload(value: SectionFormValues): CreateSectionPayload {
  return {
    // This screen writes banners, and where one lives is the kind it is. The promises band, the
    // heading and the category grid are blocks too, but each wants different fields — one form
    // that grew a branch per kind is the form nobody can read. They arrive with their own screens.
    kind: value.placement,
    width: value.width,
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
 * Writing one banner, at its own address.
 *
 * It reads the shop's whole list rather than one banner: there is no by-id endpoint, and adding
 * one to serve a screen that already has the list in cache would be a round trip bought for
 * nothing. The list is the shop's posters — tens of rows, never thousands.
 */
export function SectionEditorScreen({ slug, sectionId, messages }: SectionEditorScreenProps) {
  const router = useRouter()
  const text = messages.banners

  const banners = useSections(slug)
  const categories = useProductCategories(slug)
  const products = useProducts(slug, { pageSize: 96 })
  const image = useImageUpload()

  const create = useCreateSection(slug)
  const update = useUpdateSection(slug)

  const [value, setValue] = useState<SectionFormValues>(EMPTY_BANNER)
  const [seeded, setSeeded] = useState<string | null>(null)

  /*
    What is being edited: a poster of its own, or one picture of the hero.

    The address carries an id and says nothing about which, so both lists are searched. A slide's
    id is not a section's — treating it as one found the hero block and read its columns, which
    are empty now that a hero's picture lives in its slides.
  */
  const existing = sectionId ? banners.data?.find((row) => row.id === sectionId) : undefined
  const hero = banners.data?.find((row) => row.kind === "HERO")
  const editingSlide =
    sectionId && existing?.kind !== "BANNER"
      ? ((hero?.items ?? []) as HeroSlide[]).find((slide) => slide.id === sectionId)
      : undefined

  // Adjusted during render rather than in an effect: an effect would paint the empty form first,
  // and a form that fills in a beat later is a form somebody has already started typing into.
  if (editingSlide && seeded !== editingSlide.id) {
    setSeeded(editingSlide.id)
    setValue(
      slideToForm(
        editingSlide,
        hero?.width ?? "FULL",
        categories.data ?? [],
        products.data?.products ?? [],
      ),
    )
  } else if (existing && existing.kind === "BANNER" && seeded !== existing.id) {
    setSeeded(existing.id)
    setValue(toForm(existing))
  }

  const list = `/admin/${slug}/sections`
  const back = () => router.push(list as Parameters<typeof router.push>[0])

  /**
   * A slide, built from the same fields a poster uses.
   *
   * The target travels as an **id** here and as a slug everywhere else, and that is the one place
   * this form has to translate. A slide lives in JSON, so there is no foreign key to hang the slug
   * resolution off — the API looks the id up on the way out, which is what keeps a slide pointing
   * at a category that gets renamed.
   */
  function toSlide(): HeroSlide {
    const category = categories.data?.find((row) => row.slug === value.categorySlug)
    const product = products.data?.products.find((row) => row.slug === value.productSlug)

    return {
      // The slide being edited keeps its id, so saving replaces it rather than adding a second.
      id: editingSlide?.id ?? crypto.randomUUID(),
      imageUrl: value.imageUrl,
      title: value.title.trim() || null,
      subtitle: value.subtitle.trim() || null,
      target: value.target,
      categoryId: value.target === "CATEGORY" ? (category?.id ?? null) : null,
      productId: value.target === "PRODUCT" ? (product?.id ?? null) : null,
      externalUrl: value.target === "EXTERNAL" ? value.externalUrl.trim() : null,
    }
  }

  /**
   * Saving a top banner adds a picture to the shop's hero, rather than making a second one.
   *
   * This is the shopkeeper's own model, and they were right about it: a carousel is one block
   * holding several pictures. It used to be several blocks standing next to each other, and making
   * one meant creating two banners and hoping they stayed adjacent — confusing to do, and
   * confusing to read in a list that showed two entries for one thing on the page.
   */
  function save() {
    const done = { onSuccess: back }

    if (value.placement === "HERO") {
      const slide = toSlide()

      if (!hero) {
        create.mutate({ kind: "HERO", width: value.width, items: [slide] }, done)
        return
      }

      // Replaced where it stands, never removed and re-appended: editing a picture is not
      // reordering the carousel, and a shopkeeper who fixed a typo should not find the slide at
      // the end of it.
      const current = (hero.items as HeroSlide[]) ?? []
      const items = current.some((one) => one.id === slide.id)
        ? current.map((one) => (one.id === slide.id ? slide : one))
        : [...current, slide]

      update.mutate({ sectionId: hero.id, payload: { width: value.width, items } }, done)
      return
    }

    const payload = toPayload(value)

    if (sectionId) update.mutate({ sectionId, payload }, done)
    else create.mutate(payload, done)
  }

  if (sectionId && banners.isPending) {
    return (
      <div className="flex w-full max-w-2xl flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">{sectionId ? text.edit : text.create}</h1>

      <SectionForm
        value={value}
        onChange={setValue}
        categories={(categories.data ?? []).map((row) => ({ slug: row.slug, name: row.name }))}
        products={(products.data?.products ?? []).map((row) => ({ slug: row.slug, name: row.name }))}
        onUploadImage={image.upload}
        imagePending={image.pending}
        onSubmit={save}
        onCancel={back}
        pending={create.isPending || update.isPending}
        messages={messages}
      />
    </div>
  )
}
