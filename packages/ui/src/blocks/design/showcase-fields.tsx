"use client"

// UI
import { Field, FieldContent, FieldDescription, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { ProductSource } from "./design-types"
import { OptionSearch } from "./option-search"
import { ShowcasePicksField, type ShowcasePick } from "./showcase-picks-field"
import { ShowcaseSourceField } from "./showcase-source-field"
import type { TargetOption } from "./target-fields"

export interface ShowcaseValue {
  source: ProductSource
  /** `""` until a category is chosen; read only on a CATEGORY showcase. */
  sourceCategoryId: string
  /** Read only on a SELECTION showcase. */
  picks: ShowcasePick[]
  /** As typed, so a half-typed number is not thrown away. `""` is the default, 24. */
  limit: string
}

export interface ShowcaseFieldsProps {
  value: ShowcaseValue
  onChange: (next: Partial<ShowcaseValue>) => void
  categories: readonly TargetOption[]
  products: readonly TargetOption[]
  newItemId: () => string
  /** Whether the categories and products to choose from have arrived. */
  optionsState?: "ready" | "loading" | "failed"
  messages?: UiMessages
}

/** The most a showcase draws. The API holds `limit` to the same. */
const LIMIT_MAX = 48

/** A limit the API takes: blank, or a whole number from one to forty-eight. */
function limitIsValid(limit: string): boolean {
  const typed = limit.trim()
  return typed === "" || (/^\d+$/.test(typed) && Number(typed) >= 1 && Number(typed) <= LIMIT_MAX)
}

/**
 * Whether the showcase can be saved: its source has what it needs, and the limit is one the API
 * takes. Checked here so the button says so, rather than a save that answers 400.
 */
export function showcaseReady(value: ShowcaseValue): boolean {
  if (value.source === "CATEGORY" && !value.sourceCategoryId) return false
  if (value.source === "SELECTION" && value.picks.length === 0) return false

  return limitIsValid(value.limit)
}

/**
 * A showcase's own fields: where its products come from, what that source needs (a category, or the
 * products themselves) and how many it draws. The shape it is drawn in is the Layout tab's.
 *
 * Switching the source keeps what the other sources held, so an owner who tries "uma categoria"
 * and goes back to "escolhidos a dedo" finds their pick where they left it. Only what the source
 * reads is sent — the web's payload decides that — and the API clears the rest.
 */
export function ShowcaseFields({
  value,
  onChange,
  categories,
  products,
  newItemId,
  optionsState = "ready",
  messages = defaultMessages,
}: ShowcaseFieldsProps) {
  const text = messages.design.showcase
  const chosen = categories.find((category) => category.id === value.sourceCategoryId)

  return (
    <>
      <ShowcaseSourceField value={value.source} onChange={(source) => onChange({ source })} messages={messages} />

      {value.source === "CATEGORY" ? (
        <div className="flex flex-col gap-2">
          <OptionSearch
            id="showcase-category"
            label={text.categoryLabel}
            placeholder={text.categorySearch}
            options={categories}
            selectedId={value.sourceCategoryId}
            emptyText={text.searchEmpty}
            state={optionsState}
            messages={messages}
            onPick={(sourceCategoryId) => onChange({ sourceCategoryId })}
          />
          <FieldDescription>{chosen ? chosen.name : text.categoryNone}</FieldDescription>
        </div>
      ) : null}

      {value.source === "SELECTION" ? (
        <ShowcasePicksField
          value={value.picks}
          onChange={(picks) => onChange({ picks })}
          products={products}
          newItemId={newItemId}
          optionsState={optionsState}
          messages={messages}
        />
      ) : null}

      <Field>
        <FieldLabel htmlFor="showcase-limit">{text.limitLabel}</FieldLabel>
        <FieldContent>
          <Input
            id="showcase-limit"
            type="number"
            inputMode="numeric"
            min={1}
            max={LIMIT_MAX}
            placeholder="24"
            value={value.limit}
            aria-invalid={!limitIsValid(value.limit)}
            onChange={(event) => onChange({ limit: event.target.value })}
          />
          <FieldDescription>{text.limitHint}</FieldDescription>
        </FieldContent>
      </Field>
    </>
  )
}
