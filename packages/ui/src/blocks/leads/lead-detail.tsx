"use client"

// Libs
import { MailIcon, PhoneIcon, Trash2Icon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"

// Locales
import { defaultLocale, defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { LeadTableItem } from "./lead-table"
import { LeadStatusSelect } from "./lead-status-select"
import type { LeadStatus } from "./lead-types"

export interface LeadDetailItem extends LeadTableItem {
  /** Each with the label it was asked under at the time — the form may have changed since. */
  answers: readonly { fieldId: string; label: string; value: string }[]
}

export interface LeadDetailProps {
  lead: LeadDetailItem
  onStatusChange: (status: LeadStatus) => void
  onDelete: () => void
  busy?: boolean
  locale?: string
  messages?: UiMessages
}

/**
 * One lead, whole: how to answer, what they wrote, where it stands.
 *
 * The ways to answer are links — `mailto:` and WhatsApp — because answering is the whole point of
 * opening one, and copying an address out of a table cell is the chore this saves.
 */
export function LeadDetail({ lead, onStatusChange, onDelete, busy = false, locale = defaultLocale, messages = defaultMessages }: LeadDetailProps) {
  const text = messages.leads
  const when = new Intl.DateTimeFormat(locale, { dateStyle: "long", timeStyle: "short" })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="text-lg font-semibold">{lead.name}</p>
        <p className="text-muted-foreground text-sm">{when.format(new Date(lead.createdAt))}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {lead.email ? (
          <a href={`mailto:${lead.email}`} className="border-shell-border inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm">
            <MailIcon aria-hidden="true" className="size-4" />
            {lead.email}
          </a>
        ) : null}
        {lead.phone ? (
          <a
            href={`https://wa.me/${lead.phone}`}
            rel="noreferrer"
            target="_blank"
            className="border-shell-border inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm"
          >
            <PhoneIcon aria-hidden="true" className="size-4" />
            {text.whatsapp} · {lead.phone}
          </a>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="lead-status" className="text-sm font-medium">
          {text.status}
        </label>
        <LeadStatusSelect id="lead-status" value={lead.status} onChange={onStatusChange} label={text.status} disabled={busy} messages={messages} />
      </div>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">{text.answers}</h3>
        {lead.answers.length ? (
          <dl className="flex flex-col gap-3">
            {lead.answers.map((answer) => (
              <div key={answer.fieldId} className="flex flex-col gap-0.5">
                <dt className="text-muted-foreground text-xs">{answer.label}</dt>
                <dd className="text-sm whitespace-pre-line">{answer.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-muted-foreground text-sm">{text.noAnswers}</p>
        )}
      </section>

      <Button type="button" variant="outline" className="self-start" onClick={onDelete} disabled={busy}>
        <Trash2Icon aria-hidden="true" className="size-4" />
        {text.delete}
      </Button>
    </div>
  )
}
