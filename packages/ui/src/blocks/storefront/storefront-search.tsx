// Libs
import { SearchIcon } from "lucide-react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface StorefrontSearchProps {
  /**
   * Built by the screen — `/<shop>/<the shop's word for search>`. Required, and not defaulted to
   * the current address: a search with nowhere to go submits to the page it is standing on, which
   * is the single filtered page this was split up to stop being.
   */
  action: string
  /**
   * The key the term travels under. `q` is what the route contract promises, and the word in the
   * path is the shop's — `/<shop>/busca?q=` and `/<shop>/search?q=` are the same address in two
   * languages, so the word moves and the key does not.
   */
  name?: string
  /** What was asked for, so a results page still says it back in the field someone typed it into. */
  value?: string
  /** Pinned to the form, for a screen that has to carry something along with the term. */
  hidden?: Record<string, string>
  /** A page whose whole purpose is the search may take the caret; a header must never steal it. */
  autoFocus?: boolean
  messages?: UiMessages
}

/**
 * The shop's search, as a form the address answers.
 *
 * `<form method="get">` with a named field and nothing else: the shop is crawled, and a term has
 * to survive being bookmarked, shared and read back off the URL — none of which a handler that
 * filters a list in memory leaves behind. It also has to work before any JavaScript arrives.
 *
 * The accessible name and the placeholder are two different sentences on purpose. A placeholder is
 * gone the moment someone types, so it can never be the only name a field has (WCAG 3.3.2).
 *
 * The label wraps the field instead of pointing at an id, because a results page renders this
 * twice — once in the header, once over the results — and two controls answering to one id is a
 * duplicate id, not a second search.
 *
 * It fills whatever row it is handed: the header shares that row with the logo and the icons, and
 * a page of its own gives it the full width.
 */
export function StorefrontSearch({
  action,
  name = "q",
  value = "",
  hidden,
  autoFocus = false,
  messages = defaultMessages,
}: StorefrontSearchProps) {
  const text = messages.storefront

  return (
    <form method="get" action={action} role="search" className="relative w-full min-w-0 flex-1">
      <label className="block">
        <span className="sr-only">{text.search}</span>
        <SearchIcon
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 opacity-60"
        />
        <input
          type="search"
          name={name}
          defaultValue={value}
          placeholder={text.searchPlaceholder}
          autoFocus={autoFocus}
          className="h-10 w-full rounded-full border border-current/15 bg-transparent pr-3 pl-9 text-sm outline-none focus-visible:border-current/40"
        />
      </label>

      {Object.entries(hidden ?? {}).map(([key, pinned]) => (
        <input key={key} type="hidden" name={key} value={pinned} />
      ))}

      {/*
        Out of sight but in the form: Enter submits only where a submit button exists, and a
        magnifying glass that is the button leaves the header a field's width shorter on a phone.
      */}
      <button type="submit" className="sr-only">
        {text.searchAction}
      </button>
    </form>
  )
}
