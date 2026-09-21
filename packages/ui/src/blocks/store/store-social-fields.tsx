"use client"

// UI
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
import type { StoreSocialValues } from "./store-schemas"
import type { FieldIssues } from "./store-types"

export interface StoreSocialFieldsProps {
  value: StoreSocialValues
  onChange: (value: StoreSocialValues) => void
  errors?: FieldIssues<StoreSocialValues>
  disabled?: boolean
  messages?: UiMessages
}

/** A handle is stored without its `@`; showing it stripped keeps the field honest about what is saved. */
function handleOf(typed: string): string {
  return typed.replace(/^@+/, "")
}

/** Every link the storefront offers. WhatsApp is the one that is not decoration: orders arrive there. */
export function StoreSocialFields({
  value,
  onChange,
  errors,
  disabled = false,
  messages = defaultMessages,
}: StoreSocialFieldsProps) {
  const text = messages.store.social

  return (
    <FieldGroup>
      <FieldDescription>{text.hint}</FieldDescription>

      <Field>
        <FieldLabel htmlFor="store-whatsapp">{text.whatsappLabel}</FieldLabel>
        <Input
          id="store-whatsapp"
          inputMode="tel"
          value={value.whatsapp}
          disabled={disabled}
          placeholder={text.whatsappPlaceholder}
          aria-invalid={Boolean(errors?.whatsapp)}
          onChange={(event) => onChange({ ...value, whatsapp: event.target.value })}
        />
        <FieldDescription>{text.whatsappHint}</FieldDescription>
        <FieldError errors={[errors?.whatsapp]} />
      </Field>

      <Field>
        <FieldLabel htmlFor="store-instagram">{text.instagramLabel}</FieldLabel>
        <Input
          id="store-instagram"
          value={value.instagram}
          disabled={disabled}
          placeholder={text.instagramPlaceholder}
          aria-invalid={Boolean(errors?.instagram)}
          onChange={(event) => onChange({ ...value, instagram: handleOf(event.target.value) })}
        />
        <FieldError errors={[errors?.instagram]} />
      </Field>

      <Field>
        <FieldLabel htmlFor="store-tiktok">{text.tiktokLabel}</FieldLabel>
        <Input
          id="store-tiktok"
          value={value.tiktok}
          disabled={disabled}
          placeholder={text.tiktokPlaceholder}
          aria-invalid={Boolean(errors?.tiktok)}
          onChange={(event) => onChange({ ...value, tiktok: handleOf(event.target.value) })}
        />
        <FieldError errors={[errors?.tiktok]} />
      </Field>

      <Field>
        <FieldLabel htmlFor="store-youtube">{text.youtubeLabel}</FieldLabel>
        <Input
          id="store-youtube"
          value={value.youtube}
          disabled={disabled}
          placeholder={text.youtubePlaceholder}
          aria-invalid={Boolean(errors?.youtube)}
          onChange={(event) => onChange({ ...value, youtube: handleOf(event.target.value) })}
        />
        <FieldError errors={[errors?.youtube]} />
      </Field>

      <Field>
        <FieldLabel htmlFor="store-spotify">{text.spotifyLabel}</FieldLabel>
        {/* A full profile URL, not a handle: Spotify has none the web can expand. */}
        <Input
          id="store-spotify"
          type="url"
          value={value.spotify}
          disabled={disabled}
          placeholder={text.spotifyPlaceholder}
          aria-invalid={Boolean(errors?.spotify)}
          onChange={(event) => onChange({ ...value, spotify: event.target.value })}
        />
        <FieldError errors={[errors?.spotify]} />
      </Field>
    </FieldGroup>
  )
}
