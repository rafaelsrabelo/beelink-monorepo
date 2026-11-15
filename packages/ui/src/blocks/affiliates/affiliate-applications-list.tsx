// Libs
import { CheckIcon } from "lucide-react"

// UI
import { Badge } from "@harness-monorepo/ui/components/badge"
import { Button } from "@harness-monorepo/ui/components/button"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AFFILIATE_APPLICATION_STATUS_VALUES, type AffiliateApplicationStatusValue, type AffiliateApplicationView } from "@harness-monorepo/ui/lib/affiliate-page"
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface AffiliateApplicationsListProps {
  /** Which applications are shown: the choice lives in the screen's address. */
  status: AffiliateApplicationStatusValue
  filterHrefs: Record<AffiliateApplicationStatusValue, string>
  /** Applications waiting, whatever the filter. */
  pendingCount: number
  applications: readonly AffiliateApplicationView[]
  onApprove: (application: AffiliateApplicationView) => void
  onRefuse: (application: AffiliateApplicationView) => void
  /** An application being decided now: its buttons wait. */
  busyId?: string | null
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * The applications the shop's page took (plan 2026-11-14): new, approved or refused, each with whom
 * it is from, the extra answer when there is one and when it arrived — and, while new, the two ways
 * to decide it; once decided, what became of it.
 */
export function AffiliateApplicationsList({ status, filterHrefs, pendingCount, applications, onApprove, onRefuse, busyId = null, linkComponent: Link = AnchorLink, messages = defaultMessages }: AffiliateApplicationsListProps) {
  const text = messages.affiliateApplications

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label={text.filters.label} className="flex flex-wrap gap-2">
        {AFFILIATE_APPLICATION_STATUS_VALUES.map((value) => (
          <Link
            key={value}
            href={filterHrefs[value]}
            aria-current={status === value ? "page" : undefined}
            className={cn("rounded-full px-3 py-1.5 text-sm font-medium", status === value ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-muted/70")}
          >
            {text.filters[value]}
            {value === "PENDING" && pendingCount > 0 ? ` (${pendingCount})` : null}
          </Link>
        ))}
      </nav>

      {applications.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">{text.empty[status]}</p>
      ) : (
        <ul className="bg-shell-surface border-shell-border divide-y rounded-xl border shadow-xs">
          {applications.map((application) => (
            <li key={application.id} className="flex flex-wrap items-start justify-between gap-4 p-4">
              <div className="flex min-w-0 flex-[1_1_16rem] flex-col gap-1">
                <p className="font-medium break-words">{application.name}</p>
                <p className="text-muted-foreground text-sm break-words">
                  {application.email} · {application.phone}
                </p>
                {application.extra ? (
                  <p className="text-sm break-words">
                    <span className="text-muted-foreground">{application.extra.question}: </span>
                    {application.extra.answer}
                  </p>
                ) : null}
                <p className="text-muted-foreground text-xs">{format(text.received, { date: application.received })}</p>
              </div>
              {application.status === "PENDING" ? (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" disabled={busyId === application.id} onClick={() => onRefuse(application)}>
                    {text.refuse}
                  </Button>
                  <Button type="button" disabled={busyId === application.id} onClick={() => onApprove(application)}>
                    {text.approve}
                  </Button>
                </div>
              ) : (
                <Badge variant={application.status === "APPROVED" ? "secondary" : "outline"}>
                  {application.status === "APPROVED" ? <CheckIcon aria-hidden="true" /> : null}
                  {application.outcome ?? text.refused}
                </Badge>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="text-muted-foreground text-sm">{text.retention}</p>
    </div>
  )
}
