"use client"

// React
import { useState } from "react"

// Libs
import { CheckIcon, PlusIcon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Field, FieldContent, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"

// Locales
import { format } from "@harness-monorepo/ui/locales/index"

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
}: OptionSearchProps) {
  const [query, setQuery] = useState("")
  const needle = folded(query.trim())
  const matches = options
    .filter((option) => !exclude.includes(option.id))
    .filter((option) => needle === "" || folded(option.name).includes(needle))
    .slice(0, limit)

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <FieldContent className="gap-2">
        <Input
          id={id}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          autoComplete="off"
        />
        {matches.length ? (
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
                    onClick={() => onPick(option.id)}
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
