"use client"

// React
import { useId } from "react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface StorefrontSortOption {
  value: string
  label: string
}

export interface StorefrontSortProps {
  /** The listing's own address, without its query: the form asks for it again, sorted. */
  action: string
  /** The query key the sort travels in. */
  name: string
  value: string
  options: readonly StorefrontSortOption[]
  /**
   * Every other filter on the address, carried through as hidden fields — a sort that dropped the
   * price range would be a different shelf. The page is not one of them: a new order starts at 1.
   */
  fields?: readonly (readonly [string, string])[]
  messages?: UiMessages
}

/**
 * The listing's "Ordenar por", as 5a draws it: a native select in a GET form, so it works with
 * scripting off — a button appears for that case — and submits by itself on change otherwise. It
 * reads no router and holds no state: the address is the state, and the next page load answers it.
 */
export function StorefrontSort({ action, name, value, options, fields = [], messages = defaultMessages }: StorefrontSortProps) {
  const text = messages.storefront
  const id = useId()

  return (
    <form action={action} method="get" className="flex items-center gap-2">
      {fields.map(([key, entry], index) => (
        <input key={`${key}-${index}`} type="hidden" name={key} value={entry} />
      ))}
      <label htmlFor={id} className="text-sm whitespace-nowrap text-shop-muted">
        {text.sortLabel}
      </label>
      <select
        id={id}
        name={name}
        defaultValue={value}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="h-10 rounded-[10px] border border-shop-line-strong bg-shop-fill px-3 text-sm font-semibold text-shop-on-background"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="h-10 rounded-[10px] border border-shop-line-strong px-3 text-sm font-semibold">
          {text.sortApply}
        </button>
      </noscript>
    </form>
  )
}
