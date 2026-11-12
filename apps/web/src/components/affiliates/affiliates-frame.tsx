// React
import type { ReactNode } from "react"

// UI
import { AffiliatesTabs } from "@harness-monorepo/ui/blocks/affiliates/affiliates-tabs"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { AppLink } from "@/components/app-link"

export interface AffiliatesFrameProps {
  slug: string
  active: "settings" | "tables"
  messages: UiMessages
  children: ReactNode
}

/** The affiliate screens' heading and sections (IMPULSEIA-102), around whichever one is open. */
export function AffiliatesFrame({ slug, active, messages, children }: AffiliatesFrameProps) {
  const text = messages.affiliates

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 lg:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{text.title}</h1>
        <p className="text-muted-foreground text-sm">{text.intro}</p>
      </header>
      <AffiliatesTabs
        active={active}
        settingsHref={`/admin/${slug}/affiliates/settings`}
        tablesHref={`/admin/${slug}/affiliates/tables`}
        linkComponent={AppLink}
        messages={messages}
      />
      {children}
    </div>
  )
}
