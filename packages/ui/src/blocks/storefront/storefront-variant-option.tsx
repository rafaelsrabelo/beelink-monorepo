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

// The primitive draws in the panel's tokens; every state here is the shop's own. `hover:`,
// `aria-pressed:` and the focus border are restated because the primitive sets them, and the outline
// needs its style back: the primitive's `outline-none` leaves `outline-2` drawing nothing.
const BASE =
  "h-auto min-w-0 rounded-[12px] border border-shop-line-strong bg-shop-background text-left leading-[1.2] font-normal whitespace-normal text-shop-on-background " +
  "hover:border-shop-primary hover:bg-shop-background hover:text-shop-on-background aria-pressed:bg-shop-primary-tint " +
  "focus-visible:border-shop-line-strong focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-shop-primary-ink"
const CARD = "flex-col items-stretch justify-start gap-1.5 p-2"
const PILL = "max-w-full flex-col items-start justify-start gap-0.5 px-3 py-2.5 shop-sm:min-w-[110px]"
// Chosen: a 2px border on the wash, the padding a pixel smaller so nothing moves when it grows. The
// border is the ink, not the brand colour, in every state: a pale brand colour on white falls under 3:1.
const INK = "border-2 border-shop-primary-ink bg-shop-primary-tint hover:border-shop-primary-ink focus-visible:border-shop-primary-ink"
const CHOSEN = { cards: `${INK} p-[7px]`, pills: `${INK} px-[11px] py-[9px]` }
// 5b's four columns of about 107px, never wider than 120 where the column is wide; on a phone, as
// many as keep a price on one line. The pills share a phone's row the same way, and keep 5b's 110px
// from shop-sm. `w-full` because the primitive sets `w-fit`, and an intrinsically sized grid
// resolves `auto-fill` to one column.
const ROW = {
  cards: "grid w-full grid-cols-[repeat(auto-fill,minmax(76px,1fr))] items-stretch gap-2 shop-sm:grid-cols-[repeat(4,minmax(0,120px))]",
  pills: "grid w-full grid-cols-[repeat(auto-fill,minmax(96px,1fr))] items-stretch gap-2 shop-sm:flex shop-sm:w-fit shop-sm:flex-wrap",
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
        className={ROW[layout]}
      >
        {option.values.map((value, index) => {
          const state = states[index] ?? "missing"
          const price = state === "missing" ? null : (prices[index] ?? null)
          const photo = photos[index] ?? null
          const isChosen = value.id === chosen?.id
          const out = state !== "available"
          // Spelled out rather than read off the content, and saying what is on it: a name and its
          // price, or a name and "Esgotado · avise-me" where the price would be.
          const name =
            state === "missing"
              ? `${value.name}${text.valueMissing}`
              : state === "soldOut"
                ? `${value.name}, ${text.valueSoldOutNotify}`
                : `${value.name}${price ? `, ${price}` : ""}`

          return (
            <ToggleGroupItem
              key={value.id}
              value={value.id}
              aria-label={name}
              disabled={state === "missing"}
              className={cn(BASE, layout === "cards" ? CARD : PILL, isChosen && CHOSEN[layout], state === "soldOut" && "border-dashed text-shop-muted hover:text-shop-muted", state === "missing" && "line-through")}
            >
              {layout === "cards" ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "block h-[52px] w-full overflow-hidden rounded-[8px]",
                    // A colour gets a hairline, so a white swatch on a white card still has an edge.
                    photo ? null : value.colorHex ? "ring-1 ring-shop-line ring-inset" : state === "soldOut" ? "bg-shop-canvas" : isChosen ? "bg-shop-primary-tint-strong" : "bg-shop-placeholder",
                  )}
                  // The shopkeeper's swatch: data applied at runtime, like a shop's own colours.
                  style={!photo && value.colorHex ? { backgroundColor: value.colorHex } : undefined}
                >
                  {photo ? <img src={photo} alt="" loading="lazy" decoding="async" className={cn("size-full object-cover", out && "opacity-50")} /> : null}
                </span>
              ) : null}
              <span className={cn(layout === "cards" ? "text-[13px]" : "text-[14px]", "[overflow-wrap:anywhere]", isChosen ? "font-bold" : "font-semibold", out && "line-through")}>{value.name}</span>
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
