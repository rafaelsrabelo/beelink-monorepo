"use client"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@harness-monorepo/ui/components/dialog"
import { Field, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { PageAddressField, type PageAddressState } from "./page-address-field"
import { PageDisplayFields, type PageDisplayValue } from "./page-display-fields"
import { PageSeoFields, type PageSeoValue } from "./page-seo-fields"

export interface PageSettingsValue {
  title: string
  slug: string
  display: PageDisplayValue
  seo: PageSeoValue
}

export interface PageSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: PageSettingsValue
  onChange: (value: PageSettingsValue) => void
  addressPrefix: string
  addressState: PageAddressState
  onSubmit: () => void
  pending: boolean
  error?: string | null
  messages?: UiMessages
}

/**
 * A landing's settings: its name, its address, how it sits in the shop and what a search result says
 * about it. Saved as one patch; a renamed address stops the old one answering, which the address
 * field's check makes a choice rather than a surprise.
 */
export function PageSettingsDialog({
  open,
  onOpenChange,
  value,
  onChange,
  addressPrefix,
  addressState,
  onSubmit,
  pending,
  error = null,
  messages = defaultMessages,
}: PageSettingsDialogProps) {
  const text = messages.design.pages.form
  const ready = value.title.trim() !== "" && value.slug.trim() !== "" && addressState !== "taken" && addressState !== "invalid" && !pending

  return (
    <Dialog open={open} onOpenChange={(next: boolean) => onOpenChange(next)}>
      <DialogContent closeLabel={text.cancel} className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <form
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault()
            if (ready) onSubmit()
          }}
        >
          <DialogHeader>
            <DialogTitle>{text.settingsTitle}</DialogTitle>
            <DialogDescription>{text.settingsDescription}</DialogDescription>
          </DialogHeader>

          <Field>
            <FieldLabel htmlFor="page-settings-name">{text.name}</FieldLabel>
            <Input
              id="page-settings-name"
              value={value.title}
              maxLength={80}
              onChange={(event) => onChange({ ...value, title: event.target.value })}
            />
          </Field>

          <PageAddressField
            id="page-settings-address"
            prefix={addressPrefix}
            value={value.slug}
            onChange={(slug) => onChange({ ...value, slug })}
            state={addressState}
            messages={messages}
          />

          <PageDisplayFields
            id="page-settings"
            value={value.display}
            onChange={(display) => onChange({ ...value, display })}
            messages={messages}
          />

          <PageSeoFields id="page-settings" value={value.seo} onChange={(seo) => onChange({ ...value, seo })} messages={messages} />

          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {text.cancel}
            </Button>
            <Button type="submit" disabled={!ready}>
              {pending ? text.saving : text.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
