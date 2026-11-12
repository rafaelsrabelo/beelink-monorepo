// React
import type { ReactNode } from "react"

// Libs
import { UserPlusIcon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface AffiliateListSectionProps {
  onInvite: () => void
  /** The filter and the rows under it. */
  children: ReactNode
  messages?: UiMessages
}

/** The shop's affiliates (IMPULSEIA-104): the heading, the way to invite, and whatever list is under it. */
export function AffiliateListSection({ onInvite, children, messages = defaultMessages }: AffiliateListSectionProps) {
  const text = messages.affiliates.list

  return (
    <section aria-labelledby="affiliate-list-title" className="bg-shell-surface border-shell-border flex flex-col gap-4 rounded-xl border p-4 shadow-xs sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="affiliate-list-title" className="font-semibold">
            {text.title}
          </h2>
          <p className="text-muted-foreground text-sm">{text.intro}</p>
        </div>
        <Button type="button" onClick={onInvite}>
          <UserPlusIcon />
          {text.invite}
        </Button>
      </header>
      {children}
    </section>
  )
}
