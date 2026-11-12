"use client"

// React
import type { ReactNode } from "react"

// UI
import { AffiliateAreaShell } from "@harness-monorepo/ui/blocks/affiliate-area/affiliate-area-shell"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { AppLink } from "@/components/app-link"
import { startOver } from "@/lib/start-over"
import { useSignOut } from "@/services/auth/auth-hooks"

export interface AffiliateAreaFrameProps {
  user: { name: string; email: string }
  /** The panel, for an account that owns a shop too. */
  panelHref: string | null
  messages: UiMessages
  children: ReactNode
}

/** The affiliate's area around its pages (IMPULSEIA-108): the account, the way to the panel, and signing out. */
export function AffiliateAreaFrame({ user, panelHref, messages, children }: AffiliateAreaFrameProps) {
  const signOut = useSignOut()

  return (
    <AffiliateAreaShell
      user={user}
      panelHref={panelHref}
      signingOut={signOut.isPending}
      onSignOut={() => signOut.mutate(undefined, { onSuccess: () => startOver("/login") })}
      linkComponent={AppLink}
      messages={messages}
    >
      {children}
    </AffiliateAreaShell>
  )
}
