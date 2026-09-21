"use client"

// React
import { useState } from "react"

// Types
import type { ProductCategory } from "@harness-monorepo/contracts"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { CategoryForm, type CategoryFormValues } from "@harness-monorepo/ui/blocks/catalog/category-form"
import { CategoryList } from "@harness-monorepo/ui/blocks/catalog/category-list"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import {
  useCreateProductCategory,
  useDeleteProductCategory,
  useProductCategories,
  useUpdateProductCategory,
} from "@/services/catalog/catalog-hooks"
import { useImageUpload } from "@/services/uploads/upload-hooks"

const EMPTY: CategoryFormValues = {
  name: "",
  slug: "",
  description: "",
  imageUrl: "",
  parentId: "",
  showcaseLayout: "",
  isActive: true,
}

/** The wire's nulls become the form's empty strings, which is the only shape an input can hold. */
function toForm(category: ProductCategory, parentId: string): CategoryFormValues {
  return {
    name: category.name,
    slug: category.slug,
    description: category.description ?? "",
    imageUrl: category.imageUrl ?? "",
    parentId,
    showcaseLayout: category.showcaseLayout ?? "",
    isActive: category.isActive,
  }
}

/** And back: an empty string is "no value", which on the wire is null and not `""`. */
function toPayload(value: CategoryFormValues) {
  return {
    name: value.name.trim(),
    slug: value.slug.trim() || undefined,
    description: value.description.trim() || null,
    imageUrl: value.imageUrl.trim() || null,
    parentId: value.parentId || null,
    showcaseLayout: value.showcaseLayout || null,
    isActive: value.isActive,
  }
}

export interface CategoryScreenProps {
  slug: string
  messages: UiMessages
}

/**
 * Where a shopkeeper makes the categories their shop is sorted by.
 *
 * The form and the list are blocks; everything that knows about the network is here, which is the
 * rule this app is built on — a block reaches nothing and is handed everything.
 *
 * The parent select is filtered here rather than in the form, because only this screen knows which
 * row is open: a category may go under a top-level one, never under a subcategory (two levels), and
 * never under itself. The API refuses all three anyway; doing it here as well is so the shopkeeper
 * never picks something that will be rejected.
 */
export function CategoryScreen({ slug, messages }: CategoryScreenProps) {
  const text = messages.catalog.categories

  const categories = useProductCategories(slug)
  const create = useCreateProductCategory(slug)
  const update = useUpdateProductCategory(slug)
  const remove = useDeleteProductCategory(slug)
  const image = useImageUpload()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState<CategoryFormValues>(EMPTY)

  const rows = categories.data ?? []
  const bySlug = new Map(rows.map((row) => [row.slug, row]))
  const idOfParent = (category: ProductCategory) =>
    category.parentSlug ? (bySlug.get(category.parentSlug)?.id ?? "") : ""

  const parents = rows
    .filter((row) => !row.parentSlug && row.id !== editingId)
    .map((row) => ({ id: row.id, name: row.name }))

  const pending = create.isPending || update.isPending

  function openNew() {
    setEditingId(null)
    setValue(EMPTY)
    setOpen(true)
  }

  function openEdit(categoryId: string) {
    const category = rows.find((row) => row.id === categoryId)
    if (!category) return

    setEditingId(categoryId)
    setValue(toForm(category, idOfParent(category)))
    setOpen(true)
  }

  function save() {
    const payload = toPayload(value)
    const done = () => {
      setOpen(false)
      setEditingId(null)
      setValue(EMPTY)
    }

    if (editingId) update.mutate({ categoryId: editingId, payload }, { onSuccess: done })
    else create.mutate(payload, { onSuccess: done })
  }

  function confirmDelete(categoryId: string) {
    const category = rows.find((row) => row.id === categoryId)
    if (!category) return

    // The browser's own confirm, deliberately: what is at stake is a sentence, and a dialog of our
    // own would be a component to build, name for a screen reader and test before it said the same
    // words. It gets replaced the day there is a second thing in the panel that needs one.
    if (!window.confirm(format(text.deleteConfirm, { name: category.name }))) return

    remove.mutate(categoryId, {
      onSuccess: () => {
        if (editingId === categoryId) {
          setOpen(false)
          setEditingId(null)
        }
      },
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 lg:px-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">{text.title}</h1>
          <p className="text-muted-foreground text-sm">{text.description}</p>
        </div>
        {open ? null : <Button onClick={openNew}>{text.create}</Button>}
      </header>

      {open ? (
        <section className="rounded-xl border p-4 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold">{editingId ? text.edit : text.create}</h2>
          <CategoryForm
            value={value}
            onChange={setValue}
            parents={parents}
            shopSlug={slug}
            onUploadImage={image.upload}
            imagePending={image.pending}
            onSubmit={save}
            onCancel={() => {
              setOpen(false)
              setEditingId(null)
            }}
            pending={pending}
            messages={messages}
          />
        </section>
      ) : null}

      {categories.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <CategoryList
          categories={rows}
          onEdit={openEdit}
          onDelete={confirmDelete}
          busyId={remove.isPending ? remove.variables : null}
          messages={messages}
        />
      )}
    </div>
  )
}
