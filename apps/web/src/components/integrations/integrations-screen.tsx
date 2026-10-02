"use client"

// React
import { useState, type ReactNode } from "react"

// UI
import { IntegrationsFailed } from "@harness-monorepo/ui/blocks/integrations/integrations-failed"
import { IntegrationsResult } from "@harness-monorepo/ui/blocks/integrations/integrations-result"
import { IntegrationsSkeleton } from "@harness-monorepo/ui/blocks/integrations/integrations-skeleton"
import { MelhorEnvioCard } from "@harness-monorepo/ui/blocks/integrations/melhor-envio-card"
import { ShippingSettingsForm } from "@harness-monorepo/ui/blocks/integrations/shipping-settings-form"
import { formatCents } from "@harness-monorepo/ui/blocks/storefront/storefront-price"
import type { ShippingSettingsFormValues, ShippingSettingsIssues } from "@harness-monorepo/ui/lib/integrations"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { melhorEnvioCardOf, shippingErrorOf, shippingFormOf, shippingPayloadOf } from "@/lib/melhor-envio-form"
import { useDisconnectMelhorEnvio, useMelhorEnvioAccount, useMelhorEnvioConnection, useMelhorEnvioSettings, useSaveMelhorEnvioSettings } from "@/services/integrations/integration-hooks"
import { IntegrationError, melhorEnvioConnectHref } from "@/services/integrations/integration-requests"

export interface IntegrationsScreenProps {
  slug: string
  /** What came of a connection, read from the address on the way back from Melhor Envio; null otherwise. */
  result: { tone: "done" | "failed"; message: string } | null
  locale: string
  messages: UiMessages
}

const NO_ISSUES: ShippingSettingsIssues = {}

/**
 * The panel's Integrations (BEELINK-183): the shop's Melhor Envio account and, once connected, how it
 * ships by carrier. The connection is the API's; the wallet and the services are read from Melhor
 * Envio as the page opens; the settings form holds what is typed until it is saved again.
 */
export function IntegrationsScreen({ slug, result, locale, messages }: IntegrationsScreenProps) {
  const text = messages.integrations
  const connection = useMelhorEnvioConnection(slug)
  const connected = connection.data?.status === "CONNECTED"
  const account = useMelhorEnvioAccount(slug, connected)
  const settings = useMelhorEnvioSettings(slug)
  const save = useSaveMelhorEnvioSettings(slug)
  const disconnect = useDisconnectMelhorEnvio(slug)
  const [typed, setTyped] = useState<ShippingSettingsFormValues | null>(null)
  const [issues, setIssues] = useState<ShippingSettingsIssues>(NO_ISSUES)
  const money = (cents: number) => formatCents(cents, locale, "BRL")

  if (connection.isPending) return <Frame text={text} result={result}><IntegrationsSkeleton /></Frame>
  if (connection.isError) return <Frame text={text} result={result}><IntegrationsFailed onRetry={() => void connection.refetch()} messages={messages} /></Frame>

  const services = account.data?.services ?? null
  // A shop that never chose offers every service: until their list is in hand there is nothing to save.
  const unresolved = settings.data?.serviceIds === null && !services

  function change(next: ShippingSettingsFormValues) {
    if (save.error || save.isSuccess) save.reset()
    setIssues(NO_ISSUES)
    setTyped(next)
  }

  return (
    <Frame text={text} result={result}>
      <MelhorEnvioCard
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
    </Frame>
  )
}

function Frame({ text, result, children }: { text: UiMessages["integrations"]; result: IntegrationsScreenProps["result"]; children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 lg:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{text.title}</h1>
        <p className="text-muted-foreground text-sm">{text.intro}</p>
      </header>
      {result ? <IntegrationsResult tone={result.tone} message={result.message} /> : null}
      {children}
    </div>
  )
}
