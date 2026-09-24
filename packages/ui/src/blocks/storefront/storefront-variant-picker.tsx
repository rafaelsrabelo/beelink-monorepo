"use client"

// UI
import { ToggleGroup, ToggleGroupItem } from "@harness-monorepo/ui/components/toggle-group"
import { cn } from "@harness-monorepo/ui/lib/utils"
import {
  valueStateOf,
  type ChoiceOption,
  type ChoiceVariant,
  type Selection,
} from "@harness-monorepo/ui/lib/variant-choice"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface StorefrontVariantPickerProps {
  options: readonly ChoiceOption[]
  variants: readonly ChoiceVariant[]
  selection: Selection
  onSelect: (optionId: string, valueId: string) => void
  messages?: UiMessages
}

/**
 * One row of choices per option, as design 4b draws them: text for a size, a swatch and its name
 * for a colour — the name always, because a swatch alone says nothing to someone who cannot see it.
 *
 * A value that makes a combination the shop does not sell is struck through and disabled. One that
 * makes a combination it sells and has run out of is struck through too, and still choosable: that
 * is where a visitor asks to be told when it is back. Neither relies on the strike alone; a screen
 * reader hears ", indisponível" or ", esgotado" after the name.
 */
export function StorefrontVariantPicker({
  options,
  variants,
  selection,
  onSelect,
  messages = defaultMessages,
}: StorefrontVariantPickerProps) {
  const text = messages.storefront

  return (
    <div className="flex flex-col gap-4">
      {options.map((option) => {
        const chosen = option.values.find((value) => value.id === selection[option.id])
        const legendId = `variant-option-${option.id}`

        return (
          <div key={option.id} className="flex flex-col gap-2">
            <p id={legendId} className="text-sm">
              {format(text.chosenValue, { option: option.name, value: chosen?.name ?? "" })}
            </p>
            <ToggleGroup
              multiple={false}
              aria-labelledby={legendId}
              value={chosen ? [chosen.id] : []}
              onValueChange={(next: string[]) => {
                const valueId = next[0]
                if (valueId) onSelect(option.id, valueId)
              }}
              className="flex flex-wrap gap-2"
            >
              {option.values.map((value) => {
                const state = valueStateOf(selection, option.id, value.id, options, variants)
                const isChosen = value.id === chosen?.id

                return (
                  <ToggleGroupItem
                    key={value.id}
                    value={value.id}
                    disabled={state === "missing"}
                    className={cn(
                      "h-11 min-w-12 gap-2 rounded-xl border border-current/20 px-3 text-sm",
                      isChosen && "border-2 border-current font-semibold",
                      state !== "available" && "line-through opacity-50",
                    )}
                  >
                    {value.colorHex ? (
                      <span
                        aria-hidden="true"
                        className="size-6 shrink-0 rounded-full border border-current/15"
                        // The shopkeeper's swatch: data applied at runtime, like a shop's own colours.
                        style={{ backgroundColor: value.colorHex }}
                      />
                    ) : null}
                    {value.name}
                    {state === "missing" ? <span className="sr-only">{text.valueMissing}</span> : null}
                    {state === "soldOut" ? <span className="sr-only">{text.valueSoldOut}</span> : null}
                  </ToggleGroupItem>
                )
              })}
            </ToggleGroup>
          </div>
        )
      })}
    </div>
  )
}
