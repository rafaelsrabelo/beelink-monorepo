"use client"

// React
import { useId, useState, type KeyboardEvent } from "react"

// Libs
import { SearchIcon } from "lucide-react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { SEARCH_BAR, SEARCH_BUTTON, SEARCH_FIELD, searchButtonStyle } from "./storefront-search"
import { StorefrontSearchScopeSelect, type StorefrontSearchScope } from "./storefront-search-scope"
import { StorefrontSearchSuggestions, type StorefrontSuggestion } from "./storefront-search-suggestions"

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
 * The accessibility here is the combobox pattern, and the part that is easy to get wrong is where
 * focus lives. It never leaves the field: the arrow keys move `aria-activedescendant` over the
 * options while the caret stays put, because a list that steals focus is a list you cannot keep
 * typing into. Enter opens the active option if there is one and submits the form if there is not,
 * which is the behaviour of every search box a visitor has already used.
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
  const optionId = (index: number) => `${listId}-option-${index}`

  const [active, setActive] = useState(-1)
  // Closed until someone types: a term handed back by the page is not a question being asked.
  const [dismissed, setDismissed] = useState(true)

  const open = !dismissed && (suggestions.length > 0 || pending)

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setDismissed(true)
      setActive(-1)
      return
    }

    // The arrow down asks for the list back, as it does on every combobox: its first row, at once.
    if (!open && event.key === "ArrowDown" && suggestions.length) {
      event.preventDefault()
      setDismissed(false)
      setActive(0)
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
      return
    }

    if (event.key === "Enter" && active >= 0) {
      // Let the form submit when nothing is highlighted; only take Enter when it means "this one".
      event.preventDefault()
      window.location.assign(suggestions[active].href)
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
          setActive(-1)
        }}
        className={SEARCH_BAR}
        style={{ backgroundColor: "var(--shop-background)", color: "var(--shop-on-background)" }}
      >
        {scopes?.length ? <StorefrontSearchScopeSelect scopes={scopes} value={scope} onValueChange={(next) => onScopeChange?.(next)} messages={messages} /> : null}

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
              setActive(-1)
            }}
            onKeyDown={onKeyDown}
            // A press on a row or on "ver todos" keeps the focus here (their `mousedown`), so this
            // is only ever the visitor leaving the search.
            onBlur={() => {
              setDismissed(true)
              setActive(-1)
            }}
            autoFocus={autoFocus}
            placeholder={text.searchPlaceholder}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? optionId(active) : undefined}
            autoComplete="off"
            className={SEARCH_FIELD}
          />
        </label>

        <button type="submit" aria-label={text.searchAction} className={SEARCH_BUTTON} style={searchButtonStyle(tone)}>
          <SearchIcon aria-hidden="true" className="size-[18px]" strokeWidth={2} />
        </button>
      </form>

      {open ? (
        <StorefrontSearchSuggestions listId={listId} optionId={optionId} suggestions={suggestions} pending={pending} active={active} total={total} seeAllHref={seeAllHref} messages={messages} />
      ) : null}
    </div>
  )
}
