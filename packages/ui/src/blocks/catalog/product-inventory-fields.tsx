"use client"

// UI
import { Checkbox } from "@harness-monorepo/ui/components/checkbox"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { ProductFormValues } from "./product-form-types"

export interface ProductInventoryFieldsProps {
  value: ProductFormValues
  onChange: (value: ProductFormValues) => void
  disabled?: boolean
  messages?: UiMessages
}

/**
 * Whether the shop counts this thing, and what it calls it.
 *
 * Counting is off by default. Most shops here sell made to order, and a quantity of zero on a
 * product nobody counts would take it out of the shop window for no reason at all — which is why
 * "not counted" and "none left" are two states and not one.
 */
export function ProductInventoryFields({
  value,
  onChange,
  disabled = false,
  messages = defaultMessages,
}: ProductInventoryFieldsProps) {
  const fields = messages.catalog.fields

  return (
    <div className="flex flex-col gap-4">
      <Field orientation="horizontal">
        <Checkbox
          id="product-track-stock"
          disabled={disabled}
          checked={value.trackStock}
          onCheckedChange={(checked) => onChange({ ...value, trackStock: checked })}
        />
        <FieldContent>
          <FieldLabel htmlFor="product-track-stock">{fields.trackStockLabel}</FieldLabel>
          <FieldDescription>{fields.trackStockHint}</FieldDescription>
        </FieldContent>
      </Field>

      {/* The count only exists while it is counted. Leaving it on screen, disabled, would ask the
          shopkeeper to read a number that means nothing. */}
      {value.trackStock ? (
        <Field>
          <FieldLabel htmlFor="product-stock">{fields.stockLabel}</FieldLabel>
          <Input
            id="product-stock"
            inputMode="numeric"
            autoComplete="off"
            disabled={disabled}
            className="max-w-40"
            value={value.stock}
            onChange={(event) => onChange({ ...value, stock: event.target.value })}
          />
        </Field>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="product-sku">{fields.skuLabel}</FieldLabel>
          <Input
            id="product-sku"
            autoComplete="off"
            disabled={disabled}
            value={value.sku}
            onChange={(event) => onChange({ ...value, sku: event.target.value })}
          />
          <FieldDescription>{fields.skuHint}</FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="product-barcode">{fields.barcodeLabel}</FieldLabel>
          <Input
            id="product-barcode"
            autoComplete="off"
            inputMode="numeric"
            disabled={disabled}
            value={value.barcode}
            onChange={(event) => onChange({ ...value, barcode: event.target.value })}
          />
        </Field>
      </div>
    </div>
  )
}
