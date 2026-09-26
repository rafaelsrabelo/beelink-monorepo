"use client"

// UI
import { Field, FieldContent, FieldDescription, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@harness-monorepo/ui/components/select"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { BandColourField } from "./band-colour-field"
import type { SectionWidth } from "./design-types"

/** A band's own attributes. `""` for the colour is "the page's own", which is null on the wire. */
export interface BandFormValues {
  /** What the band is called on the page. `""` is unnamed, and an unnamed band is not in a site's menu. */
  name: string
  width: SectionWidth
  background: string
}

export interface BandStyleFieldsProps {
  value: BandFormValues
  onChange: (value: BandFormValues) => void
  /**
   * The band that holds the announcement strip. It is drawn above the header, edge to edge, whatever
   * it says, and never in a site's menu — so only its colour is asked, in the strip's own words.
   * Offering "ponta a ponta" there was read as a promise the strip then broke.
   */
  strip?: boolean
  /** How many blocks the band holds: past one, a change here is a change to every one of them. */
  sharedWith?: number
  /** What the page is painted, so turning a band's own colour on starts somewhere visible. */
  pageBackground: string
  messages?: UiMessages
}

/**
 * What a band is, apart from what is in it: what it is called, how wide it sits, and what colour it
 * is painted — the chosen block's Estilo tab, or a band's whole panel when it is chosen on its own.
 *
 * The colour and the width are the whole reason this level exists. A flat list of blocks has no band
 * to paint — only blocks that happen to be adjacent — so a coloured strip meant painting each of
 * them and hoping they stayed together.
 *
 * There is no text colour here, and its absence is the promise: whatever is written on a band is
 * derived from the band's own colour, so a shopkeeper cannot pick two that make their words vanish.
 * Nor is there spacing: one rule spaces every band (`band-rhythm.ts`), by the owner's decision.
 */
export function BandStyleFields({
  value,
  onChange,
  strip = false,
  sharedWith = 1,
  pageBackground,
  messages = defaultMessages,
}: BandStyleFieldsProps) {
  const text = messages.design

  const widthLabel = (width: string) => (width === "FULL" ? text.bandWidthFull : text.bandWidthContained)

  return (
    <>
      {sharedWith > 1 ? (
        <p className="text-muted-foreground text-xs">{format(text.inspector.sharedWith, { count: String(sharedWith) })}</p>
      ) : null}

      {strip ? (
        <p className="text-muted-foreground text-xs">{text.stripBandHelp}</p>
      ) : (
        <>
          <Field>
            <FieldLabel htmlFor="band-name">{text.bandName}</FieldLabel>
            <FieldContent>
              <Input
                id="band-name"
                value={value.name}
                maxLength={60}
                onChange={(event) => onChange({ ...value, name: event.target.value })}
                placeholder={text.bandNamePlaceholder}
              />
              <FieldDescription>{text.bandNameHelp}</FieldDescription>
            </FieldContent>
          </Field>

          <Field orientation="responsive">
            <FieldLabel htmlFor="band-width">{text.bandWidth}</FieldLabel>
            <FieldContent>
              <Select
                value={value.width}
                onValueChange={(next: string | null) => onChange({ ...value, width: next === "FULL" ? "FULL" : "CONTAINED" })}
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
        </>
      )}

      <BandColourField
        id="band-background"
        value={value.background}
        onChange={(next) => onChange({ ...value, background: next })}
        pageBackground={pageBackground}
        label={strip ? text.announcementColour : text.bandColour}
        noneLabel={strip ? text.announcementColourNone : text.bandColourNone}
      />
    </>
  )
}
