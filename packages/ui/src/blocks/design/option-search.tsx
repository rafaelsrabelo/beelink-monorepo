"use client"

// React
import { useRef, useState, type RefObject } from "react"

// Libs
import { CheckIcon, PlusIcon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Field, FieldContent, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { TargetOption } from "./target-fields"

export interface OptionSearchProps {
  /** The input's id, so the label names it. */
  id: string
  label: string
  placeholder: string
  options: readonly TargetOption[]
  onPick: (id: string) => void
  /** The one chosen, marked, when this picks one thing. */
  selectedId?: string
  /** Left out of the list: what has been picked already, when this adds to a list. */
  exclude?: readonly string[]
  /**
   * What each button does, with `{name}` for the option's. Without it a button is named by the
   * option alone, which is right for a choice and wrong for an "add".
   */
  actionLabel?: string
  emptyText: string
  /** How many matches are drawn at once. A search that needs a ninth is a search that needs a letter more. */
  limit?: number
  /**
   * Whether the options have arrived. While they are on their way the list is grey rows, and when
   * they could not be read it says so: either one drawn as "nothing by that name" is a lie.
   */
  state?: "ready" | "loading" | "failed"
  /** The search box, for a screen that has to put the focus back in it. */
  inputRef?: RefObject<HTMLInputElement | null>
  /**
   * What is typed, for a screen whose list is longer than it holds: it asks the API for the matches
   * and hands them back as `options`, which are still narrowed here as the same letters.
   */
  onQueryChange?: (query: string) => void
  messages?: UiMessages
}

/** Lower case with the accents gone, so "calca" finds "Calça" — a shopkeeper types on a phone. */
function folded(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase()
}

/**
 * A list the owner narrows by typing, then picks from. A category for a showcase, or the products
 * of a hand-picked one: a shop's categories are tens and its products hundreds, and a select of
 * a hundred names on a phone is a list nobody finds anything in.
 *
 * Buttons and not a combobox: each match is one press away and named for what it does, which a
 * screen reader reads as plainly as it reads any other button.
 */
export function OptionSearch({
  id,
  label,
  placeholder,
  options,
  onPick,
  selectedId,
  exclude = [],
  actionLabel,
  emptyText,
  limit = 8,
  state = "ready",
  inputRef,
  onQueryChange,
  messages = defaultMessages,
}: OptionSearchProps) {
  const [query, setQuery] = useState("")
  const ownRef = useRef<HTMLInputElement>(null)
  const input = inputRef ?? ownRef
  const text = messages.design.showcase
  const needle = folded(query.trim())
  const matches = options
    .filter((option) => !exclude.includes(option.id))
    .filter((option) => needle === "" || folded(option.name).includes(needle))
    .slice(0, limit)

  // An add takes the pressed button out of the list; the focus goes back to the search, one Tab from
  // the next match, instead of falling to the top of the sheet.
  const pick = (id: string) => {
    onPick(id)
    if (actionLabel) input.current?.focus()
  }

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <FieldContent className="gap-2">
        <Input
          ref={input}
          id={id}
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            onQueryChange?.(event.target.value)
          }}
          // The search sits inside the component's form, and Enter there — or a phone keyboard's
          // search key — would submit it: a showcase saved to the live shop mid-search. It narrows
          // instead, and picks the one match when only one is left.
          onKeyDown={(event) => {
            if (event.key !== "Enter") return
            event.preventDefault()
            if (matches.length === 1) pick(matches[0]!.id)
          }}
          enterKeyHint="search"
          placeholder={placeholder}
          autoComplete="off"
        />
        {state === "loading" ? (
          <div role="status" aria-busy="true" className="flex flex-col gap-1">
            <span className="sr-only">{text.optionsLoading}</span>
            {[0, 1, 2].map((row) => (
              <Skeleton key={row} aria-hidden="true" className="h-8 w-full" />
            ))}
          </div>
        ) : state === "failed" ? (
          <p role="alert" className="text-destructive text-sm">
            {text.optionsFailed}
          </p>
        ) : matches.length ? (
          <ul className="flex flex-col gap-1">
            {matches.map((option) => {
              const chosen = option.id === selectedId

              return (
                <li key={option.id}>
                  <Button
                    type="button"
                    variant={chosen ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    {...(selectedId !== undefined ? { "aria-pressed": chosen } : {})}
                    {...(actionLabel ? { "aria-label": format(actionLabel, { name: option.name }) } : {})}
                    onClick={() => pick(option.id)}
                  >
                    {actionLabel ? <PlusIcon aria-hidden="true" /> : chosen ? <CheckIcon aria-hidden="true" /> : null}
                    <span className="truncate">{option.name}</span>
                  </Button>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">{emptyText}</p>
        )}
      </FieldContent>
    </Field>
  )
}
