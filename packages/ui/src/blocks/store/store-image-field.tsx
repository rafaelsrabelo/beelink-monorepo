"use client"

// React
import { useRef } from "react"

// Libs
import { ImageIcon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { FieldIssue } from "./store-types"

export interface StoreImageFieldProps {
  /** Names the address input; the file input is `<id>-file`. */
  id: string
  label: string
  /** The image's URL, or `""` when the shop has none. */
  value: string
  onChange: (value: string) => void
  /**
   * Hands one file to whoever keeps bytes and answers with its URL. Where that is — Cloudinary, an
   * S3 bucket, a volume — is the screen's business and never this block's. Absent means no upload
   * is wired up, and only the address input renders; that is also how the block stands in Storybook.
   */
  onUpload?: (file: File) => Promise<string>
  /** True while the screen's upload is in flight. The block reports, it does not track. */
  pending?: boolean
  error?: FieldIssue
  hint?: string
  /** What a screen reader calls the preview — a logo and a banner are not the same picture. */
  previewAlt: string
  /** A logo is square; a banner is landscape. */
  aspect?: "square" | "wide"
  accept?: string
  disabled?: boolean
  messages?: UiMessages
}

/**
 * One image of the shop: the picture it has now, a file to replace it with, and a way to clear it.
 *
 * The file input is a real, labelled `<input type="file">` and nothing hides it behind a div with a
 * click handler — that trade is a keyboard trap and the classic axe failure, and the a11y addon
 * runs at error level here.
 */
export function StoreImageField({
  id,
  label,
  value,
  onChange,
  onUpload,
  pending = false,
  error,
  hint,
  previewAlt,
  aspect = "square",
  accept = "image/png,image/jpeg,image/webp",
  disabled = false,
  messages = defaultMessages,
}: StoreImageFieldProps) {
  const text = messages.store.image
  const fileInput = useRef<HTMLInputElement>(null)
  const busy = disabled || pending

  const handleFile = async (file: File) => {
    if (!onUpload) return
    try {
      onChange(await onUpload(file))
    } catch {
      // The screen owns the sentence: it turns the failure into copy and hands it back as `error`.
      // Swallowing it here is what keeps this block from ever knowing an errorCode (rule 5).
    } finally {
      // Without this the same file picked twice fires no change event, so a retry looks dead.
      if (fileInput.current) fileInput.current.value = ""
    }
  }

  return (
    <FieldSet>
      <FieldLegend variant="label">{label}</FieldLegend>
      {hint ? <FieldDescription>{hint}</FieldDescription> : null}

      <div className="flex items-start gap-3">
        {value ? (
          <img
            src={value}
            alt={previewAlt}
            className={
              aspect === "wide"
                ? "h-16 w-28 shrink-0 rounded-lg border border-border object-cover"
                : "size-16 shrink-0 rounded-lg border border-border object-cover"
            }
          />
        ) : (
          <div
            role="img"
            aria-label={text.empty}
            className={
              aspect === "wide"
                ? "flex h-16 w-28 shrink-0 items-center justify-center rounded-lg border border-dashed border-border"
                : "flex size-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-border"
            }
          >
            <ImageIcon aria-hidden="true" className="size-5 text-muted-foreground" />
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {onUpload ? (
            <Field>
              <FieldLabel htmlFor={`${id}-file`}>{text.fileLabel}</FieldLabel>
              <Input
                id={`${id}-file`}
                ref={fileInput}
                type="file"
                accept={accept}
                disabled={busy}
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void handleFile(file)
                }}
              />
              <FieldDescription>{pending ? text.uploading : text.fileHint}</FieldDescription>
            </Field>
          ) : null}

          <Field>
            <FieldLabel htmlFor={id}>{text.urlLabel}</FieldLabel>
            <Input
              id={id}
              type="url"
              value={value}
              disabled={busy}
              placeholder={text.urlPlaceholder}
              aria-invalid={Boolean(error)}
              onChange={(event) => onChange(event.target.value)}
            />
          </Field>

          {value ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              disabled={busy}
              onClick={() => onChange("")}
            >
              {text.clear}
            </Button>
          ) : null}
        </div>
      </div>

      <FieldError errors={[error]} />
    </FieldSet>
  )
}
