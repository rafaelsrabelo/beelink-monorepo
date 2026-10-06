"use client"

// React
import { useState } from "react"

// UI
import { IntegrationsFailed } from "@harness-monorepo/ui/blocks/integrations/integrations-failed"
import { IntegrationsSkeleton } from "@harness-monorepo/ui/blocks/integrations/integrations-skeleton"
import { MelhorEnvioCard } from "@harness-monorepo/ui/blocks/integrations/melhor-envio-card"
import { ShippingSettingsForm } from "@harness-monorepo/ui/blocks/integrations/shipping-settings-form"
import { formatCents } from "@harness-monorepo/ui/blocks/storefront/storefront-price"
import type { ShippingSettingsFormValues, ShippingSettingsIssues } from "@harness-monorepo/ui/lib/integrations"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { IntegrationFrame } from "@/components/integrations/integration-frame"
import { integrationPagesOf } from "@/lib/integration-pages"
import { melhorEnvioCardOf, shippingErrorOf, shippingFormOf, shippingPayloadOf } from "@/lib/melhor-envio-form"
import { useDisconnectMelhorEnvio, useMelhorEnvioAccount, useMelhorEnvioConnection, useMelhorEnvioSettings, useSaveMelhorEnvioSettings } from "@/services/integrations/integration-hooks"
import { IntegrationError, melhorEnvioConnectHref } from "@/services/integrations/integration-requests"

export interface MelhorEnvioScreenProps {
  slug: string
  /** What came of a connection, read from the address on the way back from Melhor Envio; null otherwise. */
  result: { tone: "done" | "failed"; message: string } | null
  locale: string
  messages: UiMessages
}

const NO_ISSUES: ShippingSettingsIssues = {}

/**
 * Melhor Envio's own page among the Integrations (BEELINK-183): the shop's account there and, once
 * connected, how it ships by carrier. The connection is the API's; the wallet and the services are
 * read from Melhor Envio as the page opens; the settings form holds what is typed until it is saved
 * again. The way back from Melhor Envio lands here.
 */
export function MelhorEnvioScreen({ slug, result, locale, messages }: MelhorEnvioScreenProps) {
  const text = messages.integrations
  const back = { href: integrationPagesOf(slug).list, label: text.title }
  const connection = useMelhorEnvioConnection(slug)
  const connected = connection.data?.status === "CONNECTED"
  const account = useMelhorEnvioAccount(slug, connected)
  const settings = useMelhorEnvioSettings(slug)
  const save = useSaveMelhorEnvioSettings(slug)
  const disconnect = useDisconnectMelhorEnvio(slug)
  const [typed, setTyped] = useState<ShippingSettingsFormValues | null>(null)
  const [issues, setIssues] = useState<ShippingSettingsIssues>(NO_ISSUES)
  const money = (cents: number) => formatCents(cents, locale, "BRL")

  // Until the card is there to title the page, a reader is still told which page this is.
  const untitled = <h1 className="sr-only">{text.melhorEnvio.title}</h1>
  if (connection.isPending) return <IntegrationFrame back={back} result={result}>{untitled}<IntegrationsSkeleton /></IntegrationFrame>
  if (connection.isError) return <IntegrationFrame back={back} result={result}>{untitled}<IntegrationsFailed onRetry={() => void connection.refetch()} messages={messages} /></IntegrationFrame>

  const services = account.data?.services ?? null
  // A shop that never chose offers every service: until their list is in hand there is nothing to save.
  const unresolved = settings.data?.serviceIds === null && !services

  function change(next: ShippingSettingsFormValues) {
    if (save.error || save.isSuccess) save.reset()
    setIssues(NO_ISSUES)
    setTyped(next)
  }

  return (
    <IntegrationFrame back={back} result={result}>
      <MelhorEnvioCard
        headingAs="h1"
        view={melhorEnvioCardOf(connection.data, account, money)}
        connectHref={melhorEnvioConnectHref(slug)}
        onDisconnect={() => disconnect.mutate(undefined, { onSuccess: () => setTyped(null) })}
        disconnecting={disconnect.isPending}
        disconnectError={disconnect.isError ? text.melhorEnvio.disconnectFailed : undefined}
        messages={messages}
      />
      {connected && settings.data ? (
        <ShippingSettingsForm
          value={typed ?? shippingFormOf(settings.data, services?.map((service) => service.id) ?? null)}
          onChange={change}
          onSubmit={() => {
            if (unresolved) return
            const value = typed ?? shippingFormOf(settings.data, services?.map((service) => service.id) ?? null)
            const read = shippingPayloadOf(value, text.shipping.issues)
            if ("issues" in read) return setIssues(read.issues)
            save.mutate(read.payload, { onSuccess: () => setTyped(null) })
          }}
          services={services ?? (account.isError ? "failed" : "loading")}
          issues={issues}
          pending={save.isPending}
          error={save.error ? shippingErrorOf(save.error instanceof IntegrationError ? save.error.errorCode : "UNKNOWN", text.shipping.errors) : undefined}
          saved={save.isSuccess}
          messages={messages}
        />
      ) : null}
    </IntegrationFrame>
  )
}
