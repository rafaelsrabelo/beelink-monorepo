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

export interface StorefrontSearchSuggestionsProps {
  /** The listbox's id, which the field names in `aria-controls`. */
  listId: string
  /** Each row's id, which the field names in `aria-activedescendant`. */
  optionId: (index: number) => string
  suggestions: readonly StorefrontSuggestion[]
  pending?: boolean
  /** The row the arrow keys are on; -1 with none. */
  active: number
  /** How many the shop has altogether, for the last row of the list. */
  total?: number
  /** Where that last row goes. Absent and the row is not drawn. */
  seeAllHref?: string
  messages?: UiMessages
}

/**
 * The list under the shop's search: what `StorefrontSearchCombobox` opens while someone types. It
 * holds no state and takes no focus — the field keeps both — so every press here is a `mousedown`
 * that is stopped before the field blurs: a list that closed on the blur would never get the click.
 */
export function StorefrontSearchSuggestions({ listId, optionId, suggestions, pending = false, active, total = 0, seeAllHref, messages = defaultMessages }: StorefrontSearchSuggestionsProps) {
  const text = messages.storefront

  return (
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
            className={cn(
              "flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-black/5",
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
          // As the rows: the field would blur on the press and take the list, and this link, with it.
          onMouseDown={(event) => event.preventDefault()}
          className="block border-t border-current/10 px-4 py-3 text-center text-xs font-semibold"
          style={{ color: "var(--shop-primary-ink)" }}
        >
          {format(text.searchSeeAll, { count: String(total) })}
        </a>
      ) : null}
    </div>
  )
}
