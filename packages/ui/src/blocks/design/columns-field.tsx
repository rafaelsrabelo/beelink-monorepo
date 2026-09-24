"use client"

// UI
import { Field, FieldContent, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@harness-monorepo/ui/components/select"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface ColumnsFieldProps {
  /** `0` is "let the grid decide", which is what null means on the wire. */
  value: number
  onChange: (value: number) => void
  messages?: UiMessages
}

/**
 * How many across a grid lays, where its cell has room: "automático", or two to six. The categories'
 * grid and a showcase's ask the same question, and the API holds both to the same range.
 */
export function ColumnsField({ value, onChange, messages = defaultMessages }: ColumnsFieldProps) {
  const text = messages.design

  return (
    <Field orientation="responsive">
      <FieldLabel htmlFor="component-columns">{text.columnsLabel}</FieldLabel>
      <FieldContent>
        <Select value={String(value)} onValueChange={(next: string | null) => onChange(Number(next ?? 0))}>
          <SelectTrigger id="component-columns">
            <SelectValue>{(selected: string) => (selected === "0" ? text.columnsAuto : selected)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">{text.columnsAuto}</SelectItem>
            {[2, 3, 4, 5, 6].map((count) => (
              <SelectItem key={count} value={String(count)}>
                {String(count)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldContent>
    </Field>
  )
}
