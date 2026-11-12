// React
import type { ReactNode } from "react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { AffiliateRecordView } from "@harness-monorepo/ui/lib/affiliates"
import { AffiliateStatusBadge } from "./affiliate-status-badge"

export interface AffiliateRecordDetailsProps {
  affiliate: AffiliateRecordView
  messages?: UiMessages
}

function Line({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <dt className="text-muted-foreground w-32 shrink-0 text-sm">{term}</dt>
      <dd className="min-w-0 text-sm break-words">{children}</dd>
    </div>
  )
}

/**
 * One affiliate as the shop reads them (IMPULSEIA-104): who, where they stand, their link once they
 * accepted, the Pix key the shop pays to, the terms version they accepted, and what happened when.
 */
export function AffiliateRecordDetails({ affiliate, messages = defaultMessages }: AffiliateRecordDetailsProps) {
  const text = messages.affiliates.record

  return (
    <section aria-labelledby="affiliate-record-title" className="bg-shell-surface border-shell-border flex flex-col gap-5 rounded-xl border p-4 shadow-xs sm:p-6">
      <header className="flex flex-wrap items-center gap-3">
        <h1 id="affiliate-record-title" className="text-xl font-semibold">
          {affiliate.name}
        </h1>
        <AffiliateStatusBadge status={affiliate.status} messages={messages} />
      </header>

      <dl className="flex flex-col gap-3">
        <Line term={text.email}>{affiliate.email}</Line>
        <Line term={text.phone}>{affiliate.phone ?? <span className="text-muted-foreground">{text.none}</span>}</Line>
        <Line term={text.cpf}>{affiliate.cpf ?? <span className="text-muted-foreground">{text.none}</span>}</Line>
        <Line term={text.link}>
          {affiliate.link ? (
            <span className="font-mono text-[13px]">{affiliate.link}</span>
          ) : (
            <span className="text-muted-foreground">{text.linkPending}</span>
          )}
        </Line>
        <Line term={text.pixKey}>{affiliate.pixKey ?? <span className="text-muted-foreground">{text.none}</span>}</Line>
        {affiliate.terms ? <Line term={text.terms}>{affiliate.terms}</Line> : null}
        <Line term={text.dates}>
          <ul className="flex flex-col gap-0.5">
            {affiliate.history.map((line) => (
              <li key={line}>{line}</li>
            ))}
            {affiliate.invite ? <li className="text-muted-foreground">{affiliate.invite}</li> : null}
          </ul>
        </Line>
      </dl>
    </section>
  )
}
