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
        const states = option.values.map((value) => valueStateOf(selection, option.id, value.id, options, variants))

        return (
          <div key={option.id} className="flex flex-col gap-2">
            <p id={legendId} className="text-sm">
              {format(text.chosenValue, { option: option.name, value: chosen?.name ?? "" })}
            </p>
            <ToggleGroup
              // Remounted when which values are disabled changes: the group keeps one tab stop, and
              // Base UI does not move it off an item that becomes disabled, which would take the
              // whole row out of the tab order.
              key={states.map((state) => (state === "missing" ? "x" : "o")).join("")}
              multiple={false}
              aria-labelledby={legendId}
              value={chosen ? [chosen.id] : []}
              onValueChange={(next: string[]) => {
                const valueId = next[0]
                if (valueId) onSelect(option.id, valueId)
              }}
              className="flex flex-wrap gap-2"
            >
              {option.values.map((value, index) => {
                const state = states[index]!
                const isChosen = value.id === chosen?.id

                return (
                  <ToggleGroupItem
                    key={value.id}
                    value={value.id}
                    disabled={state === "missing"}
                    className={cn(
                      // The shop's own ink for every state: the primitive's hover and pressed fills
                      // are the panel's tokens, which a shop window painted dark would not match.
                      "h-11 min-w-12 gap-2 rounded-xl border border-current/20 bg-transparent px-3 text-sm text-inherit",
                      "hover:bg-current/5 hover:text-inherit aria-pressed:bg-current/10 aria-pressed:text-inherit data-[state=on]:bg-current/10",
                      isChosen && "border-2 border-current font-semibold",
                      // Struck for both; faded only when disabled, since a sold-out value stays
                      // choosable and has to be read at full contrast.
                      state !== "available" && "line-through",
                      state === "missing" && "opacity-50",
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
