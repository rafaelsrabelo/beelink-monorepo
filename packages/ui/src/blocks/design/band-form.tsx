"use client"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Checkbox } from "@harness-monorepo/ui/components/checkbox"
import { Field, FieldContent, FieldDescription, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@harness-monorepo/ui/components/select"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { StoreColorField } from "../store/store-color-field"
import type { SectionWidth } from "./design-types"

/** A band's own attributes. `""` for the colour is "the page's own", which is null on the wire. */
export interface BandFormValues {
  width: SectionWidth
  background: string
}

export interface BandFormProps {
  value: BandFormValues
  onChange: (value: BandFormValues) => void
  /** What the page is painted, so turning a band's own colour on starts somewhere visible. */
  pageBackground: string
  onSubmit: () => void
  onCancel: () => void
  pending?: boolean
  messages?: UiMessages
}

/**
 * What a band is, apart from what is in it: how wide it sits, and what colour it is painted.
 *
 * Two fields, and they are the whole reason this level exists. A flat list of blocks has no band
 * to paint — only blocks that happen to be adjacent — so a coloured strip meant painting each of
 * them and hoping they stayed together.
 *
 * There is no text colour here, and its absence is the promise: whatever is written on a band is
 * derived from the band's own colour, so a shopkeeper cannot pick two that make their words
 * vanish.
 */
export function BandForm({
  value,
  onChange,
  pageBackground,
  onSubmit,
  onCancel,
  pending = false,
  messages = defaultMessages,
}: BandFormProps) {
  const text = messages.design
  const banner = messages.banners

  const widthLabel = (width: string) =>
    width === "FULL" ? text.bandWidthFull : text.bandWidthContained

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <Field orientation="responsive">
        <FieldLabel htmlFor="band-width">{text.bandWidth}</FieldLabel>
        <FieldContent>
          <Select
            value={value.width}
            onValueChange={(next: string | null) =>
              onChange({ ...value, width: (next ?? "CONTAINED") as SectionWidth })
            }
          >
            <SelectTrigger id="band-width">
              <SelectValue>{(selected: string) => widthLabel(selected)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CONTAINED">{text.bandWidthContained}</SelectItem>
              <SelectItem value="FULL">{text.bandWidthFull}</SelectItem>
            </SelectContent>
          </Select>
          <FieldDescription>{text.bandWidthHelp}</FieldDescription>
        </FieldContent>
      </Field>

      {/*
        A switch and then a picker, rather than a picker that can be emptied. "The page's colour"
        and "white" are the same swatch and different things, and a shopkeeper cannot tell them
        apart by looking at one — so the difference is said in words before the swatch appears.
      */}
      <Field orientation="horizontal">
        <Checkbox
          id="band-has-background"
          checked={value.background !== ""}
          onCheckedChange={(checked: boolean) =>
            onChange({ ...value, background: checked ? pageBackground : "" })
          }
        />
        <FieldLabel htmlFor="band-has-background">{text.bandColour}</FieldLabel>
      </Field>

      {value.background === "" ? (
        <p className="text-muted-foreground text-sm">{text.bandColourNone}</p>
      ) : (
        <StoreColorField
          id="band-background"
          label={text.bandColour}
          value={value.background}
          onChange={(next) => onChange({ ...value, background: next })}
          pickerSuffix={text.bandColour}
        />
      )}

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
          {banner.cancel}
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? banner.saving : banner.save}
        </Button>
      </div>
    </form>
  )
}
