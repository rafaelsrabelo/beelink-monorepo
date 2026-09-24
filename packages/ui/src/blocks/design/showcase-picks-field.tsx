"use client"

// React
import { useEffect, useRef } from "react"

// Libs
import { ArrowDownIcon, ArrowUpIcon, XIcon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { FieldLegend, FieldSet } from "@harness-monorepo/ui/components/field"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { OptionSearch } from "./option-search"
import type { TargetOption } from "./target-fields"

/** One product of a hand-picked showcase. The contract's `ShowcaseProduct`, restated. */
export interface ShowcasePick {
  id: string
  productId: string
}

export interface ShowcasePicksFieldProps {
  value: readonly ShowcasePick[]
  onChange: (next: ShowcasePick[]) => void
  products: readonly TargetOption[]
  newItemId: () => string
  /** Whether the products to pick from have arrived. */
  optionsState?: "ready" | "loading" | "failed"
  messages?: UiMessages
}

/** The most a showcase draws, so the most a pick may hold. The API holds it to the same. */
const PICKS_MAX = 48

/**
 * A hand-picked showcase's products, in the order the page draws them: moved up and down one
 * place at a time, taken out, and added from a search of the shop's products.
 *
 * Arrows and not a drag: the list sits in a sheet on a phone as often as on a desk, and a button
 * named "Subir Blusa azul" is reachable by a thumb, a keyboard and a screen reader alike.
 */
export function ShowcasePicksField({
  value,
  onChange,
  products,
  newItemId,
  optionsState = "ready",
  messages = defaultMessages,
}: ShowcasePicksFieldProps) {
  const text = messages.design.showcase
  const nameOf = new Map(products.map((product) => [product.id, product.name]))

  // A row taken out takes its focused button with it. The focus lands on the row that took its
  // place — or the one above, or the search when the list is empty — once the list has redrawn.
  const removeButtons = useRef(new Map<string, HTMLButtonElement>())
  const search = useRef<HTMLInputElement>(null)
  const focusNext = useRef<string | null>(null)

  useEffect(() => {
    const next = focusNext.current
    if (next === null) return
    focusNext.current = null
    ;(removeButtons.current.get(next) ?? search.current)?.focus()
  }, [value])

  const remove = (at: number) => {
    focusNext.current = (value[at + 1] ?? value[at - 1])?.id ?? ""
    onChange(value.filter((_, index) => index !== at))
  }

  const move = (from: number, to: number) => {
    const next = [...value]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved!)
    onChange(next)
  }

  return (
    <FieldSet>
      <FieldLegend variant="label">{text.picksLabel}</FieldLegend>

      {value.length ? (
        <ol className="flex flex-col gap-1">
          {value.map((pick, at) => {
            const name = nameOf.get(pick.productId) ?? text.pickUnknown

            return (
              <li key={pick.id} className="bg-muted/50 flex items-center gap-1 rounded-md py-1 pr-1 pl-3">
                <span className="min-w-0 flex-1 truncate text-sm">{name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={format(text.pickUp, { name })}
                  // Still reachable when it reaches the top: a button that turns disabled under the
                  // focus drops it, and the owner starts over from the top of the sheet.
                  focusableWhenDisabled
                  disabled={at === 0}
                  onClick={() => move(at, at - 1)}
                >
                  <ArrowUpIcon aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={format(text.pickDown, { name })}
                  focusableWhenDisabled
                  disabled={at === value.length - 1}
                  onClick={() => move(at, at + 1)}
                >
                  <ArrowDownIcon aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={format(text.pickRemove, { name })}
                  ref={(button) => {
                    if (button) removeButtons.current.set(pick.id, button)
                    else removeButtons.current.delete(pick.id)
                  }}
                  onClick={() => remove(at)}
                >
                  <XIcon aria-hidden="true" />
                </Button>
              </li>
            )
          })}
        </ol>
      ) : (
        <p className="text-muted-foreground text-sm">{text.picksNone}</p>
      )}

      {value.length < PICKS_MAX ? (
        <OptionSearch
          id="showcase-picks-search"
          label={text.picksSearch}
          placeholder={text.picksSearch}
          options={products}
          exclude={value.map((pick) => pick.productId)}
          actionLabel={text.pickAdd}
          emptyText={text.searchEmpty}
          state={optionsState}
          inputRef={search}
          messages={messages}
          onPick={(productId) => onChange([...value, { id: newItemId(), productId }])}
        />
      ) : null}
    </FieldSet>
  )
}
