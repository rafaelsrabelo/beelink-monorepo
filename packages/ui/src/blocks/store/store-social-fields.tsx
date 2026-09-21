"use client"

// React
import type { ReactNode } from "react"

// UI
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
import { InstagramIcon, SpotifyIcon, TikTokIcon, WhatsAppIcon, YouTubeIcon } from "./store-brand-icons"
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

/**
 * `(11) 99999-9999` while the number can still be Brazilian, and bare digits once it cannot.
 *
 * The screen sends digits — `toCreatePayload` strips this before the request — so the mask is
 * only ever what the shopkeeper sees. It is applied on the way out as well as on the way in, so a
 * shop loaded from the API shows a formatted number rather than the eleven digits it is stored as.
 *
 * Past eleven digits it gives up and shows what was typed: the schema accepts up to fifteen, which
 * is a number with a country code, and there is no single shape those take.
 */
export function maskPhone(typed: string): string {
  const digits = typed.replace(/\D/g, "").slice(0, 15)

  if (digits.length > 11) return digits
  if (digits.length === 0) return ""
  if (digits.length <= 2) return `(${digits}`

  const area = digits.slice(0, 2)
  const subscriber = digits.slice(2)
  // Nine-digit mobiles split 5-4 and eight-digit landlines 4-4. Following the length rather than
  // guessing from the leading 9 means the split is decided by what is actually there.
  const head = subscriber.length > 8 ? subscriber.slice(0, 5) : subscriber.slice(0, 4)
  const tail = subscriber.slice(head.length)

  return tail ? `(${area}) ${head}-${tail}` : `(${area}) ${head}`
}

/**
 * One field with its network's mark and address built into it.
 *
 * The prefix is a real element rather than padding on the input: `instagram.com/` and
 * `youtube.com/@` are different widths, and a padding picked per network is a number that goes
 * wrong the first time the copy changes. The border and focus ring move to the wrapper so the two
 * halves read as one control.
 */
function SocialField({
  id,
  label,
  icon,
  prefix,
  value,
  placeholder,
  invalid,
  disabled,
  type = "text",
  inputMode,
  onChange,
  children,
}: {
  id: string
  label: string
  icon: ReactNode
  prefix?: string
  value: string
  placeholder: string
  invalid: boolean
  disabled: boolean
  type?: string
  inputMode?: "tel"
  onChange: (value: string) => void
  children?: ReactNode
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div
        className={cn(
          "flex h-8 w-full items-center rounded-lg border border-input bg-transparent transition-colors",
          "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
          invalid && "border-destructive ring-3 ring-destructive/20",
          disabled && "pointer-events-none bg-input/50 opacity-50",
        )}
      >
        <span className="flex shrink-0 items-center gap-1.5 pl-2.5 text-muted-foreground">
          {icon}
          {prefix ? <span className="text-sm">{prefix}</span> : null}
        </span>
        <Input
          id={id}
          type={type}
          inputMode={inputMode}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          aria-invalid={invalid}
          // The wrapper draws the border and the ring now; a second set here would sit inside the
          // first and show as a box within a box the moment the field is focused.
          className="h-full border-0 bg-transparent pl-1.5 focus-visible:ring-0 disabled:bg-transparent dark:bg-transparent"
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
      {children}
    </Field>
  )
}

const ICON_CLASS = "size-4 shrink-0"

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

      <SocialField
        id="store-whatsapp"
        label={text.whatsappLabel}
        icon={<WhatsAppIcon className={ICON_CLASS} />}
        inputMode="tel"
        value={maskPhone(value.whatsapp)}
        placeholder={text.whatsappPlaceholder}
        invalid={Boolean(errors?.whatsapp)}
        disabled={disabled}
        onChange={(whatsapp) => onChange({ ...value, whatsapp: maskPhone(whatsapp) })}
      >
        <FieldDescription>{text.whatsappHint}</FieldDescription>
        <FieldError errors={[errors?.whatsapp]} />
      </SocialField>

      <SocialField
        id="store-instagram"
        label={text.instagramLabel}
        icon={<InstagramIcon className={ICON_CLASS} />}
        prefix="instagram.com/"
        value={value.instagram}
        placeholder={text.handlePlaceholder}
        invalid={Boolean(errors?.instagram)}
        disabled={disabled}
        onChange={(instagram) => onChange({ ...value, instagram: handleOf(instagram) })}
      >
        <FieldError errors={[errors?.instagram]} />
      </SocialField>

      <SocialField
        id="store-tiktok"
        label={text.tiktokLabel}
        icon={<TikTokIcon className={ICON_CLASS} />}
        prefix="tiktok.com/@"
        value={value.tiktok}
        placeholder={text.handlePlaceholder}
        invalid={Boolean(errors?.tiktok)}
        disabled={disabled}
        onChange={(tiktok) => onChange({ ...value, tiktok: handleOf(tiktok) })}
      >
        <FieldError errors={[errors?.tiktok]} />
      </SocialField>

      <SocialField
        id="store-youtube"
        label={text.youtubeLabel}
        icon={<YouTubeIcon className={ICON_CLASS} />}
        prefix="youtube.com/@"
        value={value.youtube}
        placeholder={text.handlePlaceholder}
        invalid={Boolean(errors?.youtube)}
        disabled={disabled}
        onChange={(youtube) => onChange({ ...value, youtube: handleOf(youtube) })}
      >
        <FieldError errors={[errors?.youtube]} />
      </SocialField>

      {/*
        Spotify keeps the whole URL and gets no prefix. It has no handle the web can expand — an
        artist, a playlist and a user live on different paths — so a prefix here would be a promise
        the field could not keep.
      */}
      <SocialField
        id="store-spotify"
        label={text.spotifyLabel}
        icon={<SpotifyIcon className={ICON_CLASS} />}
        type="url"
        value={value.spotify}
        placeholder={text.spotifyPlaceholder}
        invalid={Boolean(errors?.spotify)}
        disabled={disabled}
        onChange={(spotify) => onChange({ ...value, spotify })}
      >
        <FieldError errors={[errors?.spotify]} />
      </SocialField>
    </FieldGroup>
  )
}
