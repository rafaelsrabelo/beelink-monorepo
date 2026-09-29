"use client"

// React
import { useState, type FormEvent } from "react"

// Libs
import { SearchIcon } from "lucide-react"

// Utils
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface ConversationFilter {
  key: string
  label: string
  href: string
  active: boolean
}

export interface ConversationFiltersProps {
  filters: readonly ConversationFilter[]
  /** The search as the address has it. */
  search: string
  onSearch: (term: string) => void
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/** Open, unread or every conversation — links, so each is an address — and the search. */
export function ConversationFilters({ filters, search, onSearch, linkComponent: Link = AnchorLink, messages = defaultMessages }: ConversationFiltersProps) {
  const text = messages.conversations
  const [term, setTerm] = useState(search)
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSearch(term.trim())
  }

  return (
    <div className="flex flex-col gap-2 p-3">
      <form role="search" onSubmit={submit} className="border-input focus-within:border-ring flex items-center gap-2 rounded-md border px-2.5">
        <SearchIcon aria-hidden="true" className="text-muted-foreground size-4" />
        <input
          type="search"
          value={term}
          onChange={(event) => {
            setTerm(event.target.value)
            // Emptied — the clear button, or by hand — the list goes back to every conversation at once.
            if (event.target.value === "" && search !== "") onSearch("")
          }}
          maxLength={120}
          aria-label={text.searchLabel}
          placeholder={text.searchPlaceholder}
          className="placeholder:text-muted-foreground h-9 min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
      </form>
      <nav aria-label={text.filtersLabel} className="flex gap-1.5">
        {filters.map((filter) => (
          <Link
            key={filter.key}
            href={filter.href}
            aria-current={filter.active ? "true" : undefined}
            className={cn("rounded-full border px-3 py-1 text-sm", filter.active ? "bg-foreground text-background border-foreground" : "hover:bg-muted")}
          >
            {filter.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
