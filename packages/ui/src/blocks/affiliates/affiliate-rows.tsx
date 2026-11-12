// Libs
import { ChevronRightIcon } from "lucide-react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { AffiliateListItemView } from "@harness-monorepo/ui/lib/affiliates"
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { AffiliateStatusBadge } from "./affiliate-status-badge"

export interface AffiliateRowsProps {
  affiliates: readonly AffiliateListItemView[]
  /** Where one affiliate's record is. */
  hrefOf: (affiliateId: string) => string
  /** A standing is chosen: an empty list says so, rather than inviting to invite. */
  filtered?: boolean
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/** One row per affiliate (IMPULSEIA-104): who, where they stand, on which table, since when. */
export function AffiliateRows({ affiliates, hrefOf, filtered = false, linkComponent: Link = AnchorLink, messages = defaultMessages }: AffiliateRowsProps) {
  const text = messages.affiliates.list

  if (affiliates.length === 0) {
    return filtered ? (
      <p className="text-muted-foreground py-6 text-center text-sm">{text.emptyFiltered}</p>
    ) : (
      <div className="flex flex-col items-center gap-1 py-8 text-center">
        <p className="font-medium">{text.empty}</p>
        <p className="text-muted-foreground max-w-sm text-sm">{text.emptyHint}</p>
      </div>
    )
  }

  return (
    <ul className="divide-y">
      {affiliates.map((affiliate) => (
        <li key={affiliate.id} className="relative flex flex-wrap items-center gap-x-4 gap-y-1 py-3 pr-8">
          <div className="flex min-w-0 flex-1 basis-56 flex-col gap-0.5">
            {/* The name is the link, stretched over the row: one stop for a keyboard, the whole row for a finger. */}
            <Link href={hrefOf(affiliate.id)} className="truncate font-medium after:absolute after:inset-0 after:content-[''] hover:underline">
              {affiliate.name}
            </Link>
            <span className="text-muted-foreground truncate text-sm">{affiliate.email}</span>
          </div>
          <AffiliateStatusBadge status={affiliate.status} messages={messages} />
          <span className="text-muted-foreground w-32 truncate text-sm">
            <span className="sr-only">{text.table}: </span>
            {affiliate.tableName}
          </span>
          <span className="text-muted-foreground w-40 text-sm">{affiliate.since}</span>
          <ChevronRightIcon aria-hidden="true" className="text-muted-foreground absolute right-0 size-4" />
        </li>
      ))}
    </ul>
  )
}
