"use client"

// UI
import { Checkbox } from "@harness-monorepo/ui/components/checkbox"
import { Field, FieldLabel } from "@harness-monorepo/ui/components/field"

// Block
import { StoreColorField } from "../store/store-color-field"

export interface BandColourFieldProps {
  /** `""` is "the page's own", which is null on the wire. */
  value: string
  onChange: (value: string) => void
  /** What the page is painted, so turning a band's own colour on starts somewhere visible. */
  pageBackground: string
  /** What the switch and the swatch are called. A band and the strip say different things. */
  label: string
  /** Said in words when the switch is off. */
  noneLabel: string
  /** Names the native picker, so the two controls of one colour do not share an accessible name. */
  id: string
}

/**
 * A switch and then a picker, rather than a picker that can be emptied.
 *
 * "The page's colour" and "white" are the same swatch and different things, and a shopkeeper
 * cannot tell them apart by looking at one — so the difference is said in words before the swatch
 * appears. Its own block because it is asked in two voices: a band's, and the announcement strip's,
 * whose band is not drawn where it sits and whose colour is the strip's to the owner.
 */
export function BandColourField({
  value,
  onChange,
  pageBackground,
  label,
  noneLabel,
  id,
}: BandColourFieldProps) {
  return (
    <>
      <Field orientation="horizontal">
        <Checkbox
          id={`${id}-on`}
          checked={value !== ""}
          onCheckedChange={(checked: boolean) => onChange(checked ? pageBackground : "")}
        />
        <FieldLabel htmlFor={`${id}-on`}>{label}</FieldLabel>
      </Field>

      {value === "" ? (
        <p className="text-muted-foreground text-sm">{noneLabel}</p>
      ) : (
        <StoreColorField id={id} label={label} value={value} onChange={onChange} pickerSuffix={label} />
      )}
    </>
  )
}
