"use client"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { StoreAddressValues } from "./store-schemas"
import type { FieldIssues } from "./store-types"

export interface StoreAddressFieldsProps {
  value: StoreAddressValues
  onChange: (value: StoreAddressValues) => void
  errors?: FieldIssues<StoreAddressValues>
  /**
   * Asked to fill the address from the postcode. The screen owns the lookup and hands back a whole
   * address through `onChange` — a block never calls anything itself.
   */
  onZipCodeLookup?: (zipCode: string) => void
  lookupPending?: boolean
  disabled?: boolean
  messages?: UiMessages
}

/** Where the shop is. A visitor never sees it; the delivery radius is measured from it. */
export function StoreAddressFields({
  value,
  onChange,
  errors,
  onZipCodeLookup,
  lookupPending = false,
  disabled = false,
  messages = defaultMessages,
}: StoreAddressFieldsProps) {
  const text = messages.store.address

  return (
    <FieldGroup>
      <FieldDescription>{text.hint}</FieldDescription>

      <Field>
        <FieldLabel htmlFor="store-zip-code">{text.zipCodeLabel}</FieldLabel>
        <div className="flex items-start gap-2">
          <Input
            id="store-zip-code"
            inputMode="numeric"
            maxLength={9}
            value={value.zipCode}
            disabled={disabled}
            placeholder={text.zipCodePlaceholder}
            aria-invalid={Boolean(errors?.zipCode)}
            onChange={(event) => onChange({ ...value, zipCode: event.target.value })}
          />
          {onZipCodeLookup ? (
            <Button
              type="button"
              variant="outline"
              disabled={disabled || lookupPending}
              onClick={() => onZipCodeLookup(value.zipCode)}
            >
              {lookupPending ? text.lookingUp : text.lookup}
            </Button>
          ) : null}
        </div>
        <FieldDescription>{text.zipCodeHint}</FieldDescription>
        <FieldError errors={[errors?.zipCode]} />
      </Field>

      <div className="grid gap-4 @md/main:grid-cols-3">
        <Field className="@md/main:col-span-2">
          <FieldLabel htmlFor="store-street">{text.streetLabel}</FieldLabel>
          <Input
            id="store-street"
            value={value.street}
            disabled={disabled}
            placeholder={text.streetPlaceholder}
            aria-invalid={Boolean(errors?.street)}
            onChange={(event) => onChange({ ...value, street: event.target.value })}
          />
          <FieldError errors={[errors?.street]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="store-number">{text.numberLabel}</FieldLabel>
          <Input
            id="store-number"
            value={value.number}
            disabled={disabled}
            placeholder={text.numberPlaceholder}
            aria-invalid={Boolean(errors?.number)}
            onChange={(event) => onChange({ ...value, number: event.target.value })}
          />
          <FieldError errors={[errors?.number]} />
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor="store-complement">{text.complementLabel}</FieldLabel>
        <Input
          id="store-complement"
          value={value.complement}
          disabled={disabled}
          placeholder={text.complementPlaceholder}
          onChange={(event) => onChange({ ...value, complement: event.target.value })}
        />
      </Field>

      <div className="grid gap-4 @md/main:grid-cols-3">
        <Field>
          <FieldLabel htmlFor="store-neighborhood">{text.neighborhoodLabel}</FieldLabel>
          <Input
            id="store-neighborhood"
            value={value.neighborhood}
            disabled={disabled}
            placeholder={text.neighborhoodPlaceholder}
            onChange={(event) => onChange({ ...value, neighborhood: event.target.value })}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="store-city">{text.cityLabel}</FieldLabel>
          <Input
            id="store-city"
            value={value.city}
            disabled={disabled}
            placeholder={text.cityPlaceholder}
            aria-invalid={Boolean(errors?.city)}
            onChange={(event) => onChange({ ...value, city: event.target.value })}
          />
          <FieldError errors={[errors?.city]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="store-state">{text.stateLabel}</FieldLabel>
          <Input
            id="store-state"
            maxLength={2}
            value={value.state}
            disabled={disabled}
            placeholder={text.statePlaceholder}
            aria-invalid={Boolean(errors?.state)}
            onChange={(event) => onChange({ ...value, state: event.target.value.toUpperCase() })}
          />
          <FieldError errors={[errors?.state]} />
        </Field>
      </div>
    </FieldGroup>
  )
}
