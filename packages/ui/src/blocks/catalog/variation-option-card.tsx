"use client"

// React
import { useState } from "react"

// Libs
import { GripVerticalIcon, Trash2Icon, XIcon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Field, FieldError, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"
import { cn } from "@harness-monorepo/ui/lib/utils"
import type { VariationOption, VariationValue } from "@harness-monorepo/ui/lib/variations"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { ArrangeBoard, useArrangeItem } from "../design/design-arrange"

export interface VariationOptionCardProps {
  option: VariationOption
  /** Its place, from 1, for the name field's label. */
  number: number
  onRename: (name: string) => void
  onAddValue: (name: string, colorHex: string | null) => void
  onRemoveValue: (valueKey: string) => void
  onReorderValues: (valueKeys: string[]) => void
  onColor: (valueKey: string, colorHex: string) => void
  onRemove: () => void
  /** A sentence per problem, already written by the screen. */
  error?: string
  disabled?: boolean
  messages?: UiMessages
}

function ValueChip({
  value,
  isColor,
  onRemove,
  onColor,
  disabled,
  messages,
}: {
  value: VariationValue
  isColor: boolean
  onRemove: () => void
  onColor: (colorHex: string) => void
  disabled: boolean
  messages: UiMessages
}) {
  const text = messages.catalog.variations
  const { setNodeRef, handleProps, style, isDragging } = useArrangeItem(value.key)

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-shell-surface flex h-9 items-center gap-1.5 rounded-full border pr-1 pl-1 text-sm",
        isDragging && "relative z-10 shadow-md",
      )}
    >
      <button
        type="button"
        {...handleProps}
        aria-label={format(text.dragValue, { name: value.name })}
        disabled={disabled}
        className="text-muted-foreground hover:text-foreground cursor-grab rounded-full p-0.5"
      >
        <GripVerticalIcon aria-hidden="true" className="size-3.5" />
      </button>
      {isColor ? (
        <input
          // A colour field refuses an empty value, so one with no swatch yet is left to its own
          // default, and remounted as a controlled field once a colour is picked.
          key={value.colorHex === null ? "unset" : "set"}
          type="color"
          aria-label={format(text.valueColor, { name: value.name })}
          {...(value.colorHex === null ? {} : { value: value.colorHex })}
          disabled={disabled}
          onChange={(event) => onColor(event.target.value)}
          className="size-5 cursor-pointer rounded-full border-0 bg-transparent p-0"
        />
      ) : null}
      <span>{value.name}</span>
      <button
        type="button"
        aria-label={format(text.removeValue, { name: value.name })}
        disabled={disabled}
        onClick={onRemove}
        className="text-muted-foreground hover:text-foreground rounded-full p-1"
      >
        <XIcon aria-hidden="true" className="size-3.5" />
      </button>
    </li>
  )
}

/**
 * One option: its name, its values as chips, and a field where Enter adds the next one.
 *
 * The values drag, because their order is the order the customer reads on the product page — P, M,
 * G and not G, M, P. A colour option's chips carry a swatch the shopkeeper picks with the browser's
 * own colour field, which is enough for a first version and needs no picker of our own.
 */
export function VariationOptionCard({
  option,
  number,
  onRename,
  onAddValue,
  onRemoveValue,
  onReorderValues,
  onColor,
  onRemove,
  error,
  disabled = false,
  messages = defaultMessages,
}: VariationOptionCardProps) {
  const text = messages.catalog.variations
  const [draft, setDraft] = useState("")
  const [taken, setTaken] = useState(false)
  const nameId = `variation-option-${option.key}`
  const label = option.name.trim() || format(text.optionName, { number: String(number) })

  function add() {
    const name = draft.trim()
    if (!name) return
    // "P" and " p " are one size; the API refuses the pair, so the field says so first.
    if (option.values.some((value) => value.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase())) {
      setTaken(true)
      return
    }
    onAddValue(name, null)
    setDraft("")
  }

  return (
    <div className="bg-shell-surface border-shell-border flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex items-end gap-2">
        <Field className="flex-1" data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor={nameId} className="sr-only">
            {format(text.optionName, { number: String(number) })}
          </FieldLabel>
          <Input
            id={nameId}
            value={option.name}
            placeholder={text.optionNamePlaceholder}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            onChange={(event) => onRename(event.target.value)}
            className="font-medium"
          />
        </Field>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={format(text.removeOption, { name: label })}
          disabled={disabled}
          onClick={onRemove}
        >
          <Trash2Icon aria-hidden="true" />
        </Button>
      </div>

      <ArrangeBoard
        ids={option.values.map((value) => value.key)}
        onReorder={onReorderValues}
        layout="grid"
      >
        <ul className="flex flex-wrap items-center gap-2">
          {option.values.map((value) => (
            <ValueChip
              key={value.key}
              value={value}
              isColor={option.isColor}
              onRemove={() => onRemoveValue(value.key)}
              onColor={(colorHex) => onColor(value.key, colorHex)}
              disabled={disabled}
              messages={messages}
            />
          ))}
        </ul>
      </ArrangeBoard>

      <div className="flex items-center gap-2">
        <Input
          aria-label={format(text.newValue, { name: label })}
          placeholder={text.newValuePlaceholder}
          value={draft}
          disabled={disabled}
          aria-invalid={taken ? true : undefined}
          onChange={(event) => {
            setDraft(event.target.value)
            setTaken(false)
          }}
          onKeyDown={(event) => {
            // Enter adds the value; it must not also submit the product form around it.
            if (event.key !== "Enter") return
            event.preventDefault()
            add()
          }}
          className="max-w-56"
        />
        <Button type="button" variant="outline" size="sm" disabled={disabled || !draft.trim()} onClick={add}>
          {text.addValue}
        </Button>
      </div>

      {taken ? <FieldError>{text.valueTaken}</FieldError> : null}
      {error ? <FieldError>{error}</FieldError> : null}
    </div>
  )
}
