"use client"

// UI
import { IntegrationCards } from "@harness-monorepo/ui/blocks/integrations/integration-cards"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { AppLink } from "@/components/app-link"
import { UPCOMING_INTEGRATIONS, connectionReadOf, integrationCardsOf, integrationPagesOf } from "@/lib/integration-pages"
import { useAsaasConnection } from "@/services/integrations/asaas-hooks"
import { useMelhorEnvioConnection } from "@/services/integrations/integration-hooks"
import { melhorEnvioConnectHref } from "@/services/integrations/integration-requests"
import { useMetaPixelConnection } from "@/services/integrations/meta-pixel-hooks"

export interface IntegrationsScreenProps {
  slug: string
  messages: UiMessages
}

/**
 * The panel's Integrations, on one page: every third party a shop can connect, a card each, whether
 * it connected it or not — where it stands, whose account, and the way to connect it or set it up.
 *
 * Each connection is read on its own, and its card alone waits for it or says its read failed: one
 * never hides another, and a read that is missing is never drawn as a shop that connected nothing.
 * After them, what is on its way: announced, read from nowhere, with nothing to press.
 */
export function IntegrationsScreen({ slug, messages }: IntegrationsScreenProps) {
  const text = messages.integrations
  const melhorEnvio = useMelhorEnvioConnection(slug)
  const asaas = useAsaasConnection(slug)
  const metaPixel = useMetaPixelConnection(slug)
  const cards = integrationCardsOf({ melhorEnvio: connectionReadOf(melhorEnvio), asaas: connectionReadOf(asaas), metaPixel: connectionReadOf(metaPixel) }, integrationPagesOf(slug), melhorEnvioConnectHref(slug))

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 lg:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{text.title}</h1>
        <p className="text-muted-foreground text-sm">{text.intro}</p>
      </header>

      <IntegrationCards cards={cards} onRetry={(provider) => void { MELHOR_ENVIO: melhorEnvio, ASAAS: asaas, META_PIXEL: metaPixel }[provider].refetch()} upcoming={UPCOMING_INTEGRATIONS} linkComponent={AppLink} messages={messages} />
    </div>
  )
}
