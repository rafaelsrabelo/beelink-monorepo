// React
import type { ReactNode } from "react"

// Libs
import { ArrowLeftIcon } from "lucide-react"

// UI
import { IntegrationsResult } from "@harness-monorepo/ui/blocks/integrations/integrations-result"

// App
import { AppLink } from "@/components/app-link"

export interface IntegrationFrameProps {
  /** The Integrations list, and what the way back to it is called. */
  back: { href: string; label: string }
  /** What came of a connection, said over the page; null when there is nothing to say. */
  result: { tone: "done" | "failed"; message: string } | null
  children: ReactNode
}

/** An integration's own page: the way back to the list over it, and its card, under that, as its title. */
export function IntegrationFrame({ back, result, children }: IntegrationFrameProps) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 lg:px-6">
      <AppLink
        href={back.href}
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex w-fit items-center gap-1 rounded-sm text-sm outline-none focus-visible:ring-2"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        {back.label}
      </AppLink>
      {result ? <IntegrationsResult tone={result.tone} message={result.message} /> : null}
      {children}
    </div>
  )
}
