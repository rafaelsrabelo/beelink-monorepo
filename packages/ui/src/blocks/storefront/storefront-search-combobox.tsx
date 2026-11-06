"use client"

// React
import { useId, useState, type KeyboardEvent } from "react"

// Libs
import { SearchIcon } from "lucide-react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { SEARCH_BAR, SEARCH_BUTTON, SEARCH_FIELD, searchBarStyle } from "./storefront-search"
import { StorefrontSearchScopeSelect, type StorefrontSearchScope } from "./storefront-search-scope"
import { canAddFromList, StorefrontSearchSuggestions, type StorefrontSuggestion } from "./storefront-search-suggestions"

// Declared beside the list that draws them; re-exported because screens import it from here.
export type { StorefrontSuggestion } from "./storefront-search-suggestions"

export interface StorefrontSearchComboboxProps {
  /** Where Enter goes, and where the whole thing goes with JavaScript off. */
  action: string
  /** The key the term travels under. `q`, unless a screen has a reason. */
  name?: string
  value: string
  onValueChange: (value: string) => void
  /** The categories the search can be narrowed to; see `StorefrontSearch`. */
  scopes?: readonly StorefrontSearchScope[]
  scope?: string
  /** Told when the visitor picks another scope, so the suggestions follow it. */
  onScopeChange?: (scope: string) => void
  suggestions: readonly StorefrontSuggestion[]
  pending?: boolean
  /** How many the shop has altogether, for the last row of the list. */
  total?: number
  /** Where that last row goes. Absent and the row is not drawn. */
  seeAllHref?: string
  autoFocus?: boolean
  tone?: "inherit" | "panel"
  messages?: UiMessages
}

/**
 * The shop's search, answering while someone types.
 *
 * It is still a `<form method="get">` around a named field, and that is not decoration: with no
 * JavaScript, or before it arrives, or when the suggestion request fails, pressing Enter goes to
 * the search page exactly as it did before this component existed. The list is a shortcut on top
 * of a working form, never the feature itself — which is also why the search page stays: it is
 * the address a person can bookmark and a crawler can follow.
 *
 * The accessibility here is the combobox pattern with a grid for its popup, and the part that is
 * easy to get wrong is where focus lives. It never leaves the field: up and down move
 * `aria-activedescendant` over the products, and right and left between a product and its "+",
 * while the caret stays put — a list that steals focus is a list you cannot keep typing into. Enter
 * opens the product, or presses its "+", and submits the form when nothing is active, which is the
 * behaviour of every search box a visitor has already used.
 *
 * The list is an answer to typing, and nothing else opens it. It used to open whenever there were
 * suggestions to show — so the results page, which hands the term back to this field, drew it over
 * its own results before anyone touched a key, and there it stayed: nothing but Escape closed it.
 * A visitor who pressed Enter landed on a page that looked like the one they had left. It now
 * starts closed, closes when the search is sent and when the field is left, and only a key typed
 * (or the arrow down) opens it again.
 *
 * The pointer highlights a row and does not choose it for the keyboard: with the two as one state,
 * a pointer resting where the list opened turned Enter into "open this product".
 */
