"use client"

// React
import { useState } from "react"

// Libs
import { PlusIcon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@harness-monorepo/ui/components/select"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { ProductCategoryOption, ProductFormValues } from "./product-form-types"

export interface ProductOrganizationFieldsProps {
  value: ProductFormValues
  onChange: (value: ProductFormValues) => void
  categories: readonly ProductCategoryOption[]
  /**
   * Creates a category and answers its id, which this block then selects. Absent hides the way in
   * — a screen that cannot create one must not offer a button that does nothing.
   */
  onCreateCategory?: (name: string) => Promise<string>
  creatingCategory?: boolean
  disabled?: boolean
  messages?: UiMessages
}

/**
 * Where the product sits in the shop, and whether it is on sale at all.
 *
 * A category can be made from here. A shopkeeper writing their first product does not have
 * categories yet, and sending them to another screen to make one is where a product gets
 * abandoned half-written — so the field that needs one offers to create it.
 */
export function ProductOrganizationFields({
  value,
  onChange,
  categories,
  onCreateCategory,
  creatingCategory = false,
  disabled = false,
  messages = defaultMessages,
}: ProductOrganizationFieldsProps) {
  const text = messages.catalog.products
  const fields = messages.catalog.fields
  const [adding, setAdding] = useState(false)

  const originLabel = (origin: ProductFormValues["origin"]) => {
    if (origin === "IN_HOUSE") return text.originInHouse
    if (origin === "RESALE") return text.originResale
    return text.originUnset
  }
  const [name, setName] = useState("")

  async function create() {
    if (!name.trim() || !onCreateCategory) return
    const id = await onCreateCategory(name.trim())
    onChange({ ...value, categoryId: id })
    setName("")
    setAdding(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <Field>
        <FieldLabel htmlFor="product-category">{text.categoryLabel}</FieldLabel>
        <Select
          disabled={disabled}
          value={value.categoryId === "" ? "none" : value.categoryId}
          onValueChange={(next: string | null) =>
            onChange({ ...value, categoryId: !next || next === "none" ? "" : next })
          }
        >
          <SelectTrigger id="product-category">
            {/*
              A render function, not a bare <SelectValue />. Base UI shows the raw value unless it
              is told how to read it, so the trigger said "none" — the sentinel, on screen.
            */}
            <SelectValue>
              {(selected: string) =>
                selected === "none" || !selected
                  ? text.categoryNone
                  : (categories.find((category) => category.id === selected)?.name ?? text.categoryNone)
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{text.categoryNone}</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.parentName ? `${category.parentName} › ${category.name}` : category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {onCreateCategory ? (
          adding ? (
            <div className="flex gap-2">
              <Input
                autoFocus
                autoComplete="off"
                disabled={creatingCategory}
                aria-label={fields.newCategory}
                placeholder={messages.catalog.categories.namePlaceholder}
                value={name}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  // Enter here must not submit the product: the person is naming a category.
                  if (event.key !== "Enter") return
                  event.preventDefault()
                  void create()
                }}
              />
              <Button type="button" disabled={creatingCategory || !name.trim()} onClick={() => void create()}>
                {text.save}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
                {text.cancel}
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="self-start"
              disabled={disabled}
              onClick={() => setAdding(true)}
            >
              <PlusIcon aria-hidden="true" className="size-4" />
              {fields.newCategory}
            </Button>
          )
        ) : null}
      </Field>

      {/*
        A select and not a switch. The two states are named things a shopkeeper says out loud —
        "está ativo", "ainda é rascunho" — and a switch would have to be labelled with one of them
        and mean the other when off, which is the reading people get wrong.
      */}
      <Field>
        <FieldLabel htmlFor="product-status">{text.statusLabel}</FieldLabel>
        <Select
          value={value.status}
          onValueChange={(next) => onChange({ ...value, status: next as ProductFormValues["status"] })}
          disabled={disabled}
        >
          <SelectTrigger id="product-status">
            <SelectValue>{value.status === "ACTIVE" ? text.statusActive : text.statusDraft}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ACTIVE">{text.statusActive}</SelectItem>
            <SelectItem value="DRAFT">{text.statusDraft}</SelectItem>
          </SelectContent>
        </Select>
        <FieldDescription>{text.statusHelp}</FieldDescription>
      </Field>

      <Field>
        <FieldLabel htmlFor="product-origin">{text.originLabel}</FieldLabel>
        <Select
          value={value.origin}
          onValueChange={(next) => onChange({ ...value, origin: next as ProductFormValues["origin"] })}
          disabled={disabled}
        >
          <SelectTrigger id="product-origin">
            {/* Base UI renders the raw value, so an unset origin would show the empty string as a
                blank trigger. The render function is what puts a sentence there instead. */}
            <SelectValue>{originLabel(value.origin)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{text.originUnset}</SelectItem>
            <SelectItem value="IN_HOUSE">{text.originInHouse}</SelectItem>
            <SelectItem value="RESALE">{text.originResale}</SelectItem>
          </SelectContent>
        </Select>
        <FieldDescription>{text.originHelp}</FieldDescription>
      </Field>
    </div>
  )
}
