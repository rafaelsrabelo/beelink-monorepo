"use client"

// React
import { useId, useState, type KeyboardEvent } from "react"

// Libs
import { SearchIcon } from "lucide-react"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"
import { cn } from "@harness-monorepo/ui/lib/utils"

export interface StorefrontSuggestion {
  id: string
  label: string
  href: string
  imageUrl?: string | null
  /** Already formatted by the screen: a block does not decide what money looks like. */
  price?: string | null
}

export interface StorefrontSearchComboboxProps {
  /** Where Enter goes, and where the whole thing goes with JavaScript off. */
  action: string
  /** The key the term travels under. `q`, unless a screen has a reason. */
  name?: string
  value: string
  onValueChange: (value: string) => void
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
 */
export function StorefrontSearchCombobox({
  action,
  name = "q",
  value,
  onValueChange,
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
  const [dismissed, setDismissed] = useState(false)

  const open = !dismissed && (suggestions.length > 0 || pending)

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setDismissed(true)
      setActive(-1)
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
      <form method="get" action={action} role="search" className="relative">
        <label className="block">
          <span className="sr-only">{text.search}</span>
          <SearchIcon
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 opacity-60"
            style={tone === "panel" ? { color: "var(--shop-text)" } : undefined}
          />
          <input
            type="search"
            name={name}
            value={value}
            onChange={(event) => {
              onValueChange(event.target.value)
              setDismissed(false)
              setActive(-1)
            }}
            onKeyDown={onKeyDown}
            autoFocus={autoFocus}
            placeholder={text.searchPlaceholder}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? optionId(active) : undefined}
            autoComplete="off"
            className="h-10 w-full rounded-full border border-current/15 bg-transparent pr-3 pl-9 text-sm outline-none focus-visible:border-current/40"
            style={
              tone === "panel"
                ? { backgroundColor: "var(--shop-background)", color: "var(--shop-text)", borderColor: "transparent" }
                : undefined
            }
          />
        </label>

        <button type="submit" className="sr-only">
          {text.searchAction}
        </button>
      </form>

      {open ? (
        <div
          className="absolute inset-x-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-current/10 shadow-lg"
          style={{ backgroundColor: "var(--shop-background)", color: "var(--shop-text)" }}
        >
          <ul id={listId} role="listbox" aria-label={text.searchSuggestionsLabel}>
            {pending && !suggestions.length ? (
              <li className="px-4 py-3 text-sm opacity-70">{text.searchLoading}</li>
            ) : null}

            {/*
              The options are not links, and that is the pattern rather than a shortcut: an option
              containing an anchor is an interactive control inside an interactive control, which
              axe fails as `nested-interactive` and a screen reader reads as two things where the
              visitor sees one. Focus stays in the field and these are reached through
              aria-activedescendant, so there is nothing here to tab to anyway.

              What is given up is opening a suggestion in a new tab. The cost is bounded: this list
              only ever exists once JavaScript has run and a request has answered, and the search
              page underneath — a real address, with real links — is one Enter away.
            */}
            {suggestions.map((suggestion, index) => (
              <li
                key={suggestion.id}
                id={optionId(index)}
                role="option"
                aria-selected={index === active}
                // mousedown and not click: the field blurs first on a click, and a list that has
                // closed by then never receives it.
                onMouseDown={(event) => {
                  event.preventDefault()
                  window.location.assign(suggestion.href)
                }}
                onMouseEnter={() => setActive(index)}
                className={cn(
                  "flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                  index === active ? "bg-black/5" : "",
                )}
              >
                {suggestion.imageUrl ? (
                  <img
                    src={suggestion.imageUrl}
                    alt=""
                    aria-hidden="true"
                    className="size-10 shrink-0 rounded-lg object-cover"
                  />
                ) : null}
                <span className="min-w-0 flex-1 truncate">{suggestion.label}</span>
                {suggestion.price ? (
                  <span className="shrink-0 text-xs font-semibold opacity-80">{suggestion.price}</span>
                ) : null}
              </li>
            ))}
          </ul>

          {/* The way out of a list that only ever shows the first few. */}
          {seeAllHref && total > suggestions.length ? (
            <a
              href={seeAllHref}
              className="block border-t border-current/10 px-4 py-3 text-center text-xs font-semibold"
              style={{ color: "var(--shop-primary)" }}
            >
              {format(text.searchSeeAll, { count: String(total) })}
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
