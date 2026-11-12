"use client"

// React
import { useId } from "react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { AffiliateDocumentFileView, AffiliateDocumentSide, AffiliateDocumentTypeOption } from "@harness-monorepo/ui/lib/affiliate-wizard"
import { AffiliateDocumentDrop } from "./affiliate-document-drop"

export interface AffiliateDocumentFieldsProps {
  types: readonly AffiliateDocumentTypeOption[]
  type: string
  onType: (type: string) => void
  /** The front, and the back unless a passport. */
  files: readonly AffiliateDocumentFileView[]
  accept: string
  onFile: (side: AffiliateDocumentSide, file: File) => void
  onRemove: (side: AffiliateDocumentSide) => void
  /** The invite says it may wait; the record does not. */
  showLater?: boolean
  disabled?: boolean
  messages?: UiMessages
}

/** The document's type and its photos (the user's design, 12/11/2026), on the invite and on the record. */
export function AffiliateDocumentFields({ types, type, onType, files, accept, onFile, onRemove, showLater = false, disabled = false, messages = defaultMessages }: AffiliateDocumentFieldsProps) {
  const text = messages.affiliates.wizard.document
  const id = useId()

  return (
    <div className="flex flex-col gap-4">
      <div role="radiogroup" aria-labelledby={`${id}-type`} className="flex flex-col gap-2">
        <span id={`${id}-type`} className="text-sm font-medium">
          {text.type}
        </span>
        <div className="flex flex-wrap gap-2">
          {types.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={type === option.value}
              disabled={disabled}
              onClick={() => onType(option.value)}
              className={cn(
                "focus-visible:ring-ring rounded-full border px-3 py-1.5 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none",
                type === option.value ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className={cn("grid gap-3", files.length > 1 && "sm:grid-cols-2")}>
        {files.map((file) => (
          <AffiliateDocumentDrop key={file.side} view={file} accept={accept} onFile={(chosen) => onFile(file.side, chosen)} onRemove={() => onRemove(file.side)} disabled={disabled} messages={messages} />
        ))}
      </div>
      <p className="text-muted-foreground text-xs">
        {text.tip}
        {showLater ? ` ${text.later}` : ""}
      </p>
    </div>
  )
}