export function StorefrontSearchCombobox({
  action,
  name = "q",
  value,
  onValueChange,
  scopes,
  scope = "",
  onScopeChange,
  suggestions,
  pending = false,
  total = 0,
  seeAllHref,
  autoFocus = false,
  tone = "inherit",
  messages = defaultMessages,
}: StorefrontSearchComboboxProps) {
  const text = messages.storefront
  const listId = useId()
  const cellId = (row: number, column: 0 | 1) => `${listId}-cell-${row}-${column}`

  const [active, setActive] = useState(-1)
  const [column, setColumn] = useState<0 | 1>(0)

  /** Back to the field: no product, and its first cell whenever one is next. */
  function unselect() {
    setActive(-1)
    setColumn(0)
  }
  // Closed until someone types: a term handed back by the page is not a question being asked.
  const [dismissed, setDismissed] = useState(true)

  const open = !dismissed && (suggestions.length > 0 || pending)

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setDismissed(true)
      unselect()
      return
    }

    // The arrow down asks for the list back, as it does on every combobox: its first row, at once.
    if (!open && event.key === "ArrowDown" && suggestions.length) {
      event.preventDefault()
      setDismissed(false)
      setActive(0)
      setColumn(0)
      return
    }

    if (!open || !suggestions.length) return

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      // The caret would otherwise jump to the end or the start of the field, which is where a
      // browser sends it on an arrow key inside a text input.
      event.preventDefault()

      const step = event.key === "ArrowDown" ? 1 : -1
      const next = (active + step + suggestions.length + 1) % (suggestions.length + 1)
      setActive(next === suggestions.length ? -1 : next)
      // A row with no "+" has one cell, and the next row's "+" is not where the visitor was.
      if (next === suggestions.length || !canAddFromList(suggestions[next])) setColumn(0)
      return
    }

    // Right and left move between a product and its "+" — and only then: otherwise they are the
    // caret's, inside what is being typed.
    if (active >= 0 && event.key === "ArrowRight" && column === 0 && canAddFromList(suggestions[active])) {
      event.preventDefault()
      setColumn(1)
      return
    }
    if (active >= 0 && event.key === "ArrowLeft" && column === 1) {
      event.preventDefault()
      setColumn(0)
      return
    }

    if (event.key === "Enter" && active >= 0) {
      // Let the form submit when nothing is highlighted; only take Enter when it means "this one".
      event.preventDefault()
      // The "+" is pressed as a pointer presses it, so the cart says "added" the same way.
      if (column === 1) document.getElementById(cellId(active, 1))?.querySelector("button")?.click()
      else window.location.assign(suggestions[active]!.href)
    }
  }

  return (
    <div className="relative w-full min-w-0 flex-1">
      <form
        method="get"
        action={action}
        role="search"
        // Sent: the page is leaving, and the list must not sit over it while it does.
        onSubmit={() => {
          setDismissed(true)
          unselect()
        }}
        className={SEARCH_BAR}
        style={searchBarStyle(tone)}
      >
        {scopes?.length ? <StorefrontSearchScopeSelect scopes={scopes} value={scope} onValueChange={(next) => onScopeChange?.(next)} messages={messages} /> : null}

        <button type="submit" aria-label={text.searchAction} className={SEARCH_BUTTON}>
          <SearchIcon aria-hidden="true" className="size-5" strokeWidth={2} />
        </button>

        <label className="flex min-w-0 flex-1">
          <span className="sr-only">{text.search}</span>
          <input
            type="search"
            name={name}
            value={value}
            onChange={(event) => {
              onValueChange(event.target.value)
              // An emptied field asks nothing: Escape clears a search field in Chrome, and the
              // suggestions of the term just erased would otherwise open again until they settle.
              setDismissed(event.target.value.trim() === "")
              unselect()
            }}
            onKeyDown={onKeyDown}
            // A press on a row or on "ver todos" keeps the focus here (their `mousedown`), so this
            // is only ever the visitor leaving the search.
            onBlur={() => {
              setDismissed(true)
              unselect()
            }}
            autoFocus={autoFocus}
            placeholder={text.searchPlaceholder}
            role="combobox"
            aria-haspopup="grid"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? cellId(active, column) : undefined}
            autoComplete="off"
            className={SEARCH_FIELD}
          />
        </label>
      </form>

      {open ? (
        <StorefrontSearchSuggestions
          listId={listId}
          cellId={cellId}
          suggestions={suggestions}
          pending={pending}
          activeRow={active}
          activeColumn={column}
          total={total}
          seeAllHref={seeAllHref}
          messages={messages}
        />
      ) : null}
    </div>
  )
}
