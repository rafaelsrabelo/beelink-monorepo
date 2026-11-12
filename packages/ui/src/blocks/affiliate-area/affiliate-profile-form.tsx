"use client"

// React
import { useId } from "react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Field, FieldDescription, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { AffiliateProfileFormValues } from "@harness-monorepo/ui/lib/affiliate-area"
import { StoreImageField } from "../store/store-image-field"

export interface AffiliateProfileFormProps {
  value: AffiliateProfileFormValues
  onChange: (value: AffiliateProfileFormValues) => void
  onSubmit: () => void
  onUploadPhoto?: (file: File) => Promise<string>
  photoPending?: boolean
  /** An ended standing keeps the Pix key and the phone; the photo and the phrase are the shop window's. */
  showcaseLocked?: boolean
  pending?: boolean
  pristine?: boolean
  saved?: boolean
  /** The API's refusal, in words. */
  error?: string
  /** The person's own name, for the photo's description. */
  name: string
  messages?: UiMessages
}

/** The data an affiliate keeps of themselves at a shop (IMPULSEIA-108): how the shop pays them, and what its window shows. */
export function AffiliateProfileForm({
  value,
  onChange,
  onSubmit,
  onUploadPhoto,
  photoPending = false,
  showcaseLocked = false,
  pending = false,
  pristine = false,
  saved = false,
  error,
  name,
  messages = defaultMessages,
}: AffiliateProfileFormProps) {
  const text = messages.affiliateArea.profile
  const id = useId()
  const set = (key: keyof AffiliateProfileFormValues, next: string) => onChange({ ...value, [key]: next })

  return (
    <section aria-labelledby={`${id}-title`} className="bg-shell-surface border-shell-border rounded-xl border p-4 shadow-xs sm:p-6">
      <form
        noValidate
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
      >
        <header className="flex flex-col gap-1">
          <h2 id={`${id}-title`} className="text-lg font-semibold">
            {text.title}
          </h2>
          <p className="text-muted-foreground text-sm">{text.intro}</p>
        </header>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={`${id}-pix`}>{text.pixKey}</FieldLabel>
            <Input id={`${id}-pix`} value={value.pixKey} disabled={pending} aria-describedby={`${id}-pix-help`} onChange={(event) => set("pixKey", event.target.value)} />
            <FieldDescription id={`${id}-pix-help`}>{text.pixKeyHelp}</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor={`${id}-phone`}>{text.phone}</FieldLabel>
            <Input id={`${id}-phone`} type="tel" inputMode="tel" value={value.phone} disabled={pending} aria-describedby={`${id}-phone-help`} onChange={(event) => set("phone", event.target.value)} />
            <FieldDescription id={`${id}-phone-help`}>{text.phoneHelp}</FieldDescription>
          </Field>
        </div>

        {showcaseLocked ? (
          <p className="text-muted-foreground text-sm">{text.endedNote}</p>
        ) : (
          <>
            <StoreImageField
              id={`${id}-photo`}
              label={text.photo}
              hint={text.photoHelp}
              value={value.photoUrl}
              onChange={(next) => set("photoUrl", next)}
              onUpload={onUploadPhoto}
              pending={photoPending}
              previewAlt={name}
              aspect="square"
              recommendedSize={{ width: 400, height: 400 }}
              disabled={pending}
              messages={messages}
            />
            <Field>
              <FieldLabel htmlFor={`${id}-tagline`}>{text.tagline}</FieldLabel>
              <Input id={`${id}-tagline`} maxLength={100} value={value.tagline} disabled={pending} aria-describedby={`${id}-tagline-help`} onChange={(event) => set("tagline", event.target.value)} />
              <FieldDescription id={`${id}-tagline-help`}>{format(text.taglineHelp, { count: String([...value.tagline].length) })}</FieldDescription>
            </Field>
          </>
        )}

        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending || pristine || photoPending}>
            {pending ? text.saving : text.save}
          </Button>
          <p role="status" className="text-muted-foreground text-sm">
            {saved && pristine ? text.saved : ""}
          </p>
        </div>
      </form>
    </section>
  )
}
