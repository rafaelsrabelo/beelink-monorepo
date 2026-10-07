// Libs
import { SearchIcon } from "lucide-react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Block
import { StorefrontSearchScopeSelect, type StorefrontSearchScope } from "./storefront-search-scope"

// Declared beside the control that draws them; re-exported because screens import them from here.
export { SEARCH_SCOPE_NAME, type StorefrontSearchScope } from "./storefront-search-scope"

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
  /**
   * The categories the search can be narrowed to, drawn as a compact button before the field —
   * "Buscar em" — with "Todos" first. Absent, there is none. The chosen one travels as `categoria`.
   */
  scopes?: readonly StorefrontSearchScope[]
  /** The scope already chosen: a category's own page opens with it. */
  scope?: string
  /** A page whose whole purpose is the search may take the caret; a header must never steal it. */
  autoFocus?: boolean
  /**
   * `inherit` borrows the page's own colours, which is right on a page that is already the shop's
   * background. `panel` paints the bar for the header, which is painted in the shop's header colour,
   * and the button in the brand toned against it — the brand alone vanishes on a header painted in
   * the brand.
   */
  tone?: "inherit" | "panel"
  messages?: UiMessages
}

/**
 * The bar's classes, shared with the live search so the two are one thing to look at. 44px on a
 * phone, where it is pressed with a thumb and has the line to itself; 40px from `shop-md`, beside
 * the header's other controls (36px), where 44 read as the heaviest thing in the row. The field is
 * 16px on a phone: below that, iOS zooms the page into whatever is tapped.
 *
 * The scope is `StorefrontSearchScopeSelect`: as wide as the chosen name, never more than 7rem.
 */
export const SEARCH_BAR = "flex h-11 w-full min-w-0 overflow-hidden rounded-[10px] shop-md:h-10"
export const SEARCH_FIELD = "min-w-0 flex-1 border-0 bg-transparent px-3 text-base text-shop-on-background outline-none shop-md:text-sm"
export const SEARCH_BUTTON = "flex w-12 shrink-0 items-center justify-center shop-md:w-11"

/** The button's paint, by tone. */
export function searchButtonStyle(tone: "inherit" | "panel") {
  return tone === "panel"
    ? { backgroundColor: "var(--shop-primary-on-header)", color: "var(--shop-on-primary-on-header)" }
    : { backgroundColor: "var(--shop-primary)", color: "var(--shop-on-primary)" }
}

/**
 * The shop's search, as a form the address answers.
 *
 * `<form method="get">` with a named field and nothing else: the shop is crawled, and a term has
 * to survive being bookmarked, shared and read back off the URL — none of which a handler that
 * filters a list in memory leaves behind. It also has to work before any JavaScript arrives, which
 * is why the scope travels in a hidden field of the form and the button is a real submit.
 *
 * A bar with the scope's button on the left, the field, and a button with the magnifier. The accessible name and the placeholder are two different sentences
 * on purpose: a placeholder is gone the moment someone types, so it can never be the only name a
 * field has (WCAG 3.3.2). The label wraps the field instead of pointing at an id, because a page
 * may render this twice and two controls answering to one id is a duplicate id, not a second
 * search.
 */
export function StorefrontSearch({
  action,
  name = "q",
  value = "",
  hidden,
  scopes,
  scope = "",
  autoFocus = false,
  tone = "inherit",
  messages = defaultMessages,
}: StorefrontSearchProps) {
  const text = messages.storefront

  return (
    <form
      method="get"
      action={action}
      role="search"
      className={cn(SEARCH_BAR, "flex-1")}
      style={{ backgroundColor: "var(--shop-background)", color: "var(--shop-on-background)", borderColor: "var(--shop-frame)" }}
    >
      {scopes?.length ? <StorefrontSearchScopeSelect scopes={scopes} value={scope} messages={messages} /> : null}

      <label className="flex min-w-0 flex-1">
        <span className="sr-only">{text.search}</span>
        <input
          type="search"
          name={name}
          defaultValue={value}
          placeholder={text.searchPlaceholder}
          autoFocus={autoFocus}
          className={SEARCH_FIELD}
        />
      </label>

      {Object.entries(hidden ?? {}).map(([key, pinned]) => (
        <input key={key} type="hidden" name={key} value={pinned} />
      ))}

      <button type="submit" aria-label={text.searchAction} className={SEARCH_BUTTON} style={searchButtonStyle(tone)}>
        <SearchIcon aria-hidden="true" className="size-[18px]" strokeWidth={2} />
      </button>
    </form>
  )
}
