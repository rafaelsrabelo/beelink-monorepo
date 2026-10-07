"use client"

// React
import { useRef, useState, type CSSProperties } from "react"

// UI
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@harness-monorepo/ui/components/select"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

/** One entry of "Buscar em": a category, by its slug and its name. */
export interface StorefrontSearchScope {
  value: string
  label: string
}

/** The key the scope travels under: the same `categoria` the catalogue reads. */
export const SEARCH_SCOPE_NAME = "categoria"

export interface StorefrontSearchScopeSelectProps {
  scopes: readonly StorefrontSearchScope[]
  /** The chosen category's slug; `""` is the whole shop. Held here when no `onValueChange` is given. */
  value?: string
  /** Told when another is chosen, for a screen whose suggestions follow the scope. */
  onValueChange?: (scope: string) => void
  messages?: UiMessages
}

/** The primitive tells "nothing chosen" by null; the whole shop is a choice, with a value of its own. */
const ALL = "__all"
/** The shop's colours the list wears: it is drawn outside the element that carries them. */
const PALETTE = ["--shop-background", "--shop-on-background", "--shop-fill", "--shop-line"] as const

/**
 * As wide as the chosen name and no wider, up to 7rem; past it the name ends in an ellipsis, and the
 * whole of it is in `title` and in the list. It is a button, so iOS does not zoom into it as it does
 * into a field, and its text may be 13px. The primitive draws its value as a flex box clamped to a
 * line, which cuts nothing inside a button this narrow: here the value is a block that truncates.
 */
const TRIGGER =
  "h-full w-fit max-w-[7rem] shrink-0 gap-1 overflow-hidden rounded-none border-0 border-r border-shop-frame bg-shop-fill py-0 pr-2 pl-3 text-[13px] font-medium text-shop-on-background focus-visible:border-shop-frame focus-visible:bg-shop-line focus-visible:ring-0 data-[size=default]:h-full dark:bg-shop-fill dark:hover:bg-shop-fill *:data-[slot=select-value]:block *:data-[slot=select-value]:min-w-0 *:data-[slot=select-value]:truncate [&_svg]:text-shop-on-background"
/** Never wider than the screen it opens on, and a long name wraps in it rather than being cut. */
const LIST = "w-auto max-w-[min(20rem,calc(100vw-2rem))] min-w-40 bg-shop-background text-shop-on-background ring-shop-line"
const ITEM = "min-h-10 py-2 focus:bg-shop-fill focus:text-shop-on-background [&>*:first-child]:min-w-0 [&>*:first-child]:shrink [&>*:first-child]:break-words [&>*:first-child]:whitespace-normal"

/**
 * "Buscar em": which category the shop's search is narrowed to, as a compact button inside the
 * search bar — "Todos ▾" — that opens the list of categories.
 *
 * It was a native `<select>`, twice resized and twice rejected: a native select is as wide as its
 * longest option, or as wide as it is told to be, and never as wide as what it is showing. At the
 * shop this was measured on it drew "Todos" in 160px because one category is called "Termogênicos e
 * Controles de peso". This is the design system's select, whose button takes the room of the
 * chosen name alone.
 *
 * What the search sends did not change: the chosen slug travels as `categoria` in a hidden field of
 * the form this is drawn in, empty for the whole shop — the address is the one the native select
 * produced. Before the script arrives the button opens nothing and the form still searches, in the
 * scope the page was served with.
 *
 * The list is drawn in a portal, away from the element that carries the shop's `--shop-*`
 * variables, and — unlike the pop-up — this block is handed no palette: it carries over the ones
 * its own button wears, read when the list opens.
 */
export function StorefrontSearchScopeSelect({ scopes, value, onValueChange, messages = defaultMessages }: StorefrontSearchScopeSelectProps) {
  const text = messages.storefront
  const trigger = useRef<HTMLButtonElement>(null)
  const [held, setHeld] = useState(value ?? "")
  const [palette, setPalette] = useState<CSSProperties>()
  const chosen = onValueChange ? (value ?? "") : held

  const items = [{ value: ALL, label: text.searchScopeAll }, ...scopes.map((entry) => ({ value: entry.value, label: entry.label }))]
  const label = scopes.find((entry) => entry.value === chosen)?.label ?? text.searchScopeAll

  function choose(next: string | null) {
    const scope = next === null || next === ALL ? "" : next
    setHeld(scope)
    onValueChange?.(scope)
  }

  function wearShopColours(open: boolean) {
    if (!open || !trigger.current) return
    const worn = getComputedStyle(trigger.current)
    setPalette(Object.fromEntries(PALETTE.map((name) => [name, worn.getPropertyValue(name)]).filter(([, colour]) => colour)) as CSSProperties)
  }

  return (
    <>
      <input type="hidden" name={SEARCH_SCOPE_NAME} value={chosen} />
      <Select items={items} value={chosen || ALL} onValueChange={choose} onOpenChange={wearShopColours}>
        <SelectTrigger ref={trigger} aria-label={text.searchScope} title={label} data-search-scope className={TRIGGER}>
          <SelectValue className="block min-w-0 truncate" />
        </SelectTrigger>
        <SelectContent align="start" alignItemWithTrigger={false} className={LIST} style={palette}>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value} className={ITEM}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  )
}
