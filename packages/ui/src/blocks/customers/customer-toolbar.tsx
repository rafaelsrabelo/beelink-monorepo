"use client"

// Libs
import { ArrowUpDownIcon, SearchIcon } from "lucide-react"

// UI
import { Input } from "@harness-monorepo/ui/components/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@harness-monorepo/ui/components/select"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { CUSTOMER_SORTS, type CustomerSortValue } from "./customer-types"

function sortOf(value: unknown): CustomerSortValue {
  return CUSTOMER_SORTS.find((sort) => sort === value) ?? "RECENT"
}

export interface CustomerToolbarProps {
  /** The text in the box, as typed: the screen settles it before it reaches the address. */
  search: string
  onSearchChange: (search: string) => void
  sort: CustomerSortValue
  onSortChange: (sort: CustomerSortValue) => void
  messages?: UiMessages
}

/** The search over name, e-mail and phone, and the order the list comes in. */
export function CustomerToolbar({ search, onSearchChange, sort, onSortChange, messages = defaultMessages }: CustomerToolbarProps) {
  const text = messages.customers

  return (
    <div className="flex flex-col gap-2 @3xl/main:flex-row @3xl/main:items-center @3xl/main:justify-between">
      <div className="relative @3xl/main:max-w-sm @3xl/main:flex-1">
        <SearchIcon aria-hidden="true" className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          type="search"
          autoComplete="off"
          className="w-full pl-8"
          aria-label={text.searchLabel}
          placeholder={text.searchPlaceholder}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>

      <Select value={sort} onValueChange={(next: unknown) => onSortChange(sortOf(next))}>
        <SelectTrigger aria-label={text.sortLabel} className="self-start @3xl/main:self-auto">
          <ArrowUpDownIcon aria-hidden="true" className="text-muted-foreground" />
          {/* Base UI shows the raw value unless told how to read it. */}
          <SelectValue>{(selected: string) => text.sorts[sortOf(selected)]}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {CUSTOMER_SORTS.map((option) => (
            <SelectItem key={option} value={option}>
              {text.sorts[option]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
