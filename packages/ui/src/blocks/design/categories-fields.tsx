"use client"

// UI
import { Field, FieldContent, FieldDescription, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@harness-monorepo/ui/components/select"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { ComponentDisplay } from "./design-types"
import { DisplayField } from "./display-field"

export interface CategoriesValue {
  display: ComponentDisplay
  /** `0` is "let the grid decide", which is what null means on the wire. */
  columns: number
}

export interface CategoriesFieldsProps {
  value: CategoriesValue
  onChange: (next: Partial<CategoriesValue>) => void
  messages?: UiMessages
}

const RAIL_OR_GRID = ["RAIL", "GRID"] as const satisfies readonly ComponentDisplay[]

/**
 * The categories block's own fields: a rail or a grid, and how many across when it is a grid.
 *
 * The columns are asked only of a grid. A rail's cards have a width of their own at every screen,
 * so a count offered there would be a control that changes nothing.
 */
export function CategoriesFields({ value, onChange, messages = defaultMessages }: CategoriesFieldsProps) {
  const text = messages.design

  return (
    <>
      <div className="flex flex-col gap-2">
        <DisplayField
          value={value.display}
          options={RAIL_OR_GRID}
          onChange={(display) => onChange({ display })}
          messages={messages}
        />
        <FieldDescription>{value.display === "RAIL" ? text.categoriesRailHint : text.categoriesGridHint}</FieldDescription>
      </div>

      {value.display === "GRID" ? (
        <Field orientation="responsive">
          <FieldLabel htmlFor="component-columns">{text.columnsLabel}</FieldLabel>
          <FieldContent>
            <Select value={String(value.columns)} onValueChange={(next: string | null) => onChange({ columns: Number(next ?? 0) })}>
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
      ) : null}
    </>
  )
}
