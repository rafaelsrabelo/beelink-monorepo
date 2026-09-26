"use client"

// UI
import { Field, FieldDescription, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"
import { Textarea } from "@harness-monorepo/ui/components/textarea"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface PageSeoValue {
  title: string
  description: string
  imageUrl: string
}

export interface PageSeoFieldsProps {
  id: string
  value: PageSeoValue
  onChange: (value: PageSeoValue) => void
  messages?: UiMessages
}

/** The columns' lengths: what a search result shows before it cuts. */
const TITLE_MAX = 70
const DESCRIPTION_MAX = 160

/**
 * What a search result and a shared link say about a landing. Each is optional: left blank, the
 * page's name and the shop's description stand in, which is why the hint says so rather than the
 * fields asking for something.
 */
export function PageSeoFields({ id, value, onChange, messages = defaultMessages }: PageSeoFieldsProps) {
  const text = messages.design.pages.form

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-sm font-medium">{text.seo}</legend>
      <p className="text-muted-foreground -mt-1 text-xs">{text.seoHint}</p>
      <Field>
        <FieldLabel htmlFor={`${id}-seo-title`}>{text.seoTitle}</FieldLabel>
        <Input
          id={`${id}-seo-title`}
          value={value.title}
          maxLength={TITLE_MAX}
          onChange={(event) => onChange({ ...value, title: event.target.value })}
        />
        <FieldDescription>{`${[...value.title].length}/${TITLE_MAX}`}</FieldDescription>
      </Field>
      <Field>
        <FieldLabel htmlFor={`${id}-seo-description`}>{text.seoDescription}</FieldLabel>
        <Textarea
          id={`${id}-seo-description`}
          value={value.description}
          maxLength={DESCRIPTION_MAX}
          rows={3}
          onChange={(event) => onChange({ ...value, description: event.target.value })}
        />
        <FieldDescription>{`${[...value.description].length}/${DESCRIPTION_MAX}`}</FieldDescription>
      </Field>
      <Field>
        <FieldLabel htmlFor={`${id}-seo-image`}>{text.seoImage}</FieldLabel>
        <Input
          id={`${id}-seo-image`}
          type="url"
          inputMode="url"
          placeholder="https://"
          value={value.imageUrl}
          onChange={(event) => onChange({ ...value, imageUrl: event.target.value })}
        />
      </Field>
    </fieldset>
  )
}
