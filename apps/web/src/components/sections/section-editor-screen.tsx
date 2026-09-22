"use client"

// React
import { useState } from "react"

// Next
import { useRouter } from "next/navigation"

// Types
import type { CreateSectionPayload, Section } from "@harness-monorepo/contracts"

// UI
import { SectionForm, EMPTY_BANNER, type SectionFormValues } from "@harness-monorepo/ui/blocks/sections/section-form"
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

/** Wire nulls become `""`, because a select and an input cannot hold null. */
function toForm(banner: Section): SectionFormValues {
  return {
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
    // This screen writes posters. The cover, the promises band and the heading are blocks too, but
    // each wants different fields, and one form that grew a branch per kind is the form nobody can
    // read. They arrive with their own screens.
    kind: "BANNER",
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

  const existing = sectionId ? banners.data?.find((row) => row.id === sectionId) : undefined

  // Adjusted during render rather than in an effect: an effect would paint the empty form first,
  // and a form that fills in a beat later is a form somebody has already started typing into.
  if (existing && seeded !== existing.id) {
    setSeeded(existing.id)
    setValue(toForm(existing))
  }

  const list = `/admin/${slug}/sections`
  const back = () => router.push(list as Parameters<typeof router.push>[0])

  function save() {
    const payload = toPayload(value)
    const done = { onSuccess: back }

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
