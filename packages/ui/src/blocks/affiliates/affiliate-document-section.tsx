"use client"

// Icons
import { FileTextIcon } from "lucide-react"

// UI
import { Badge } from "@harness-monorepo/ui/components/badge"
import { Button } from "@harness-monorepo/ui/components/button"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AffiliateDocumentFields, type AffiliateDocumentFieldsProps } from "./affiliate-document-fields"

export interface AffiliateDocumentSectionProps {
  /** Null when none was sent: "Documento pendente", with the upload right there. */
  document: { summary: string; files: Array<{ label: string; url: string; pdf: boolean }> } | null
  /** The links to the photos are being read. */
  loading?: boolean
  /** Sending another over the one there is. */
  replacing: boolean
  onReplace: () => void
  onCancel: () => void
  fields: Omit<AffiliateDocumentFieldsProps, "messages" | "disabled">
  onSend: () => void
  canSend: boolean
  sending: boolean
  /** The API's refusal, in words. */
  error?: string
  messages?: UiMessages
}

/**
 * An affiliate's identity document on their record (12/11/2026): its photos, at links that expire —
 * the shop's alone — or, when none was sent at the invite, "Documento pendente" and the upload.
 */
export function AffiliateDocumentSection({ document, loading = false, replacing, onReplace, onCancel, fields, onSend, canSend, sending, error, messages = defaultMessages }: AffiliateDocumentSectionProps) {
  const text = messages.affiliates.documentSection
  const uploading = document === null || replacing

  return (
    <section aria-labelledby="affiliate-document" className="bg-shell-surface border-shell-border flex flex-col gap-4 rounded-xl border p-4 shadow-xs sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="affiliate-document" className="font-semibold">
          {text.title}
        </h2>
        {document === null ? <Badge variant="outline">{text.pending}</Badge> : null}
      </div>

      {document === null ? <p className="text-muted-foreground text-sm">{text.pendingHelp}</p> : null}

      {document !== null && !replacing ? (
        <>
          <p className="text-sm">{document.summary}</p>
          {loading ? (
            <div className="flex gap-3">
              <Skeleton className="h-32 w-48 rounded-md" />
              <Skeleton className="h-32 w-48 rounded-md" />
            </div>
          ) : (
            <ul className="flex flex-wrap gap-3">
              {document.files.map((file) => (
                <li key={file.label}>
                  {file.pdf ? (
                    <a href={file.url} target="_blank" rel="noreferrer" className="hover:bg-muted flex h-32 w-48 flex-col items-center justify-center gap-2 rounded-md border text-sm">
                      <FileTextIcon aria-hidden="true" className="text-muted-foreground size-6" />
                      {format(text.openPdf, { side: file.label })}
                    </a>
                  ) : (
                    <a href={file.url} target="_blank" rel="noreferrer" className="block">
                      <img src={file.url} alt={format(text.photoAlt, { side: file.label })} className="h-32 w-48 rounded-md border object-cover" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="text-muted-foreground text-xs">{text.expires}</p>
          <Button type="button" variant="outline" className="self-start" onClick={onReplace}>
            {text.replace}
          </Button>
        </>
      ) : null}

      {uploading ? (
        <>
          <AffiliateDocumentFields {...fields} disabled={sending} messages={messages} />
          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button type="button" disabled={!canSend || sending} onClick={onSend}>
              {sending ? text.sending : text.send}
            </Button>
            {replacing ? (
              <Button type="button" variant="ghost" disabled={sending} onClick={onCancel}>
                {text.cancel}
              </Button>
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  )
}
