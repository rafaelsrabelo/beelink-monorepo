"use client"

// React
import { useState } from "react"

// Libs
import type { RowSelectionState } from "@tanstack/react-table"

// UI
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@harness-monorepo/ui/components/alert-dialog"
import { Button, buttonVariants } from "@harness-monorepo/ui/components/button"
import { cn } from "@harness-monorepo/ui/lib/utils"
import {
  addValue,
  combinationCountOf,
  combinationsOf,
  newKey,
  patchRows,
  removeOption,
  removeValue,
  VARIATION_COMBINATIONS_MAX,
  VARIATION_OPTIONS_MAX,
  type VariationOption,
  type VariationRow,
  type VariationsValue,
} from "@harness-monorepo/ui/lib/variations"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { VariationBulkDialog } from "./variation-bulk-dialog"
import { VariationOptionCard } from "./variation-option-card"
import { VariationPresets } from "./variation-presets"
import { VariationTable } from "./variation-table"

export interface VariationIssues {
  /** Option key → sentence. */
  options?: Readonly<Record<string, string>>
  /** Combination key → sentence. */
  rows?: Readonly<Record<string, string>>
}

export interface ProductVariationsFieldsProps {
  value: VariationsValue
  onChange: (value: VariationsValue) => void
  /** The product's own price, stock and code: what the first combination starts from. */
  base: VariationRow
  trackStock: boolean
  errors?: VariationIssues
  disabled?: boolean
  messages?: UiMessages
}

/**
 * The variations section: the options on top, a row per combination below.
 *
 * Everything here is a draft the screen saves with the rest of the product. Removing an option
 * asks first, because it merges combinations and the ones that disappear stop being sold; removing
 * a value does not, because the chip is right there to add back.
 */
export function ProductVariationsFields({
  value,
  onChange,
  base,
  trackStock,
  errors = {},
  disabled = false,
  messages = defaultMessages,
}: ProductVariationsFieldsProps) {
  const text = messages.catalog.variations
  const [selection, setSelection] = useState<RowSelectionState>({})
  const [bulk, setBulk] = useState<"price" | "stock" | null>(null)
  const [removing, setRemoving] = useState<VariationOption | null>(null)

  const combinations = combinationsOf(value, base)
  const count = combinationCountOf(value.options)
  const selected = combinations.filter((combination) => selection[combination.key])

  function updateOption(optionKey: string, change: (option: VariationOption) => VariationOption) {
    onChange({
      ...value,
      options: value.options.map((option) => (option.key === optionKey ? change(option) : option)),
    })
  }

  function applyBulk(entered: string) {
    onChange(patchRows(value, selected, bulk === "price" ? { price: entered } : { stock: entered }))
    setBulk(null)
  }

  const afterRemoval = removing ? combinationCountOf(value.options.filter((option) => option.key !== removing.key)) : 0

  return (
    <div className="flex flex-col gap-4">
      <VariationPresets
        taken={value.options.map((option) => option.name)}
        full={value.options.length >= VARIATION_OPTIONS_MAX}
        disabled={disabled}
        messages={messages}
        onAdd={(preset, name) =>
          onChange({
            ...value,
            options: [...value.options, { key: newKey(), name, isColor: preset === "color", values: [] }],
          })
        }
      />

      {value.options.length === 0 ? <p className="text-muted-foreground text-sm">{text.empty}</p> : null}

      {value.options.map((option, index) => (
        <VariationOptionCard
          key={option.key}
          option={option}
          number={index + 1}
          error={errors.options?.[option.key]}
          disabled={disabled}
          messages={messages}
          onRename={(name) => updateOption(option.key, (current) => ({ ...current, name }))}
          onAddValue={(name, colorHex) => onChange(addValue(value, option.key, { key: newKey(), name, colorHex }, base))}
          onRemoveValue={(valueKey) => onChange(removeValue(value, option.key, valueKey))}
          onReorderValues={(keys) =>
            updateOption(option.key, (current) => ({
              ...current,
              values: keys.flatMap((key) => current.values.filter((entry) => entry.key === key)),
            }))
          }
          onColor={(valueKey, colorHex) =>
            updateOption(option.key, (current) => ({
              ...current,
              values: current.values.map((entry) => (entry.key === valueKey ? { ...entry, colorHex } : entry)),
            }))
          }
          // An option with no value yet merges nothing, so there is nothing to confirm.
          onRemove={() =>
            option.values.length === 0 ? onChange(removeOption(value, option.key, base)) : setRemoving(option)
          }
        />
      ))}

      {count > VARIATION_COMBINATIONS_MAX ? (
        <p role="alert" className="text-destructive text-sm">
          {format(text.tooMany, { count: String(count) })}
        </p>
      ) : combinations.length > 0 ? (
        <div className="border-shell-border overflow-x-auto rounded-xl border">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
            <p className="text-sm">
              <span className="font-medium">{format(text.combinations, { count: String(combinations.length) })}</span>
              <span className="text-muted-foreground">
                {" · "}
                {selected.length > 0 ? format(text.selected, { count: String(selected.length) }) : text.noneSelected}
              </span>
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" disabled={disabled || selected.length === 0} onClick={() => setBulk("price")}>
                {text.samePrice}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled || selected.length === 0 || !trackStock}
                onClick={() => setBulk("stock")}
              >
                {text.setStock}
              </Button>
            </div>
          </div>
          <VariationTable
            combinations={combinations}
            trackStock={trackStock}
            selection={selection}
            onSelection={setSelection}
            errors={errors.rows}
            disabled={disabled}
            messages={messages}
            onRow={(combination, patch) => onChange(patchRows(value, [combination], patch))}
          />
        </div>
      ) : null}

      <VariationBulkDialog
        title={
          bulk === null
            ? null
            : format(bulk === "price" ? text.samePriceTitle : text.setStockTitle, { count: String(selected.length) })
        }
        label={bulk === "stock" ? text.columnStock : text.columnPrice}
        inputMode={bulk === "stock" ? "numeric" : "decimal"}
        onApply={applyBulk}
        onClose={() => setBulk(null)}
        messages={messages}
      />

      <AlertDialog open={removing !== null} onOpenChange={(open: boolean) => (open ? undefined : setRemoving(null))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{format(text.removeOptionTitle, { name: removing?.name.trim() ?? "" })}</AlertDialogTitle>
            <AlertDialogDescription>
              {format(text.removeOptionBody, { from: String(count), to: String(Math.max(afterRemoval, 1)) })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {/* Cancel keeps the default focus: Enter on a question about removing must not remove. */}
            <AlertDialogCancel>{text.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className={cn(buttonVariants({ variant: "destructive" }))}
              onClick={() => {
                if (removing) onChange(removeOption(value, removing.key, base))
                setRemoving(null)
              }}
            >
              {text.removeOptionConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
