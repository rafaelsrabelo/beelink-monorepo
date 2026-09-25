"use client"

// Libs
import { CheckIcon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@harness-monorepo/ui/components/popover"
import { Toggle } from "@harness-monorepo/ui/components/toggle"
import type { VariationOption } from "@harness-monorepo/ui/lib/variations"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface PhotoValuesPickerProps {
  /** The product's options, as the variations draft holds them. Only those with values are offered. */
  options: readonly VariationOption[]
  /** The value keys the photo is of. Empty: every combination. */
  value: readonly string[]
  onChange: (valueKeys: string[]) => void
  /** Which photo, counted from one, as the gallery names it. */
  number: number
  disabled?: boolean
  messages?: UiMessages
}

/** "Morango · 900g", "Chocolate, Baunilha", or every variation: what the photo is of, option by option. */
export function photoValuesSummary(options: readonly VariationOption[], value: readonly string[], every: string): string {
  const parts = options
    .map((option) => option.values.filter((entry) => value.includes(entry.key)).map((entry) => entry.name).join(", "))
    .filter(Boolean)
  return parts.length > 0 ? parts.join(" · ") : every
}

/**
 * Under a photo of a product with variations: what the photo is of, and the choice that changes it.
 *
 * The mark is on the photo rather than on each combination because a photo is usually of one value —
 * the Morango tub in every weight — and marking it once is what keeps a new weight from starting
 * without its photos. Values of one option widen and different options narrow, the rule
 * `lib/photo-choice` applies on the shop window.
 */
export function PhotoValuesPicker({
  options,
  value,
  onChange,
  number,
  disabled = false,
  messages = defaultMessages,
}: PhotoValuesPickerProps) {
  const text = messages.catalog.media
  const offered = options.filter((option) => option.values.length > 0)
  const summary = photoValuesSummary(offered, value, text.ofEvery)

  function toggle(valueKey: string, pressed: boolean) {
    onChange(pressed ? [...value, valueKey] : value.filter((key) => key !== valueKey))
  }

  function clear(option: VariationOption) {
    onChange(value.filter((key) => !option.values.some((entry) => entry.key === key)))
  }

  return (
    <Popover>
      <PopoverTrigger
        disabled={disabled}
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-start overflow-hidden"
            aria-label={format(text.ofButton, { number: String(number), summary })}
          />
        }
      >
        <span className="truncate">{summary}</span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <PopoverHeader>
          <PopoverTitle>{format(text.ofTitle, { number: String(number) })}</PopoverTitle>
          <PopoverDescription>{text.ofHint}</PopoverDescription>
        </PopoverHeader>
        {offered.map((option) => {
          const marked = option.values.some((entry) => value.includes(entry.key))
          // A new "other" option has no name yet; it is called by its place, as its own card calls it.
          const name =
            option.name.trim() ||
            format(text.ofUnnamedOption, { number: String(options.indexOf(option) + 1) })
          return (
            <div key={option.key} role="group" aria-label={name} className="flex flex-col gap-1.5">
              <p className="text-muted-foreground text-xs font-medium">{name}</p>
              <div className="flex flex-wrap gap-1.5">
                {/* Pressed while nothing of this option is marked; pressing it takes the marks off. */}
                <Toggle variant="outline" size="sm" pressed={!marked} onPressedChange={() => clear(option)}>
                  {format(text.ofAnyValue, { option: name.toLocaleLowerCase() })}
                </Toggle>
                {option.values.map((entry) => (
                  <Toggle
                    key={entry.key}
                    variant="outline"
                    size="sm"
                    pressed={value.includes(entry.key)}
                    onPressedChange={(pressed) => toggle(entry.key, pressed)}
                  >
                    {value.includes(entry.key) ? <CheckIcon aria-hidden="true" /> : null}
                    {entry.name}
                  </Toggle>
                ))}
              </div>
            </div>
          )
        })}
      </PopoverContent>
    </Popover>
  )
}
