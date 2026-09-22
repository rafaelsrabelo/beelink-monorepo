"use client"

// React
import { useState } from "react"

// Libs
import { PlusIcon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Checkbox } from "@harness-monorepo/ui/components/checkbox"
import {
  Field,
  FieldContent,
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

      <Field orientation="horizontal">
        <Checkbox
          id="product-available"
          disabled={disabled}
          checked={value.isAvailable}
          onCheckedChange={(checked) => onChange({ ...value, isAvailable: checked })}
        />
        <FieldContent>
          <FieldLabel htmlFor="product-available">{text.availableLabel}</FieldLabel>
          <FieldDescription>{text.availableHelp}</FieldDescription>
        </FieldContent>
      </Field>
    </div>
  )
}
