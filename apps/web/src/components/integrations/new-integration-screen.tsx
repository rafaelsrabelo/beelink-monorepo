"use client"

// Libs
import { ArrowLeftIcon } from "lucide-react"

// UI
import { IntegrationCatalog } from "@harness-monorepo/ui/blocks/integrations/integration-catalog"
import { IntegrationsFailed } from "@harness-monorepo/ui/blocks/integrations/integrations-failed"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { AppLink } from "@/components/app-link"
import { integrationOptionsOf, integrationPagesOf } from "@/lib/integration-pages"
import { useAsaasConnection } from "@/services/integrations/asaas-hooks"
import { useMelhorEnvioConnection } from "@/services/integrations/integration-hooks"
import { melhorEnvioConnectHref } from "@/services/integrations/integration-requests"

export interface NewIntegrationScreenProps {
  slug: string
  messages: UiMessages
}

/**
 * Adding an integration: what there is to connect, a card each. Connected, each is set up on its own
 * page. A provider whose connection could not be read is left out and said so, beside the others.
 */
export function NewIntegrationScreen({ slug, messages }: NewIntegrationScreenProps) {
  const text = messages.integrations
  const pages = integrationPagesOf(slug)
  const melhorEnvio = useMelhorEnvioConnection(slug)
  const asaas = useAsaasConnection(slug)
  const failed = [melhorEnvio, asaas].filter((connection) => connection.isError)
  const reading = melhorEnvio.isPending || asaas.isPending
  const options = integrationOptionsOf({ melhorEnvio: melhorEnvio.data, asaas: asaas.data }, pages, melhorEnvioConnectHref(slug))

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 lg:px-6">
      <header className="flex flex-col gap-2">
        <AppLink
          href={pages.list}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex w-fit items-center gap-1 rounded-sm text-sm outline-none focus-visible:ring-2"
        >
          <ArrowLeftIcon aria-hidden="true" className="size-4" />
          {text.title}
        </AppLink>
        <h1 className="text-2xl font-semibold">{text.newIntegration}</h1>
        <p className="text-muted-foreground text-sm">{text.catalog.intro}</p>
      </header>

      {reading ? (
        <div aria-hidden="true" className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      ) : options.length > 0 ? (
        <IntegrationCatalog options={options} linkComponent={AppLink} messages={messages} />
      ) : null}
      {failed.length > 0 ? (
        <IntegrationsFailed onRetry={() => failed.forEach((connection) => void connection.refetch())} message={failed.length === 1 ? text.failedSome : undefined} messages={messages} />
      ) : null}
    </div>
  )
}
