"use client"

// React
import { useId, type ReactNode } from "react"

// UI
import { Badge } from "@harness-monorepo/ui/components/badge"
import { Button } from "@harness-monorepo/ui/components/button"
import { Field, FieldDescription, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Textarea } from "@harness-monorepo/ui/components/textarea"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { AffiliateReviewView } from "@harness-monorepo/ui/lib/affiliate-wizard"

export interface AffiliateReviewCardsProps {
  view: AffiliateReviewView
  /** Back to a step: 0 the person, 1 the commission, 2 the document. */
  onEdit: (step: number) => void
  note: string
  onNote: (note: string) => void
  noteError?: string
  disabled?: boolean
  messages?: UiMessages
}

function Card({ title, edit, children }: { title: string; edit: ReactNode; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex items-start justify-between gap-3 rounded-xl border p-4">
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{title}</h3>
        {children}
      </div>
      {edit}
    </section>
  )
}

/** Step four of the invite (the user's design, 12/11/2026): each step said back in a card, each with its way back, and the shop's note. */
export function AffiliateReviewCards({ view, onEdit, note, onNote, noteError, disabled = false, messages = defaultMessages }: AffiliateReviewCardsProps) {
  const text = messages.affiliates.wizard
  const id = useId()
  const edit = (step: number, label: string) => (
    <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => onEdit(step)} aria-label={format(text.review.edit, { step: label })}>
      {text.review.editShort}
    </Button>
  )

  return (
    <div className="flex flex-col gap-3">
      <Card title={text.review.person} edit={edit(0, text.steps.person.label)}>
        <span className="font-medium">{view.name}</span>
        <span className="text-muted-foreground text-sm">{view.email}</span>
        <span className="text-muted-foreground text-sm">{view.contact}</span>
      </Card>

      <Card title={text.review.commission} edit={edit(1, text.steps.commission.label)}>
        <span className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums">{view.commissionBase}</span>
          <span className="text-muted-foreground text-sm">{view.commissionHint}</span>
        </span>
        {view.rules.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5 pt-1">
            {view.rules.map((rule) => (
              <li key={`${rule.kindLabel}-${rule.name}`}>
                <Badge variant="outline">
                  {rule.kindLabel}: {rule.name} · {rule.value}
                </Badge>
              </li>
            ))}
          </ul>
        ) : null}
      </Card>

      <Card title={view.documentTitle} edit={edit(2, text.steps.document.label)}>
        {view.documentLines.map((line) => (
          <span key={line.label} className="text-sm">
            {line.status ? (
              <>
                {line.label}: <span className="text-muted-foreground">{line.status}</span>
              </>
            ) : (
              <span className="text-muted-foreground">{line.label}</span>
            )}
          </span>
        ))}
      </Card>

      <Field data-invalid={noteError ? true : undefined}>
        <FieldLabel htmlFor={`${id}-note`}>{text.review.note}</FieldLabel>
        <Textarea id={`${id}-note`} rows={3} value={note} disabled={disabled} aria-invalid={noteError ? true : undefined} aria-describedby={`${id}-note-help`} onChange={(event) => onNote(event.target.value)} />
        <FieldDescription id={`${id}-note-help`}>{noteError ?? text.review.noteHelp}</FieldDescription>
      </Field>
    </div>
  )
}
