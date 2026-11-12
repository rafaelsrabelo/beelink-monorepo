"use client"

// UI
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@harness-monorepo/ui/components/select"

// Block
import type { AffiliateTableOption } from "@harness-monorepo/ui/lib/affiliates"

export interface AffiliateTableSelectProps {
  id: string
  tables: readonly AffiliateTableOption[]
  value: string
  onChange: (tableId: string) => void
  disabled?: boolean
  invalid?: boolean
  describedBy?: string
}

const labelOf = (table: AffiliateTableOption): string => `${table.name} · ${table.rate}`

/** The commission table an affiliate is on (IMPULSEIA-104), each said with its rate. */
export function AffiliateTableSelect({ id, tables, value, onChange, disabled = false, invalid = false, describedBy }: AffiliateTableSelectProps) {
  return (
    <Select value={value} onValueChange={(next: unknown) => onChange(typeof next === "string" ? next : "")} disabled={disabled}>
      <SelectTrigger id={id} aria-invalid={invalid ? true : undefined} aria-describedby={describedBy} className="w-full">
        {/* Base UI shows the raw value unless told how to read it. */}
        <SelectValue>{(selected: string) => {
          const table = tables.find((candidate) => candidate.id === selected)
          return table ? labelOf(table) : ""
        }}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {tables.map((table) => (
          <SelectItem key={table.id} value={table.id}>
            {labelOf(table)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
