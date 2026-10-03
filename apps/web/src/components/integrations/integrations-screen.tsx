"use client"

// UI
import { IntegrationList } from "@harness-monorepo/ui/blocks/integrations/integration-list"
import { IntegrationsFailed } from "@harness-monorepo/ui/blocks/integrations/integrations-failed"
import { buttonVariants } from "@harness-monorepo/ui/components/button"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { AppLink } from "@/components/app-link"
import { integrationPagesOf, integrationRowsOf } from "@/lib/integration-pages"
import { useMelhorEnvioConnection } from "@/services/integrations/integration-hooks"

export interface IntegrationsScreenProps {
  slug: string
  messages: UiMessages
}

/**
 * The shop's integrations, as a list: what it connected, each leading to its own page. Adding one is
 * a page of its own, `integrations/new`, as making anything else in the panel is.
 */
export function IntegrationsScreen({ slug, messages }: IntegrationsScreenProps) {
  const text = messages.integrations
  const pages = integrationPagesOf(slug)
  const connection = useMelhorEnvioConnection(slug)

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 lg:px-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        {/* A basis of its own: sized by its sentence, the intro takes the whole row and pushes the button under it. */}
        <div className="flex min-w-0 flex-1 basis-72 flex-col gap-1">
          <h1 className="text-2xl font-semibold">{text.title}</h1>
          <p className="text-muted-foreground text-sm">{text.intro}</p>
        </div>
        <AppLink href={pages.new} className={buttonVariants()}>
          {text.newIntegration}
        </AppLink>
      </header>

      {connection.isError ? (
        <IntegrationsFailed onRetry={() => void connection.refetch()} messages={messages} />
      ) : (
        <IntegrationList rows={connection.data ? integrationRowsOf(connection.data, pages) : "loading"} newHref={pages.new} linkComponent={AppLink} messages={messages} />
      )}
    </div>
  )
}
