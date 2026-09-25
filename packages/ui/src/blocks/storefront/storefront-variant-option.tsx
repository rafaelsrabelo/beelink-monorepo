"use client"

// UI
import { ToggleGroup, ToggleGroupItem } from "@harness-monorepo/ui/components/toggle-group"
import { cn } from "@harness-monorepo/ui/lib/utils"
import type { ChoiceOption } from "@harness-monorepo/ui/lib/variant-choice"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export type VariantValueState = "available" | "soldOut" | "missing"

export interface StorefrontVariantOptionProps {
  option: ChoiceOption
  /** Per value, in order: whether choosing it reaches a combination, and one that can be ordered. */
  states: readonly VariantValueState[]
  /** Per value, in order: what it would cost with the rest of the choice kept, already formatted. */
  prices: readonly (string | null)[]
  /** Per value, in order: its own photo, when it has one. */
  photos: readonly (string | null)[]
  chosenId: string | undefined
  /** Photo cards for flavours and colours; pills for sizes and the rest. */
  layout: "cards" | "pills"
  onSelect: (valueId: string) => void
  messages?: UiMessages
}

// The primitive draws in the panel's tokens; every state here is the shop's own. `hover:` and
// `aria-pressed:` are restated because the primitive sets both.
const BASE =
  "h-auto min-w-0 rounded-[12px] border border-shop-line-strong bg-shop-background text-left leading-[1.2] font-normal whitespace-normal text-shop-on-background " +
  "hover:border-shop-primary hover:bg-shop-background hover:text-shop-on-background aria-pressed:bg-shop-primary-tint " +
  "focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-shop-primary-ink"
const CARD = "flex-col items-stretch justify-start gap-1.5 p-2"
const PILL = "min-w-[110px] flex-col items-start justify-start gap-0.5 px-3 py-2.5"
// Chosen: a 2px border on the wash, the padding a pixel smaller so nothing moves when it grows. The
// border is the ink, not the brand colour: a pale brand colour on white falls under 3:1.
const CHOSEN = {
  cards: "border-2 border-shop-primary-ink bg-shop-primary-tint p-[7px]",
  pills: "border-2 border-shop-primary-ink bg-shop-primary-tint px-[11px] py-[9px]",
}

/**
 * One option of the product, as 5b draws it: "Sabor: **Frutas vermelhas**" over a grid of photo
 * cards — the flavour's own tub, its name, its price — or "Tamanho: **300 g**" over a row of pills
 * with the price under each size.
 *
 * A value that reaches a combination the shop sells and has run out of is dashed and struck through,
 * says "Esgotado · avise-me" where its price would be, and stays choosable: choosing it is how a
 * visitor gets to "Avise-me". One that reaches no combination at all is disabled.
 */
export function StorefrontVariantOption({ option, states, prices, photos, chosenId, layout, onSelect, messages = defaultMessages }: StorefrontVariantOptionProps) {
  const text = messages.storefront
  const chosen = option.values.find((value) => value.id === chosenId)
  const legendId = `variant-option-${option.id}`
  const [before, after = ""] = text.chosenValue.split("{value}")

  return (
    <div className="flex flex-col">
      <p id={legendId} className="mb-2 text-[15px]">
        {format(before ?? "", { option: option.name })}
        <strong>{chosen?.name ?? ""}</strong>
        {after}
      </p>
      <ToggleGroup
        // Remounted when which values are disabled changes: the group keeps one tab stop, and Base UI
        // does not move it off an item that becomes disabled, which would take the row out of reach.
        key={states.map((state) => (state === "missing" ? "x" : "o")).join("")}
        multiple={false}
        aria-labelledby={legendId}
        value={chosen ? [chosen.id] : []}
        onValueChange={(next: string[]) => {
          const valueId = next[0]
          if (valueId) onSelect(valueId)
        }}
        // 5b's four columns; on a phone, as many as keep a price on one line — four at 360, three at 320.
        className={
          layout === "cards"
            ? "grid w-full grid-cols-[repeat(auto-fill,minmax(76px,1fr))] items-stretch gap-2 shop-sm:grid-cols-4"
            : "flex flex-wrap items-stretch gap-2"
        }
      >
        {option.values.map((value, index) => {
          const state = states[index] ?? "missing"
          const price = state === "missing" ? null : (prices[index] ?? null)
          const photo = photos[index] ?? null
          const isChosen = value.id === chosen?.id
          const out = state !== "available"
          // Spelled out rather than read off the content: a name, its price and its state.
          const name = [value.name, price ? `, ${price}` : "", state === "missing" ? text.valueMissing : state === "soldOut" ? text.valueSoldOut : ""].join("")

          return (
            <ToggleGroupItem
              key={value.id}
              value={value.id}
              aria-label={name}
              disabled={state === "missing"}
              className={cn(BASE, layout === "cards" ? CARD : PILL, isChosen && CHOSEN[layout], state === "soldOut" && "border-dashed text-shop-muted", state === "missing" && "line-through")}
            >
              {layout === "cards" ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "block h-[52px] w-full overflow-hidden rounded-[8px]",
                    photo || value.colorHex ? null : state === "soldOut" ? "bg-shop-canvas" : isChosen ? "bg-shop-primary-tint-strong" : "bg-shop-placeholder",
                  )}
                  // The shopkeeper's swatch: data applied at runtime, like a shop's own colours.
                  style={!photo && value.colorHex ? { backgroundColor: value.colorHex } : undefined}
                >
                  {photo ? <img src={photo} alt="" loading="lazy" decoding="async" className={cn("size-full object-cover", out && "opacity-50")} /> : null}
                </span>
              ) : null}
              <span className={cn(layout === "cards" ? "text-[13px]" : "text-[14px]", isChosen ? "font-bold" : "font-semibold", out && "line-through")}>{value.name}</span>
              {state === "soldOut" ? (
                <span className="text-[12px]">{text.valueSoldOutNotify}</span>
              ) : price ? (
                <span className="text-[13px]">{price}</span>
              ) : null}
            </ToggleGroupItem>
          )
        })}
      </ToggleGroup>
    </div>
  )
}
