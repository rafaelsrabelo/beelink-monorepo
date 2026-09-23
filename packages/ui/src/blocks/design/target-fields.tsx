"use client"

// UI
import { Field, FieldContent, FieldDescription, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@harness-monorepo/ui/components/select"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

/** Where something on the page may send the visitor. The contract's `ComponentTarget`, restated. */
export type Target = "CATEGORY" | "PRODUCT" | "EXTERNAL" | "NONE"

/** One thing a link may point at. Named by what a person reads, keyed by what survives a rename. */
export interface TargetOption {
  id: string
  name: string
}

/**
 * A destination as a form holds it: all three at once, so a shopkeeper who picks a category,
 * changes their mind and picks a product does not lose what they typed. Only the one `target`
 * names is sent. `""` stands in for null, because a select cannot hold null.
 */
export interface TargetValue {
  target: Target
  categoryId: string
  productId: string
  externalUrl: string
}

export interface TargetFieldsProps {
  /** Prefixes every control's id, so two of these on one form do not share one. */
  idPrefix: string
  value: TargetValue
  onChange: (next: Partial<TargetValue>) => void
  categories: readonly TargetOption[]
  products: readonly TargetOption[]
  messages?: UiMessages
}

/**
 * Where a thing leads: a category, a product, an address outside the shop, or nowhere.
 *
 * Its own block because two things ask the question — a banner's slide and the announcement
 * strip — and a destination answered two different ways is a destination that drifts. The ids are
 * what is stored, never an address: a link to `/lessari/blusas` would die the day that category
 * was renamed, and that failure once cost a whole table.
 */
export function TargetFields({
  idPrefix,
  value,
  onChange,
  categories,
  products,
  messages = defaultMessages,
}: TargetFieldsProps) {
  const text = messages.banners

  const targetLabel = (target: string) =>
    target === "CATEGORY"
      ? text.targetCategory
      : target === "PRODUCT"
        ? text.targetProduct
        : target === "EXTERNAL"
          ? text.targetExternal
          : text.targetNone

  return (
    <>
      <Field orientation="responsive">
        <FieldLabel htmlFor={`${idPrefix}-target`}>{text.targetLabel}</FieldLabel>
        <FieldContent>
          <Select
            value={value.target}
            onValueChange={(next: string | null) => onChange({ target: (next ?? "NONE") as Target })}
          >
            <SelectTrigger id={`${idPrefix}-target`}>
              <SelectValue>{(selected: string) => targetLabel(selected)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">{text.targetNone}</SelectItem>
              <SelectItem value="CATEGORY">{text.targetCategory}</SelectItem>
              <SelectItem value="PRODUCT">{text.targetProduct}</SelectItem>
              <SelectItem value="EXTERNAL">{text.targetExternal}</SelectItem>
            </SelectContent>
          </Select>
        </FieldContent>
      </Field>

      {value.target === "CATEGORY" ? (
        <TargetPicker
          id={`${idPrefix}-category`}
          label={text.categoryLabel}
          empty={text.categoryNone}
          options={categories}
          value={value.categoryId}
          onChange={(next) => onChange({ categoryId: next })}
        />
      ) : null}

      {value.target === "PRODUCT" ? (
        <TargetPicker
          id={`${idPrefix}-product`}
          label={text.productLabel}
          empty={text.productNone}
          options={products}
          value={value.productId}
          onChange={(next) => onChange({ productId: next })}
        />
      ) : null}

      {value.target === "EXTERNAL" ? (
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-url`}>{text.externalLabel}</FieldLabel>
          <FieldContent>
            <Input
              id={`${idPrefix}-url`}
              type="url"
              value={value.externalUrl}
              onChange={(event) => onChange({ externalUrl: event.target.value })}
              placeholder="https://"
            />
            <FieldDescription>{text.externalHelp}</FieldDescription>
          </FieldContent>
        </Field>
      ) : null}
    </>
  )
}

/** A picker over things that survive a rename: the label is the name, the value is the id. */
function TargetPicker({
  id,
  label,
  empty,
  options,
  value,
  onChange,
}: {
  id: string
  label: string
  empty: string
  options: readonly TargetOption[]
  value: string
  onChange: (value: string) => void
}) {
  const nameOf = (candidate: string) => options.find((option) => option.id === candidate)?.name ?? empty

  return (
    <Field orientation="responsive">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <FieldContent>
        <Select value={value} onValueChange={(next: string | null) => onChange(next ?? "")}>
          <SelectTrigger id={id}>
            <SelectValue>{(selected: string) => nameOf(selected)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldContent>
    </Field>
  )
}
