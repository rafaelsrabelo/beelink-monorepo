"use client"

// UI
import { Field, FieldContent, FieldDescription, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Switch } from "@harness-monorepo/ui/components/switch"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface PageDisplayValue {
  inMenu: boolean
  usesChrome: boolean
}

export interface PageDisplayFieldsProps {
  /** Prefixes the ids, so two dialogs on one screen never share one. */
  id: string
  value: PageDisplayValue
  onChange: (value: PageDisplayValue) => void
  messages?: UiMessages
}

/** How a landing sits in the shop: linked from its menu or not, framed by its header and footer or alone. */
export function PageDisplayFields({ id, value, onChange, messages = defaultMessages }: PageDisplayFieldsProps) {
  const text = messages.design.pages.form

  return (
    <div className="flex flex-col gap-3">
      <Field orientation="horizontal">
        <Switch id={`${id}-menu`} checked={value.inMenu} onCheckedChange={(inMenu: boolean) => onChange({ ...value, inMenu })} />
        <FieldContent>
          <FieldLabel htmlFor={`${id}-menu`}>{text.inMenu}</FieldLabel>
          <FieldDescription>{text.inMenuHint}</FieldDescription>
        </FieldContent>
      </Field>
      <Field orientation="horizontal">
        <Switch
          id={`${id}-chrome`}
          checked={value.usesChrome}
          onCheckedChange={(usesChrome: boolean) => onChange({ ...value, usesChrome })}
        />
        <FieldContent>
          <FieldLabel htmlFor={`${id}-chrome`}>{text.usesChrome}</FieldLabel>
          <FieldDescription>{text.usesChromeHint}</FieldDescription>
        </FieldContent>
      </Field>
    </div>
  )
}
