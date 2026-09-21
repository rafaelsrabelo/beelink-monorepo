"use client"

// React
import { useRef } from "react"

// Libs
import { Autocomplete } from "@base-ui/react/autocomplete"
import { Loader2Icon, MapPinIcon } from "lucide-react"

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
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { StoreAddressValues } from "./store-schemas"
import type { FieldIssues, StoreAddressSuggestion, StoreZipCodeAddress } from "./store-types"

export interface StoreAddressFieldsProps {
  value: StoreAddressValues
  onChange: (value: StoreAddressValues) => void
  errors?: FieldIssues<StoreAddressValues>
  /**
   * Asked to fill the address from the postcode. The screen owns the lookup — where ViaCEP is
   * reached and how a refusal becomes a sentence is its business — and this block owns what happens
   * to the answer, which is to merge it into the fields.
   *
   * It resolves with `null` when there is nothing to fill, and never rejects: an unhandled
   * rejection inside a form is a blank screen over a postcode that can still be typed by hand.
   */
  onZipCodeLookup?: (zipCode: string) => Promise<StoreZipCodeAddress | null>
  lookupPending?: boolean
  /**
   * What has been typed into the street field so far, for the screen to search with. The block
   * does not search — it does not know a provider exists — and the screen debounces before it
   * asks, because a request per keystroke is a bill per keystroke.
   */
  onAddressSearch?: (query: string) => void
  /** What the screen's search answered. Absent means no search is wired up and the field is plain. */
  suggestions?: readonly StoreAddressSuggestion[]
  searchPending?: boolean
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
  onAddressSearch,
  suggestions = [],
  searchPending = false,
  disabled = false,
  messages = defaultMessages,
}: StoreAddressFieldsProps) {
  const text = messages.store.address

  /**
   * What is on screen *now*, not what was on screen when the button was pressed. The lookup may
   * take up to four seconds and only the button is disabled while it runs, so a shopkeeper can
   * type a street number into the closure's stale copy and watch it vanish when the answer lands.
   */
  const latest = useRef(value)
  latest.current = value

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
              onClick={() => {
                void onZipCodeLookup(value.zipCode).then((address) => {
                  if (address) onChange(fillFrom(latest.current, address))
                })
              }}
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
          {onAddressSearch ? (
            <Autocomplete.Root
              items={suggestions as StoreAddressSuggestion[]}
              value={value.street}
              // The search already decided what matches; filtering the answer again here would
              // hide a suggestion whose street reads differently from what was typed, which is
              // most of them — "Lavras" finding "Rua Lavras" is the whole point.
              filter={null}
              // One handler for both, because there is only one event. Pressing an item also
              // changes the value, and handling the press separately meant the merge ran and was
              // then overwritten a tick later by this — with a stale copy of the group, so the
              // four fields it had just filled went back to empty.
              onValueChange={(street, details) => {
                if (details.reason === "item-press") {
                  // Matched on the label because that is what an item turns into: Autocomplete
                  // takes the item's own text, and this item renders exactly the label. Keep the
                  // two together — a second line inside the item would break this lookup silently.
                  const picked = suggestions.find((suggestion) => suggestion.label === street)
                  if (picked) {
                    onChange(fillFromSuggestion(value, picked))
                    return
                  }
                }

                onChange({ ...value, street })
                onAddressSearch(street)
              }}
            >
              <div className="relative">
                <Autocomplete.Input
                  render={
                    <Input
                      id="store-street"
                      disabled={disabled}
                      placeholder={text.streetPlaceholder}
                      aria-invalid={Boolean(errors?.street)}
                    />
                  }
                />
                {searchPending ? (
                  <Loader2Icon
                    aria-hidden="true"
                    className="absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
                  />
                ) : null}
              </div>

              <Autocomplete.Portal>
                <Autocomplete.Positioner sideOffset={4} className="z-50 w-[var(--anchor-width)]">
                  <Autocomplete.Popup className="max-h-64 overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md">
                    <Autocomplete.Empty className="px-2 py-1.5 text-sm text-muted-foreground">
                      {searchPending ? text.searching : text.noSuggestions}
                    </Autocomplete.Empty>
                    <Autocomplete.List>
                      {(suggestion: StoreAddressSuggestion) => (
                        <Autocomplete.Item
                          key={suggestion.id}
                          value={suggestion}
                          className={cn(
                            "flex cursor-default items-start gap-2 rounded-md px-2 py-1.5 text-sm",
                            "data-highlighted:bg-accent data-highlighted:text-accent-foreground",
                          )}
                        >
                          <MapPinIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                          <span>{suggestion.label}</span>
                        </Autocomplete.Item>
                      )}
                    </Autocomplete.List>
                  </Autocomplete.Popup>
                </Autocomplete.Positioner>
              </Autocomplete.Portal>
            </Autocomplete.Root>
          ) : (
            <Input
              id="store-street"
              value={value.street}
              disabled={disabled}
              placeholder={text.streetPlaceholder}
              aria-invalid={Boolean(errors?.street)}
              onChange={(event) => onChange({ ...value, street: event.target.value })}
            />
          )}
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

/**
 * Fills what came back and keeps what did not.
 *
 * ViaCEP answers 200 for a town with a single postcode and leaves `logradouro` and `bairro` empty
 * — 88870-000 and 76890-000 both do. Assigning those through would erase a street the shopkeeper
 * had already typed, which is the opposite of a convenience. The postcode itself is left alone on
 * the same principle: what they typed is what they keep seeing, and the payload mapper strips the
 * mask at submit.
 */
function fillFrom(current: StoreAddressValues, found: StoreZipCodeAddress): StoreAddressValues {
  return {
    ...current,
    street: found.street || current.street,
    neighborhood: found.neighborhood || current.neighborhood,
    city: found.city || current.city,
    state: found.state || current.state,
  }
}

/**
 * A picked suggestion fills everything it knows and keeps everything it does not — the same rule
 * the postcode lookup follows, and for the same reason: a provider answers with what it has, and a
 * blank field written through would erase what the shopkeeper had already typed.
 *
 * The number is never touched. No search returns a flat or a block, and overwriting "Apto 101"
 * with nothing is the one mistake that costs a delivery.
 */
function fillFromSuggestion(current: StoreAddressValues, found: StoreAddressSuggestion): StoreAddressValues {
  return {
    ...current,
    street: found.street || current.street,
    neighborhood: found.neighborhood || current.neighborhood,
    city: found.city || current.city,
    state: found.state || current.state,
    zipCode: found.zipCode || current.zipCode,
  }
}
