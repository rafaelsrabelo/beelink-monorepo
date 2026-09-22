"use client"

// React
import { useId, useRef, useState } from "react"

// Libs
import { GripVerticalIcon, ImagePlusIcon, XIcon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Field, FieldDescription, FieldError, FieldLabel } from "@harness-monorepo/ui/components/field"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface ProductMediaFieldProps {
  /** The photos this product has, in the order they will be shown. The first is the card's. */
  value: string[]
  onChange: (urls: string[]) => void
  /** Hands one file to whoever keeps bytes and answers its address. */
  onUpload: (file: File) => Promise<string>
  pending?: boolean
  error?: { message?: string }
  disabled?: boolean
  messages?: UiMessages
}

const ACCEPT = "image/jpeg,image/png,image/webp,image/avif"

/**
 * A product's photos: dropped, picked, reordered and removed.
 *
 * Several at once, which is the whole difference from the shop's single logo field. A shopkeeper
 * photographing a thing takes four pictures of it and has them in one folder; asking for them one
 * at a time turns one gesture into four.
 *
 * Uploads run **in sequence, not in parallel**. Four files at once is four signed requests and
 * four bodies leaving a phone on mobile data, and the order they finish in decides which photo
 * becomes the card's — so parallel uploads would make the first image depend on the network.
 *
 * The drop area is a `<label>` over a real `<input type="file">`: the input stays in the tab order
 * and keeps its own keyboard behaviour, and the large target is styling rather than a widget
 * pretending to be one.
 */
export function ProductMediaField({
  value,
  onChange,
  onUpload,
  pending = false,
  error,
  disabled = false,
  messages = defaultMessages,
}: ProductMediaFieldProps) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const text = messages.catalog.media

  async function accept(files: FileList | null) {
    if (!files?.length || disabled) return

    const added: string[] = []
    for (const file of Array.from(files)) {
      // Sequential on purpose — see the note above.
      added.push(await onUpload(file))
    }

    // Filtered against what is already there: dropping the same folder twice is a mistake a
    // shopkeeper makes, and four duplicates is a worse answer than none.
    onChange([...value, ...added.filter((url) => !value.includes(url))])
    if (inputRef.current) inputRef.current.value = ""
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= value.length) return
    const next = [...value]
    const [moved] = next.splice(from, 1)
    if (moved) next.splice(to, 0, moved)
    onChange(next)
  }

  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>{text.label}</FieldLabel>

      {value.length ? (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {value.map((url, index) => (
            <li key={url} className="group relative">
              {/*
                Named rather than decorative. The remove and reorder buttons refer to these by
                number, so a screen reader that cannot tell photo 2 from photo 3 cannot use them —
                an empty alt would make the controls beside it unusable.
              */}
              <img
                src={url}
                alt={format(text.photo, { number: String(index + 1) })}
                className="border-border aspect-square w-full rounded-lg border object-cover"
              />
              {index === 0 ? (
                <span className="bg-primary text-primary-foreground absolute top-1 left-1 rounded px-1.5 py-0.5 text-[11px] font-medium">
                  {text.cover}
                </span>
              ) : null}
              <div className="absolute right-1 bottom-1 flex gap-1">
                {index > 0 ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    disabled={disabled}
                    aria-label={`${text.moveEarlier} ${index + 1}`}
                    onClick={() => move(index, index - 1)}
                  >
                    <GripVerticalIcon aria-hidden="true" className="size-3.5" />
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  disabled={disabled}
                  aria-label={`${text.remove} ${index + 1}`}
                  onClick={() => onChange(value.filter((entry) => entry !== url))}
                >
                  <XIcon aria-hidden="true" className="size-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <label
        htmlFor={id}
        onDragOver={(event) => {
          event.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault()
          setOver(false)
          void accept(event.dataTransfer.files)
        }}
        className={cn(
          "border-border text-muted-foreground flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed p-6 text-center text-sm transition-colors",
          "has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-2",
          over && "border-primary bg-accent",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <ImagePlusIcon aria-hidden="true" className="size-5" />
        <span className="font-medium">{pending ? text.uploading : text.drop}</span>
        <span className="text-xs">{text.hint}</span>
        <input
          ref={inputRef}
          id={id}
          type="file"
          multiple
          accept={ACCEPT}
          disabled={disabled || pending}
          className="sr-only"
          onChange={(event) => void accept(event.target.files)}
        />
      </label>

      {error ? <FieldError>{error.message}</FieldError> : <FieldDescription>{text.help}</FieldDescription>}
    </Field>
  )
}
