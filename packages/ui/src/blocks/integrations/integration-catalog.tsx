// UI
import { Badge } from "@harness-monorepo/ui/components/badge"
import { buttonVariants } from "@harness-monorepo/ui/components/button"
import type { IntegrationOptionView } from "@harness-monorepo/ui/lib/integrations"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { PROVIDER_ICONS, providerTextOf } from "./integration-providers"

export interface IntegrationCatalogProps {
  options: readonly IntegrationOptionView[]
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * The third parties a shop can connect, a card each: what it gives, and the way in. One already
 * connected leads to its own page instead of connecting twice.
 *
 * "Conectar" is a plain anchor, never the app's link: a router link prefetches its address, and this
 * one begins an authorization at the third party the moment it is fetched.
 */
export function IntegrationCatalog({ options, linkComponent: Link = AnchorLink, messages = defaultMessages }: IntegrationCatalogProps) {
  const text = messages.integrations.catalog

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {options.map((option) => {
        const provider = providerTextOf(messages, option.provider)
        const Icon = PROVIDER_ICONS[option.provider]
        return (
          <li key={option.provider} className="bg-shell-surface border-shell-border flex flex-col gap-4 rounded-xl border p-4 shadow-xs sm:p-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="bg-muted flex size-10 items-center justify-center rounded-lg">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <h2 className="font-semibold">{provider.title}</h2>
              {option.state === "connected" ? <Badge>{text.connected}</Badge> : null}
            </div>
            <p className="text-muted-foreground text-sm">{provider.lead}</p>
            <div className="mt-auto">
              {option.state === "unavailable" ? (
                <p className="bg-muted rounded-lg px-3 py-2 text-sm">{provider.unavailable}</p>
              ) : option.state === "available" ? (
                <a href={option.connectHref} className={cn(buttonVariants(), "self-start")}>
                  {provider.connect}
                </a>
              ) : (
                // Through `cn`, as `Button` does: raw, the base's transparent border outranks the outline's.
                <Link href={option.href} aria-label={format(text.openLabel, { name: provider.title })} className={cn(buttonVariants({ variant: "outline" }))}>
                  {text.open}
                </Link>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
