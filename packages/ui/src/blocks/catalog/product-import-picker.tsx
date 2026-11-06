"use client"

// React
import { useId, useRef, useState } from "react"

// Libs
import { FileUpIcon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

/** What the input offers. The API decides by the file's bytes; this only narrows the dialog. */
const ACCEPT = "application/pdf,.pdf,image/png,image/jpeg,image/webp"

export interface ProductImportPickerProps {
  onPick: (file: File) => void
  disabled?: boolean
  /** The last refusal, as a sentence the screen already wrote. */
  error?: string
  messages?: UiMessages
}

/**
 * Where the menu is chosen: a button, and the whole box as a place to drop the file. The box is a
 * drop target and not a button of its own, so the keyboard has one thing to reach — the button.
 */
export function ProductImportPicker({ onPick, disabled = false, error, messages = defaultMessages }: ProductImportPickerProps) {
  const text = messages.catalog.products.import
  const input = useRef<HTMLInputElement>(null)
  const hintId = useId()
  const [over, setOver] = useState(false)

  function pick(files: FileList | null) {
    const file = files?.[0]
    if (file && !disabled) onPick(file)
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className={cn(
          "flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center transition-colors",
          over ? "border-primary bg-primary/5" : "border-border",
          disabled && "opacity-60",
        )}
        onDragOver={(event) => {
          event.preventDefault()
          if (!disabled) setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault()
          setOver(false)
          pick(event.dataTransfer.files)
        }}
      >
        <FileUpIcon aria-hidden className="text-muted-foreground size-8" />
        <Button type="button" disabled={disabled} aria-describedby={hintId} onClick={() => input.current?.click()}>
          {text.pick}
        </Button>
        <p id={hintId} className="text-muted-foreground max-w-md text-sm">
          {text.pickHint}
        </p>
        <input
          ref={input}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          disabled={disabled}
          onChange={(event) => {
            pick(event.target.files)
            // Cleared, so choosing the same file again after a refusal still fires a change.
            event.target.value = ""
          }}
        />
      </div>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  )
}
