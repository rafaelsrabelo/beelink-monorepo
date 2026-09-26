"use client"

// UI
import { Field, FieldContent, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { TargetFields } from "./target-fields"
import type { TargetOption, TargetValue } from "./target-fields"

/** A button as the form holds it: its words, and where it leads. "Nenhum" is no button. */
export interface ButtonValue extends TargetValue {
  buttonLabel: string
}

export interface ButtonFieldsProps {
  value: ButtonValue
  onChange: (next: Partial<ButtonValue>) => void
  categories: readonly TargetOption[]
  products: readonly TargetOption[]
  messages?: UiMessages
}

/** What the button still needs before Salvar, or null: nothing when it leads nowhere, as it is no button. */
export function buttonMissing(value: ButtonValue): "label" | "target" | null {
  if (value.target === "NONE") return null
  if (!value.buttonLabel.trim()) return "label"
  const named =
    value.target === "CATEGORY" ? value.categoryId : value.target === "PRODUCT" ? value.productId : value.externalUrl.trim()
  return named ? null : "target"
}

/**
 * A block's one button: where it leads, asked as a slide's destination is — by the same block, so a
 * destination is never answered two ways — and then what it says. The words are asked only once it
 * leads somewhere: a button to nowhere is not drawn, and its words would be words for nobody.
 */
export function ButtonFields({ value, onChange, categories, products, messages = defaultMessages }: ButtonFieldsProps) {
  const text = messages.design.button
  const missing = buttonMissing(value)

  return (
    <>
      <TargetFields idPrefix="button" value={value} onChange={onChange} categories={categories} products={products} messages={messages} />

      {value.target !== "NONE" ? (
        <Field data-invalid={missing === "label" || undefined}>
          <FieldLabel htmlFor="button-label">{text.label}</FieldLabel>
          <FieldContent>
            <Input
              id="button-label"
              value={value.buttonLabel}
              maxLength={40}
              placeholder={text.placeholder}
              aria-invalid={missing === "label" || undefined}
              aria-describedby={missing ? "button-missing" : undefined}
              onChange={(event) => onChange({ buttonLabel: event.target.value })}
            />
          </FieldContent>
        </Field>
      ) : null}

      {/* Not an alert, for the reason the FAQ's hint gives: it follows every keystroke. */}
      {missing ? (
        <p id="button-missing" className="text-destructive text-sm">
          {missing === "label" ? text.labelMissing : text.targetMissing}
        </p>
      ) : null}
    </>
  )
}
