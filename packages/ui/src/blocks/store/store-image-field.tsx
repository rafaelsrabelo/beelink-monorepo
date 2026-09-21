"use client"

// React
import { useRef, useState } from "react"

// Libs
import { ImageIcon, UploadCloudIcon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import {
  FieldDescription,
  FieldError,
  FieldLegend,
  FieldSet,
} from "@harness-monorepo/ui/components/field"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { FieldIssue } from "./store-types"

/**
 * What a media type is called when it is shown to a shopkeeper. `image/jpeg` is the truth the
 * browser tells and "JPEG" is the word the person reading the form knows, and those are not the
 * same register. A type with no entry here falls back to its subtype, so an `accept` this map has
 * not caught up with still reads as something rather than as a blank.
 */
const FORMAT_NAMES: Record<string, string> = {
  "image/png": "PNG",
  "image/jpeg": "JPEG",
  "image/webp": "WebP",
  "image/gif": "GIF",
  "image/avif": "AVIF",
  "image/svg+xml": "SVG",
}

const MEGABYTE = 1024 * 1024

export interface StoreImageFieldProps {
  /** Names the file input, as `<id>-file`. */
  id: string
  label: string
  /** The image's URL, or `""` when the shop has none. */
  value: string
  onChange: (value: string) => void
  /**
   * Hands one file to whoever keeps bytes and answers with its URL. Where that is — Cloudinary, an
   * S3 bucket, a volume — is the screen's business and never this block's. Absent means no upload
   * is wired up and the area is inert; that is also how the block stands in Storybook.
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
  /**
   * The largest file the field will hand to `onUpload`. It is both halves of one promise: the
   * number the specs quote, and the number a refusal is measured against.
   */
  maxSizeBytes?: number
  /** Quoted to the shopkeeper, never enforced — a smaller image is a worse picture, not an error. */
  recommendedSize?: { width: number; height: number }
  disabled?: boolean
  messages?: UiMessages
}

/**
 * One image of the shop: an area to drop a file on or click to browse, the picture it has now, and
 * a way to replace or clear it.
 *
 * The drop area is a `<label>` over a real `<input type="file">` that is `sr-only` rather than
 * hidden. That distinction is the whole accessibility argument: `sr-only` keeps the input in the
 * tab order and lets Space open the picker, where a div with a click handler is a keyboard trap and
 * the classic axe failure. The focus ring is drawn on the label through `peer-focus-visible`, so
 * what is focused is what is seen to be focused. The a11y addon runs at error level here.
 *
 * Its call to action is also the input's accessible name — one string, so a control is called what
 * it is seen to say (WCAG 2.5.3).
 *
 * The specs beside it — accepted formats, size ceiling, recommended dimensions — are composed from
 * `accept`, `maxSizeBytes` and `recommendedSize` rather than written out as prose. A hint typed by
 * hand drifts from the `accept` it describes within a quarter and then lies to the shopkeeper; this
 * one cannot, because the sentence and the refusal read the same props.
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
  maxSizeBytes = 2 * MEGABYTE,
  recommendedSize,
  disabled = false,
  messages = defaultMessages,
}: StoreImageFieldProps) {
  const text = messages.store.image
  const fileInput = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  /**
   * A file this block refused to send. It is not an errorCode and never becomes one — nothing was
   * asked of the API, so there is nothing for the screen to translate. It clears on the next pick,
   * because a verdict about a file that is no longer chosen is noise.
   */
  const [refusal, setRefusal] = useState<string | undefined>(undefined)

  const busy = disabled || pending
  const types = accept.split(",").map((type) => type.trim()).filter(Boolean)
  const formats = types.map((type) => FORMAT_NAMES[type] ?? type.split("/")[1]?.toUpperCase() ?? type)
  const maxSizeMb = maxSizeBytes / MEGABYTE
  const specsId = `${id}-specs`

  const accepts = (file: File) =>
    types.some((type) =>
      type.endsWith("/*") ? file.type.startsWith(type.slice(0, -1)) : file.type === type,
    )

  const handleFile = async (file: File) => {
    if (!onUpload) return

    // Refused here, before a byte leaves the browser: an upload that was always going to be
    // rejected is a round trip the shopkeeper waits through for no reason.
    if (types.length > 0 && !accepts(file)) {
      setRefusal(text.wrongFormat(formats))
      return
    }
    if (file.size > maxSizeBytes) {
      setRefusal(text.tooLarge(maxSizeMb))
      return
    }

    setRefusal(undefined)
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

  /**
   * The area takes its shape from the size it recommends, so what a shopkeeper frames while
   * choosing is what the shop window will show. Inline rather than a Tailwind class: the ratio is
   * data, and arbitrary values have to be literals the compiler can see.
   */
  const landscape = recommendedSize
    ? recommendedSize.width > recommendedSize.height
    : aspect === "wide"

  const ratio = recommendedSize
    ? `${recommendedSize.width} / ${recommendedSize.height}`
    : landscape
      ? "3 / 1"
      : "1 / 1"

  const previewClass = "w-full rounded-lg border border-border object-cover"

  return (
    <FieldSet>
      <FieldLegend variant="label">{label}</FieldLegend>
      {hint ? <FieldDescription>{hint}</FieldDescription> : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className={cn("w-full", landscape ? "sm:max-w-md" : "sm:max-w-56")}>
          {value ? (
            <div className="flex flex-col gap-2">
              <img
                src={value}
                alt={previewAlt}
                style={{ aspectRatio: ratio }}
                className={previewClass}
              />
              <div className="flex flex-wrap gap-2">
                {onUpload ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => fileInput.current?.click()}
                  >
                    {pending ? text.uploading : text.replace}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => {
                    setRefusal(undefined)
                    onChange("")
                  }}
                >
                  {text.clear}
                </Button>
              </div>
            </div>
          ) : (
            <div
              onDragOver={(event) => {
                if (busy || !onUpload) return
                // Without this the browser opens the file instead of handing it over.
                event.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                if (busy || !onUpload) return
                event.preventDefault()
                setDragging(false)
                const file = event.dataTransfer.files?.[0]
                if (file) void handleFile(file)
              }}
            >
              <input
                id={`${id}-file`}
                ref={fileInput}
                type="file"
                accept={accept}
                disabled={busy || !onUpload}
                aria-describedby={specsId}
                aria-invalid={Boolean(refusal ?? error)}
                className="peer sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void handleFile(file)
                }}
              />
              <label
                htmlFor={`${id}-file`}
                style={{ aspectRatio: ratio }}
                className={cn(
                  "flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg",
                  "border border-dashed border-input bg-muted/30 px-6 text-center transition-colors",
                  "hover:border-ring hover:bg-muted/60",
                  // The ring is drawn here because the input it belongs to is only screen-reader
                  // visible: without this, a keyboard user focuses something they cannot see.
                  "peer-focus-visible:border-ring peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/50",
                  "peer-disabled:cursor-not-allowed peer-disabled:opacity-60 peer-disabled:hover:border-input",
                  dragging && "border-ring bg-accent",
                )}
              >
                {dragging ? (
                  <UploadCloudIcon aria-hidden="true" className="size-6 text-muted-foreground" />
                ) : (
                  <ImageIcon aria-hidden="true" className="size-6 text-muted-foreground" />
                )}
                <span className="text-sm text-muted-foreground">
                  {pending ? text.uploading : dragging ? text.dropActive : text.dropCta}
                </span>
              </label>
            </div>
          )}
        </div>

        <div id={specsId} className="flex flex-1 flex-col gap-1 text-sm text-muted-foreground">
          <p>{text.specFormats(formats, maxSizeMb)}</p>
          {recommendedSize ? (
            <p>{text.specDimensions(recommendedSize.width, recommendedSize.height)}</p>
          ) : null}
        </div>
      </div>

      <FieldError errors={[refusal ? { message: refusal } : undefined, error]} />
    </FieldSet>
  )
}
