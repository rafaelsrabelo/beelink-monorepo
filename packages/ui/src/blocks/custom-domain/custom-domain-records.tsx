// React
import { useId } from "react"

// UI
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@harness-monorepo/ui/components/table"
import { customDomainRecordsOf } from "@harness-monorepo/ui/lib/custom-domain"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { CustomDomainCopyButton } from "./custom-domain-copy-button"

export interface CustomDomainRecordsProps {
  /** The server's addresses: what the domain's `A` record points at. */
  targetIps: readonly string[]
  messages?: UiMessages
}

const NOTES = ["time", "forwarding", "single", "root", "cname"] as const

/**
 * What a shopkeeper creates at the provider their domain was bought from (BEELINK-285): the records,
 * each value with a button that copies it, and what is good to know before saving them there.
 *
 * Under the card whether a domain is saved or not: the records can be created first, and then the
 * first save already finds the domain right.
 */
export function CustomDomainRecords({ targetIps, messages = defaultMessages }: CustomDomainRecordsProps) {
  const text = messages.customDomain.records
  const id = useId()

  return (
    <section aria-labelledby={`${id}-title`} className="bg-shell-surface border-shell-border flex flex-col gap-4 rounded-xl border p-4 shadow-xs sm:p-6">
      <h2 id={`${id}-title`} className="font-semibold">
        {text.title}
      </h2>
      <p className="text-sm">{text.intro}</p>

      <Table aria-label={text.caption}>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">{text.columns.type}</TableHead>
            <TableHead scope="col">{text.columns.name}</TableHead>
            <TableHead scope="col">{text.columns.value}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customDomainRecordsOf(targetIps).map((record, at) => (
            <TableRow key={`${record.type} ${record.value}`}>
              <TableCell className="font-medium">{record.type}</TableCell>
              <TableCell className="font-mono">{record.name}</TableCell>
              <TableCell>
                <div className="flex items-center justify-between gap-3">
                  <span id={`${id}-value-${at}`} className="font-mono">
                    {record.value}
                  </span>
                  <CustomDomainCopyButton value={record.value} label={text.copy} doneLabel={text.copied} selectedLabel={text.selected} targetId={`${id}-value-${at}`} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="bg-muted flex flex-col gap-2 rounded-lg px-3 py-3">
        <h3 className="text-sm font-medium">{text.notesTitle}</h3>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm">
          {NOTES.map((note) => (
            <li key={note}>{text.notes[note]}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}
