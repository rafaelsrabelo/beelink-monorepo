"use client"

// UI
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@harness-monorepo/ui/components/select"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { LEAD_STATUSES, type LeadStatus } from "./lead-types"

export interface LeadStatusSelectProps {
  value: LeadStatus
  onChange: (status: LeadStatus) => void
  /** The trigger's accessible name — a row's names the person, the detail's says "Status". */
  label: string
  id?: string
  disabled?: boolean
  className?: string
  messages?: UiMessages
}

/** Where a lead stands, changed in place. Shared by the table's row and the detail. */
export function LeadStatusSelect({ value, onChange, label, id, disabled = false, className, messages = defaultMessages }: LeadStatusSelectProps) {
  const text = messages.leads

  return (
    <Select value={value} onValueChange={(next: string | null) => next && onChange(next as LeadStatus)} disabled={disabled}>
      <SelectTrigger id={id} aria-label={label} className={cn("w-40", className)}>
        <SelectValue>{(selected: string) => text.statuses[selected as LeadStatus]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {LEAD_STATUSES.map((status) => (
          <SelectItem key={status} value={status}>
            {text.statuses[status]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
