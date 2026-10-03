// Libs
import { PlugIcon } from "lucide-react"

// UI
import { Badge } from "@harness-monorepo/ui/components/badge"
import { buttonVariants } from "@harness-monorepo/ui/components/button"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import type { IntegrationRowView } from "@harness-monorepo/ui/lib/integrations"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { PROVIDER_ICONS, providerTextOf } from "./integration-providers"

export interface IntegrationListProps {
  /** The rows, or `loading` while the connections are read: their place held as grey shapes. */
  rows: readonly IntegrationRowView[] | "loading"
  /** The page that adds one: where an empty list leads. */
  newHref: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * The shop's integrations, one row each: what it is, where it stands, whose account, and the way to its
 * own page. Only what the shop connected — what it could connect is the new integration's page.
 */
export function IntegrationList({ rows, newHref, linkComponent: Link = AnchorLink, messages = defaultMessages }: IntegrationListProps) {
  const text = messages.integrations.list

  if (rows === "loading") {
    return (
      <div aria-hidden="true" className="bg-shell-surface border-shell-border flex items-center gap-3 rounded-xl border p-4 shadow-xs sm:p-5">
        <Skeleton className="size-10 rounded-lg" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="bg-shell-surface border-shell-border flex flex-col items-center gap-3 rounded-xl border px-4 py-12 text-center shadow-xs">
        <span className="bg-muted flex size-10 items-center justify-center rounded-lg">
          <PlugIcon aria-hidden="true" className="size-5" />
        </span>
        <p className="font-medium">{text.empty}</p>
        <p className="text-muted-foreground max-w-md text-sm">{text.emptyHint}</p>
        <Link href={newHref} className={buttonVariants()}>
          {messages.integrations.newIntegration}
        </Link>
      </div>
    )
  }

  return (
    <ul className="bg-shell-surface border-shell-border divide-shell-border divide-y rounded-xl border shadow-xs">
      {rows.map((row) => {
        const provider = providerTextOf(messages, row.provider)
        const Icon = PROVIDER_ICONS[row.provider]
        return (
          <li key={row.provider} className="flex flex-wrap items-center gap-3 p-4 sm:p-5">
            <span className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg">
              <Icon aria-hidden="true" className="size-5" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{provider.title}</p>
                <Badge variant={row.status === "CONNECTED" ? "default" : "destructive"}>{row.status === "CONNECTED" ? provider.connected : provider.needsReconnectBadge}</Badge>
                {row.sandbox ? (
                  <Badge variant="secondary" title={provider.sandboxHint}>
                    {provider.sandbox}
                  </Badge>
                ) : null}
              </div>
              {row.account ? <p className="text-muted-foreground truncate text-sm">{format(text.account, { name: row.account })}</p> : null}
            </div>
            <Link href={row.href} aria-label={format(text.openLabel, { name: provider.title })} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              {text.open}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
