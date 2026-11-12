"use client"

// React
import { useId, useState } from "react"

// Icons
import { FileTextIcon, UploadIcon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { AffiliateDocumentFileView } from "@harness-monorepo/ui/lib/affiliate-wizard"

export interface AffiliateDocumentDropProps {
  view: AffiliateDocumentFileView
  /** The input's `accept`: the types the API takes. */
  accept: string
  onFile: (file: File) => void
  onRemove: () => void
  disabled?: boolean
  messages?: UiMessages
}

/** One side of the document (the user's design, 12/11/2026): dragged onto the card or chosen by a click, then shown, replaced or removed. */
export function AffiliateDocumentDrop({ view, accept, onFile, onRemove, disabled = false, messages = defaultMessages }: AffiliateDocumentDropProps) {
  const text = messages.affiliates.wizard.document
  const id = useId()
  const [hot, setHot] = useState(false)
  const input = (
    <input
      id={id}
      type="file"
      accept={accept}
      className="sr-only"
      disabled={disabled}
      onChange={(event) => {
        const file = event.target.files?.[0]
        if (file) onFile(file)
        event.target.value = ""
      }}
    />
  )

  if (view.fileName) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border p-3">
        <span className="text-sm font-medium">{view.label}</span>
        <div className="flex items-center gap-3">
          {view.previewUrl ? (
            // A local preview of the file just chosen: nothing here is ever an address of the stored one.
            <img src={view.previewUrl} alt={format(messages.affiliates.documentSection.photoAlt, { side: view.label })} className="size-16 shrink-0 rounded-md border object-cover" />
          ) : (
            <span aria-hidden="true" className="bg-muted grid size-16 shrink-0 place-items-center rounded-md border">
              <FileTextIcon className="text-muted-foreground size-6" />
            </span>
          )}
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm">{view.fileName}</span>
            <span className="text-muted-foreground text-xs" role="status">
              {view.status === "uploading" ? text.uploading : view.size}
            </span>
            {view.error ? <span className="text-destructive text-xs">{view.error}</span> : null}
          </div>
        </div>
        <div className="flex gap-2">
          <label htmlFor={id} className={cn("border-input hover:bg-muted inline-flex h-7 cursor-pointer items-center rounded-md border px-2.5 text-xs font-medium", disabled && "pointer-events-none opacity-50")}>
            {text.replace}
            <span className="sr-only">: {view.label}</span>
          </label>
          {input}
          <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={onRemove}>
            {text.remove}
            <span className="sr-only">: {view.label}</span>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <label
      htmlFor={id}
      onDragOver={(event) => {
        event.preventDefault()
        setHot(true)
      }}
      onDragLeave={() => setHot(false)}
      onDrop={(event) => {
        event.preventDefault()
        setHot(false)
        const file = event.dataTransfer.files[0]
        if (file && !disabled) onFile(file)
      }}
      className={cn(
        "focus-within:ring-ring flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-center focus-within:ring-2",
        hot ? "border-foreground bg-brand-yellow/15" : "border-muted-foreground/40 bg-muted/30",
      )}
    >
      <UploadIcon aria-hidden="true" className="text-muted-foreground size-6" />
      <span className="text-sm font-medium">{hot ? text.dropActive : format(text.drop, { side: view.label.toLowerCase() })}</span>
      <span className="text-muted-foreground text-xs">{text.choose}</span>
      {view.error ? <span className="text-destructive text-xs">{view.error}</span> : null}
      {input}
    </label>
  )
}
