"use client"

// UI
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@harness-monorepo/ui/components/table"

// Locales
import { defaultLocale, defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { LeadStatusSelect } from "./lead-status-select"
import type { LeadStatus } from "./lead-types"

export interface LeadTableItem {
  id: string
  name: string
  email: string | null
  /** Digits, as stored. Drawn as they are: a mask would have to guess the country. */
  phone: string | null
  status: LeadStatus
  /** ISO-8601. */
  createdAt: string
}

export interface LeadTableProps {
  leads: readonly LeadTableItem[]
  onOpen: (leadId: string) => void
  onStatusChange: (leadId: string, status: LeadStatus) => void
  /** A filter is on, so an empty list means "none with this status", not "none yet". */
  filtered?: boolean
  busyId?: string | null
  locale?: string
  messages?: UiMessages
}

/**
 * What arrived through the site's form, newest first.
 *
 * The name is the button that opens a lead, not the whole row: the status select lives in the row
 * too, and a row that is itself a button would swallow every click meant for it.
 */
export function LeadTable({
  leads,
  onOpen,
  onStatusChange,
  filtered = false,
  busyId = null,
  locale = defaultLocale,
  messages = defaultMessages,
}: LeadTableProps) {
  const text = messages.leads
  const when = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })

  if (!leads.length) {
    return (
      <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed py-12 text-center">
        <p className="font-medium">{filtered ? text.emptyFiltered : text.empty}</p>
        {filtered ? null : <p className="text-muted-foreground text-sm">{text.emptyHint}</p>}
      </div>
    )
  }

  return (
    <div className="bg-shell-surface border-shell-border rounded-xl border shadow-xs">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead>{text.name}</TableHead>
            <TableHead>{text.contact}</TableHead>
            <TableHead className="w-40">{text.received}</TableHead>
            <TableHead className="w-44">{text.status}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow key={lead.id} className={lead.status === "NEW" ? "font-medium" : undefined}>
              <TableCell>
                <button
                  type="button"
                  aria-label={format(text.open, { name: lead.name })}
                  onClick={() => onOpen(lead.id)}
                  className="hover:text-primary cursor-pointer text-left underline-offset-4 hover:underline"
                >
                  {lead.name}
                </button>
              </TableCell>
              <TableCell className="text-muted-foreground">
                <div className="flex flex-col">
                  {lead.email ? <span>{lead.email}</span> : null}
                  {lead.phone ? <span>{lead.phone}</span> : null}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground tabular-nums">{when.format(new Date(lead.createdAt))}</TableCell>
              <TableCell>
                <LeadStatusSelect
                  value={lead.status}
                  onChange={(status) => onStatusChange(lead.id, status)}
                  label={format(text.statusOf, { name: lead.name })}
                  disabled={busyId === lead.id}
                  messages={messages}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
